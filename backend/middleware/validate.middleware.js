const { validationResult } = require('express-validator');
const { error } = require('../helpers/response.helper');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(e => ({
      field: e.path,
      message: e.msg,
    }));
    return error(res, 'Validation failed', 400, formattedErrors);
  }
  next();
}

module.exports = { validate };
