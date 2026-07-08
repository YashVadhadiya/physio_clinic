const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const visitController = require('../controllers/visit.controller');
const { authenticate, isAdminOrWorker, isAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.get('/', authenticate, visitController.getAll);
router.get('/search', authenticate, visitController.search);
router.get('/today', authenticate, visitController.getTodayVisits);
router.get('/date-range', authenticate, visitController.getByDateRange);
router.get('/worker/:workerId', authenticate, visitController.getByWorker);
router.get('/patient/:patientId', authenticate, visitController.getByPatient);
router.get('/:id', authenticate, visitController.getById);

router.post('/', authenticate, isAdminOrWorker, [
  body('PatientID').trim().notEmpty().withMessage('Patient ID is required'),
  validate,
], visitController.create);

router.put('/:id', authenticate, isAdminOrWorker, visitController.update);
router.delete('/:id', authenticate, isAdmin, visitController.delete);

module.exports = router;
