const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service');
const { error } = require('../helpers/response.helper');
const { ROLES } = require('../utils/constants');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Access denied. No token provided.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = authService.verifyToken(token);

    const worker = await authService.findById(decoded.id);
    if (!worker) {
      return error(res, 'User not found', 401);
    }

    if (worker.Status === 'inactive') {
      return error(res, 'Account is disabled', 401);
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      name: decoded.name,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token expired', 401);
    }
    return error(res, 'Invalid token', 401);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return error(res, 'Access denied. Insufficient permissions.', 403);
    }
    next();
  };
}

const isAdmin = authorize(ROLES.ADMIN);
const isWorker = authorize(ROLES.WORKER);
const isAdminOrWorker = authorize(ROLES.ADMIN, ROLES.WORKER);

module.exports = { authenticate, authorize, isAdmin, isWorker, isAdminOrWorker };
