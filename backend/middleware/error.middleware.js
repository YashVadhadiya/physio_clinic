const { error } = require('../helpers/response.helper');

function errorHandler(err, req, res, next) {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);

  if (err.name === 'ValidationError') {
    return error(res, err.message, 400);
  }

  if (err.name === 'UnauthorizedError' || err.message === 'Invalid credentials') {
    return error(res, err.message, 401);
  }

  if (err.message.includes('not found')) {
    return error(res, err.message, 404);
  }

  if (err.message.includes('already exists')) {
    return error(res, err.message, 409);
  }

  if (err.code === 'ENOENT') {
    return error(res, 'Resource not found', 404);
  }

  if (err.message.includes('Google') || err.message.includes('sheets')) {
    return error(res, 'Database service unavailable', 503);
  }

  return error(
    res,
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    500
  );
}

function notFound(req, res) {
  return error(res, `Route ${req.originalUrl} not found`, 404);
}

module.exports = { errorHandler, notFound };
