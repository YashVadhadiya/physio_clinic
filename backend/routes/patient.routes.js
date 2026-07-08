const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { authenticate, isAdmin, isAdminOrWorker } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.get('/', authenticate, patientController.getAll);
router.get('/search', authenticate, patientController.search);
router.get('/recent', authenticate, patientController.getRecentPatients);
router.get('/mobile/:mobile', authenticate, patientController.findByMobile);
router.get('/:id', authenticate, patientController.getById);
router.get('/:id/visits', authenticate, patientController.getVisitHistory);

router.post('/', authenticate, isAdminOrWorker, [
  body('Name').trim().notEmpty().withMessage('Name is required'),
  body('Mobile').trim().notEmpty().withMessage('Mobile is required'),
  validate,
], patientController.create);

router.put('/:id', authenticate, isAdminOrWorker, patientController.update);
router.delete('/:id', authenticate, isAdmin, patientController.delete);

module.exports = router;
