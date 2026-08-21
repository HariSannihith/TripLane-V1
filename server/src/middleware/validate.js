'use strict';

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/** Turns express-validator results into a single 400 with per-field messages. */
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = {};
  result.array().forEach((error) => {
    const field = error.path || error.param || '_';
    if (!details[field]) details[field] = error.msg;
  });

  return next(ApiError.badRequest('Please check the highlighted fields', { code: 'VALIDATION_ERROR', details }));
}

module.exports = validate;
