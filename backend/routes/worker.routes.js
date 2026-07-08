const express = require('express');
const router = express.Router();
const workerController = require('../controllers/worker.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

router.get('/', authenticate, isAdmin, workerController.getAll);
router.get('/active', authenticate, workerController.getActiveWorkers);
router.get('/search', authenticate, workerController.search);
router.get('/:id', authenticate, workerController.getById);
router.get('/:id/stats', authenticate, workerController.getWorkerStats);
router.put('/:id', authenticate, isAdmin, workerController.update);
router.patch('/:id/toggle-status', authenticate, isAdmin, workerController.toggleStatus);

module.exports = router;
