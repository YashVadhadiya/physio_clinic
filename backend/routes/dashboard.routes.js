const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, isAdmin, isAdminOrWorker } = require('../middleware/auth.middleware');

router.get('/admin', authenticate, isAdmin, dashboardController.adminDashboard);
router.get('/worker', authenticate, isAdminOrWorker, dashboardController.workerDashboard);

module.exports = router;
