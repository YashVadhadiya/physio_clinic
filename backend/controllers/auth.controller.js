const authService = require('../services/auth.service');
const { success, created, error } = require('../helpers/response.helper');

exports.register = async (req, res, next) => {
  try {
    const worker = await authService.register(req.body);
    return created(res, worker, 'Worker registered successfully');
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { mobileOrEmail, password } = req.body;
    const result = await authService.login(mobileOrEmail, password);
    return success(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const worker = await authService.findById(req.user.id);
    if (!worker) return error(res, 'User not found', 404);
    const { PasswordHash, ...profile } = worker;
    return success(res, profile);
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, oldPassword, newPassword);
    return success(res, result, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.params.id);
    return success(res, result, 'Password reset successfully');
  } catch (err) {
    next(err);
  }
};
