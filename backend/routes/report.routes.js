const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, isAdmin, isAdminOrWorker } = require('../middleware/auth.middleware');

router.get('/daily', authenticate, isAdmin, reportController.dailyReport);
router.get('/weekly', authenticate, isAdmin, reportController.weeklyReport);
router.get('/monthly', authenticate, isAdmin, reportController.monthlyReport);
router.get('/worker', authenticate, isAdmin, reportController.workerReport);
router.get('/patient/:patientId/history', authenticate, isAdminOrWorker, reportController.patientHistory);
router.get('/fees', authenticate, isAdmin, reportController.feeReport);

module.exports = router;
