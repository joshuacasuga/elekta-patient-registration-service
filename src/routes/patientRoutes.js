import express from 'express';
import { patientController } from '../controllers/patientController.js';

const router = express.Router();

router.post('/', patientController.createPatient);
router.get('/:id', patientController.getPatientById);
router.get('/', patientController.getPatientsList);
router.patch('/:id', patientController.updatePatient);
router.put('/:id/diagnosis', patientController.setPatientDiagnosis);

export default router;