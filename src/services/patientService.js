import { patientRepo } from "../repositories/patientRepo.js";

function assignByDiagnosis(d) {
  if (d === "breast" || d === "lung") return { physician: "SUSAN_JONES", dept: "J" };
  return { physician: "BEN_SMITH", dept: "S" };
}

const ALLOWED = new Set(["breast", "lung", "prostate", "unspecified", null]);

export const patientService = {
  // POST /v1/patients - Register new patient
  async registerPatient(input) {
    const created = await patientRepo.register({
      medicalRecordNumber: input.medicalRecordNumber,
      name: input.name,
      age: input.age,
      gender: input.gender,
      contacts: input.contacts ?? [],
      admittingDiagnosis: null,
      attendingPhysician: null,
      department: null
    });

    return created;
  },

  // GET /v1/patients/:id - Fetch patient by ID
  async getPatientById(id) { 
    const patient = await patientRepo.getById(id);
    
    if (!patient) {
      const error = new Error("Patient not found");
      error.code = "NOT_FOUND";
      throw error
    }

    return patient;
  },

  // GET /v1/patients - List/search by medical record number or name, 
  async getPatientsList(otps) {
    return patientRepo.getList(otps);
  },

  // PATCH /v1/patients/:id - Update demographics/contacts (no direct write to attendingPhysician / department)
  async updatePatient(id, patch) {
    return patientRepo.update(id, patch);
  },

  // PUT /v1/patients/:id/diagnosis
  async setDiagnosis(id, admittingDiagnosis) {
    if (!ALLOWED.has(admittingDiagnosis)) {
      const error = new Error("Invalid admittingDiagnosis");
      error.code = "BAD_REQUEST";
      throw error;
    }

    return patientRepo.setDiagnosis(id, admittingDiagnosis);
  },

  // DELETE /v1/patients/:id
  async deletePatient(id) {
    return patientRepo.delete(id);
  }
};