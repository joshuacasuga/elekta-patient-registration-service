### Overview
The __Patient Registration Service__ is a headless RESTful API built with __Node.js__ that simulates the capture and management of patient registration information for a cancer clinic. It demonstrates backend service design using layered architecture (Controller → Service → Repository), PostgreSQL persistence via __Supabase__, and basic concurrency and validation rules.
This service supports:
* Patient registration (create)
* Patient retrieval (by ID, or list/search)
* Patient update (demographics/contacts)
* Assigning admitting diagnosis (with automatic physician/department assignment)
* Preventing deletion after diagnosis assignment

---

### Architecture
The service is organized into three core layers:
| Layer          | Responsibility                     | Example File                       |
| -------------- | ---------------------------------- | ---------------------------------- |
| **Controller** | Handles HTTP requests/responses    | `controllers/patientController.js` |
| **Service**    | Implements business logic          | `services/patientService.js`       |
| **Repository** | Performs database operations (SQL) | `repositories/patientRepo.js`      |

Database connectivity is established via a centralized `config/db.js` file, which uses Supabase's Postgres connection string and `postgres` client.

---

### Tech Stack
* __Language__: JavaScript
* __Framework__: Express.js
* __Database__: PostgreSQL (Supabase)
* __Architecture__: Layered (Controller → Service → Repository)
* __Data Persistence__: PostgreSQL
* __Security__: Basic input validation

---

### API Endpoints
#### 1. Register Patient
__POST__ `/v1/patients`

Creates a new patient record with demographic info.
`admittingDiagnosis`, `attendingPhysician`, and `department` start as `null`.

__Request__:
```
{
  "medicalRecordNumber": "MRN-300001",
  "name": { "first": "Marie", "last": "Curie" },
  "age": 44,
  "gender": "female",
  "contacts": [
    { "type": "email", "value": "marie@example.com" }
  ]
}
```

__Response__:
```
{
  "success": true,
  "data": {
    "id": "uuid",
    "medicalRecordNumber": "MRN-300001",
    "name": { "first": "Marie", "last": "Curie" },
    "age": 44,
    "gender": "female",
    "contacts": [{ "type": "email", "value": "marie@example.com" }],
    "admittingDiagnosis": null,
    "attendingPhysician": null,
    "department": null,
    "version": 1
  }
}
```

---

#### 2. Get Patient by ID
__GET__ `/v1/patients/:id`

Returns the patient record for a given ID.

__Response__:
```
{
  "success": true,
  "data": {
    "id": "uuid",
    "medicalRecordNumber": "MRN-300001",
    "name": { "first": "Marie", "last": "Curie" },
    "age": 44,
    "gender": "female",
    ...
  }
}
```

---

#### 3. List/Search Patients
__GET__ `/v1/patients`

Supports pagination, seach, and sorting by name, MRN, or creation date.

__Query Params__:
| Param      | Type   | Description                         |
| ---------- | ------ | ----------------------------------- |
| `page`     | int    | Page number (default 1)             |
| `pageSize` | int    | Items per page (default 25)         |
| `name`     | string | Search by first+last name substring |
| `mrn`      | string | Filter by MRN                       |
| `sort`     | string | e.g., `name:asc`, `createdAt:desc`  |

__Response__:
```
{
    "page": 1,
    "pageSize": 3,
    "total": 2,
    "sort": {
        "field": "name",
        "direction": "asc"
    },
    "filters": {
        "name": "smi"
    },
    "items": [
        {
            "id": "72e57ad5-a93c-4ee6-a826-7068d9457ba6",
            "medicalRecordNumber": "MRN-000002",
            "name": {
                "first": "James",
                "last": "Smith"
            },
            "age": 22,
            "gender": "male",
            "contacts": [],
            "admittingDiagnosis": null,
            "attendingPhysician": null,
            "department": null,
            "createdAt": "2025-10-14T20:24:15.135Z",
            "updatedAt": "2025-10-14T20:24:15.135Z",
            "version": 1,
            "isDeleted": false
        },
        {
            "id": "fec270ce-d97a-4a44-b478-58799c6ca6b3",
            "medicalRecordNumber": "MRN-00001",
            "name": {
                "first": "Jane",
                "last": "Smith"
            },
            "age": 35,
            "gender": "female",
            "contacts": [],
            "admittingDiagnosis": "prostate",
            "attendingPhysician": "BEN_SMITH",
            "department": "S",
            "createdAt": "2025-10-14T01:29:48.156Z",
            "updatedAt": "2025-10-14T19:56:47.453Z",
            "version": 5,
            "isDeleted": false
        }
    ]
}
```

---

#### 4. Update Patient Demographics
__PATCH__ `/v1/patients/:id`

Updates patient's name, age, gender, or contacts.

__Request__:
```
{
  "name": { "first": "Ada", "last": "Lovelace" },
  "age": 38
}
```

__Response__:
```
{
  "success": true,
  "data": {
    "name": { "first": "Ada", "last": "Lovelace" },
    "age": 38,
    "version": 2
  }
}
```

---

#### 5. Assign Admitting Diagnosis
__PUT__ `/v1/patients/:id/diagnosis`

Sets the `admittingDiagnosis` and auto-assigns attending physician and department.
| Diagnosis             | Physician       | Department |
| --------------------- | --------------- | ---------- |
| breast, lung          | Dr. Susan Jones | J          |
| prostate, unspecified | Dr. Ben Smith   | S          |

__Request__:
```
{ "admittingDiagnosis": "lung" }
```

__Response__:
```
{
  "success": true,
  "data": {
    "admittingDiagnosis": "lung",
    "attendingPhysician": "SUSAN_JONES",
    "department": "J"
  }
}
```

---

#### 6. Delete Patient (if allowed)
__DELETE__ `/v1/patients/:id`

Allowed __only if__ the patient has no admitting diagnosis.

---

### Business Rules
| Rule                       | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| **Immutability**           | Once a diagnosis is set, the patient cannot be deleted.   |
| **Assignment Logic**       | Physician and department depend on diagnosis type.        |
| **Validation**             | Required fields: name, MRN, age, gender.                  |
| **Soft Delete**            | Uses `is_deleted` flag in DB (never physically deletes).  |

---

### Database Schema
| Column                                   | Type        | Notes                            |
| ---------------------------------------- | ----------- | -------------------------------- |
| `id`                                     | UUID (PK)   | Auto-generated                   |
| `medical_record_number`                  | String      | Unique                           |
| `name_first`, `name_last`, `name_middle` | String      | Patient name                     |
| `age`                                    | Integer     | Required                         |
| `gender`                                 | String      | male/female/other                |
| `contacts`                               | JSONB       | List of `{type, value}`          |
| `admitting_diagnosis`                    | String      | breast/lung/prostate/unspecified |
| `attending_physician`                    | String      | auto-assigned                    |
| `department`                             | String      | “J” or “S”                       |
| `version`                                | Integer     | Used for concurrency             |
| `is_deleted`                             | Boolean     | Default `false`                  |
| `created_at`, `updated_at`               | Timestamp   | Auto timestamps                  |

---

### Future Enhancements & Open Questions
#### Possible Enhancements
* Convert `contacts` from JSONB to normalized relational database table (`id, patient_id, type, value, preffered`)
  * Create CRUD endpoints such as:
    * `GET /v1/patients/:id/contacts` - list all contacts for a patient
    * `POST /v1/patients/:id/contacts` - add a new contact (emali, phone, etc)
    * `PATCH /v1/patients/:id/contacts/:contactId` - update contact info or mark as preferred
    * `DELETE /v1/patients/:id/contacts/:contactId` - remove a contact record
* Implement authentication and role-based access (admin vs clinical staff)
  * Use JWT authentication, hash passwords, and create a middleware that verifies the token and checks for `role`
* Implement ETag/If-Match for optimistic cocurrency control
  * On reads/creates, return ETag version
  * On PATCH/PUT/DELETE, require `If-Match`
* Add unit and integration tests with Jest
* Add audit logging for all write operations
  * Add an `audit_logs` table (`id, actor_id, action, entity, entity_id, before, after, at`) and insert from the service layer on every create/update/delete.

#### Open Questions
* Without a user interface, where will input data be coming from?
* Should patient deletion be soft or hard in production environments?
* Should 'contacts' be a separate relational table for normalization?
* Should diagnoses be extensible beyond fixed categories?
