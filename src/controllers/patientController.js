import { patientService } from "../services/patientService.js";

export const patientController = {
  async createPatient(req, res) {
    try {
      const { name, age, gender, contacts } = req.body || {};
      if (!name?.first || !name?.last || typeof age !== "number" || !gender) {
        return res.status(400).json({
          code: "BAD_REQUEST", 
          message: "Missing required fields"
        });
      }

      const patient = await patientService.registerPatient({ 
        name, 
        age, 
        gender, 
        contacts 
      });

      res.status(201).json({
        success: true,
        data: patient
      });
    } catch (error) {
      if (error && error.code === "MRN_NOT_UNIQUE") {
        return res.status(409).json({
          code: error.code, 
          message: error.message 
        });
      }
      res.status(400).json({
        code: "BAD_REQUEST", 
        message: error?.message || "Bad request" 
      });
    }
  },

  async getPatientById(req, res) {
    try{
      const id = req.params.id;
      const patient = await patientService.getPatientById(id);

      return res.status(200).json({
        success: true,
        data: patient
      });
    } catch (error) {
      if (error.code === "NOT_FOUND") {
        return res.status(404).json({
          success: false,
          message: "Patient not found"
        });
      }

      console.error("Error retrieving patient:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  async getPatientsList(req, res) {
    try{
      const page = Math.max(parseInt(String(req.query.page ?? "1"), 10), 1);
      const pageSize = Math.min(Math.max(parseInt(String(req.query.pageSize ?? "25"), 10), 1), 100);
      const name = typeof req.query.name === "string" ? req.query.name.trim() : undefined;
      const mrn = typeof req.query.mrn === "string" ? req.query.mrn.trim() : undefined;
      const includeDeleted = String(req.query.includeDeleted ?? "false") === "true";

      const sortParam = (req.query.sort) || "createdAt:desc";
      const [sortFieldRaw, sortDirRaw] = String(sortParam).split(":");
      const allowedSort = new Set(["createdAt", "name", "mrn"]);
      const sortField = allowedSort.has(sortFieldRaw) ? sortFieldRaw : "createdAt";
      const sortDir = sortDirRaw === "asc" ? "asc" : "desc";

      const { items, total } = await patientService.getPatientsList({ page, pageSize, name, mrn, includeDeleted, sortField, sortDir });

      const base = "/v1/patients";
      const q = new URLSearchParams({
        ...(name ? { name } : {}),
        ...(mrn ? { mrn } : {}),
        ...(includeDeleted ? { includeDeleted: "true" } : {}),
        sort: `${sortField}:${sortDir}`,
        pageSize: String(pageSize),
      });
      const lastPage = Math.max(Math.ceil(total / pageSize), 1);
      const links = [];
      q.set("page", "1");
      links.push(`<${base}?${q.toString()}>; rel="first"`);
      if (page > 1) {
        q.set("page", String(page - 1));
        links.push(`<${base}?${q.toString()}>; rel="prev"`);
      }
      if (page < lastPage) {
        q.set("page", String(page + 1));
        links.push(`<${base}?${q.toString()}>; rel="next"`);
      }
      q.set("page", String(lastPage));
      links.push(`<${base}?${q.toString()}>; rel="last"`);

      res.set("X-Total-Count", String(total)).set("Link", links.join(", ")).status(200).json({
        page,
        pageSize,
        total,
        sort: { field: sortField, direction: sortDir },
        filters: { ...(name && { name }), ...(mrn && { mrn }), ...(includeDeleted && { includeDeleted }) },
        items
      });
    } catch (error) {
      console.error("GET /patients failed:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  async updatePatient(req, res) {
    try {
      const id = req.params.id;

      const allowed = ["name", "age", "gender", "contacts"];
      const patch = {};
      for (const k of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body || {}, k)) {
          patch[k] = req.body[k];
        }
      }

      const updated = await patientService.updatePatient(id, patch);

      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (error) {
      if (error && error.code === "NOT_FOUND") {
        return res.status(404).json({
          code: error.code,
          message: error.message });
      }
      
      console.error("PATCH /patients/:id failed:", error);
      res.status(400).json({ 
        code: "BAD_REQUEST", 
        message: error?.message || "Bad request" 
      });
    }
  },

  async setPatientDiagnosis(req, res) {
    try {
      const { admittingDiagnosis } = req.body || {};
      if (!admittingDiagnosis) {
        return res.status(400).json({
          code: "BAD_REQUEST",
          message: "Missing admittingDiagnosis"
        });
      }

      const p = await patientService.setDiagnosis(req.params.id, admittingDiagnosis);

      res.status(200).json({
        success: true,
        data: p
      });
    } catch (error) {
      if (error.code === "BAD_REQUEST") {
        return res.status(400).json({
          success: false,
          code: "BAD_REQUEST",
          message: error.message
        });
      }

      if (error && error.code === "NOT_FOUND") {
        return res.status(404).json({
          code: error.code,
          message: error.message
        });
      }

      console.error("PUT /patients/:id/diagnosis failed:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  },

  async deletePatient(req, res) {
    try {
      const id = req.params.id;
      
      await patientService.deletePatient(id);

      return res.status(204).send();
    } catch (error) {
      if (error.code === "NOT_FOUND") {
        return res.status(404).json({
          success: false,
          code: "NOT_FOUND",
          message: "Patient not found"
        });
      }

      if (error.code === "FORBIDDEN_DELETE") {
        return res.status(409).json({
          success: false,
          code: "FORBIDDEN_DELETE",
          message: "Cannot delete a patient after admitting diagnosis has been set"
        });
      }

      console.error("DELETE /patients/:id failed:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
};
