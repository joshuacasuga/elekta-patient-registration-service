import { sql } from "../config/db.js";

const rowToPatient = (r) => ({
    id: r.id,
    medicalRecordNumber: r.medical_record_number,
    name: { first: r.name_first, middle: r.name_middle ?? undefined, last: r.name_last },
    age: r.age,
    gender: r.gender,
    contacts: r.contacts ?? [],
    admittingDiagnosis: r.admitting_diagnosis ?? null,
    attendingPhysician: r.attending_physician ?? null,
    department: r.department ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    version: r.version,
    isDeleted: r.is_deleted
});

const sortFieldSql = (f) => {
    switch (f) {
        case "name": return `lower(name_last), lower(name_first), id`;
        case "mrn": return `medical_record_number, id`;
        case "createdAt":
        default: return `created_at, id`;
    }
};

const sortDirSql = (d) => (d === "asc" ? "asc" : "desc");

const assignByDiagnosis = (d) =>
    (d === "breast" || d === "lung")
        ? { physician: "SUSAN_JONES", dept: "J" }
        : { physician: "BEN_SMITH", dept: "S" };

export const patientRepo = {
    async register(data) {
        try {
            const [row] = await sql`
                INSERT INTO patients (
                    medical_record_number,
                    name_first,
                    name_last,
                    name_middle,
                    age,
                    gender,
                    contacts,
                    admitting_diagnosis,
                    attending_physician,
                    department
                )
                VALUES (
                    ${data.medicalRecordNumber},
                    ${data.name.first},
                    ${data.name.last},
                    ${data.name.middle ?? null},
                    ${data.age},
                    ${data.gender},
                    ${sql.json(data.contacts ?? [])},
                    ${data.admittingDiagnosis ?? null},
                    ${data.attendingPhysician ?? null},
                    ${data.department ?? null}
                )
                returning *
            `;
            return rowToPatient(row);
        } catch (error) {
            if (e.code === "23505") {
                const err = new Error("MRN already exists");
                error.code = "MRN_NOT_UNIQUE";
                throw err
            }
            throw error;
        }
    },

    async getById(id) {
        try {
            const [row] = await sql`
                SELECT * FROM patients
                WHERE id = ${id} AND is_deleted = false
                limit 1;
            `;
            return row ? rowToPatient(row) : null;
        } catch (error) {
            console.error("Error fetching patient by ID:", error);
            throw error;
        }
    },

    async getList({ page, pageSize, name, mrn, includeDeleted = false, sortField = "createdAt", sortDir = "desc" }) {
        const where = [];
        const params = [];
        let i = 1;

        if (!includeDeleted) where.push(`is_deleted = false`);
        if (mrn) { where.push(`medical_record_number = $${i++}`); params.push(mrn); }
        if (name) {
            where.push(`lower(name_first || ' ' || name_last) like $${i++}`);
            params.push(`%${name.toLowerCase()}%`);
        }
        const whereSql = where.length ? `where ${where.join(" and ")}` : "";

        const countSql = `
            SELECT count(*)::int as c from patients ${whereSql}
        `;
        const { 0: c } = await sql.unsafe(countSql, params);
        const total = c.c;

        const orderBy = `${sortFieldSql(sortField)} ${sortDirSql(sortDir)}`;
        const offset = (page - 1) * pageSize;
        const listSql = `
            SELECT *
            FROM patients
            ${whereSql}
            ORDER BY ${orderBy}
            limit $${i++} offset $${i++}
        `;
        const rows = await sql.unsafe(listSql, [...params, pageSize, offset]);

        return { items: rows.map(rowToPatient), total };
    },

    async update(id, patch) {
        const [curr] = await sql`
            SELECT * FROM patients WHERE id = ${id} LIMIT 1
        `;
        
        if(!curr || curr.is_deleted) {
            const error = new Error ("Not found");
            error.code = "NOT_FOUND";
            throw error;
        }

        const name_first = patch?.name?.first ?? curr.name_first;
        const name_last = patch?.name?.last ?? curr.name_last;
        const name_middle = (patch?.name && "middle" in patch.name) ? (patch.name.middle ?? null) : curr.name_middle;
        const age = (typeof patch?.age === "number") ? patch.age : curr.age;
        const gender = patch?.gender ?? curr.gender;
        const contacts = ("contacts" in (patch || {})) ? (patch.contacts ?? []) : curr.contacts;

        const updated = await sql`
            UPDATE patients SET
                name_first = ${name_first},
                name_last = ${name_last},
                name_middle = ${name_middle},
                age = ${age},
                gender = ${gender},
                contacts = ${sql.json(contacts)},
                version = version + 1,
                updated_at = now()
            WHERE id = ${id}
            RETURNING *;
        `;

        return rowToPatient(updated[0]);
    },

    async setDiagnosis(id, diagnosis) {
        const [curr] = await sql`
            SELECT * FROM patients WHERE id = ${id} LIMIT 1
        `;

        if(!curr || curr.is_deleted) {
            const error = new Error("Not found");
            error.code = "NOT_FOUND";
            throw error;
        }

        const { physician, dept } = assignByDiagnosis(diagnosis);
        
        const updated = await sql`
            UPDATE patients SET
                admitting_diagnosis = ${diagnosis},
                attending_physician = ${physician},
                department = ${dept},
                version = version + 1,
                updated_at = now()
            WHERE id = ${id}
            RETURNING *;
        `;

        return rowToPatient(updated[0]);
    }
};