const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.post('/register', [
  body('Name').trim().notEmpty().withMessage('Name is required'),
  body('Mobile').trim().notEmpty().withMessage('Mobile is required'),
  body('Email').isEmail().withMessage('Valid email is required'),
  body('Password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate,
], authController.register);

router.post('/login', [
  body('mobileOrEmail').trim().notEmpty().withMessage('Mobile or email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
], authController.login);

router.get('/profile', authenticate, authController.getProfile);

router.put('/change-password', authenticate, [
  body('oldPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  validate,
], authController.changePassword);

router.put('/reset-password/:id', authenticate, isAdmin, authController.resetPassword);

module.exports = router;
