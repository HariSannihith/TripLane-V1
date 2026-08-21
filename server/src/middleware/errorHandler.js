'use strict';

const ApiError = require('../utils/ApiError');
const { nodeEnv } = require('../config/env');

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
}

// eslint-disable-next-line no-unused-vars -- Express identifies error middleware by arity.
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';
  let code = err.code;
  let details = err.details;

  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Please check the highlighted fields';
    details = Object.fromEntries(Object.entries(err.errors).map(([key, e]) => [key, e.message]));
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE';
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `That ${field} is already taken`;
  }

  if (status >= 500) {
    console.error('[error]', err);
  }

  const body = { error: { message, code } };
  if (details) body.error.details = details;
  if (nodeEnv === 'development' && status >= 500) body.error.stack = err.stack;

  res.status(status).json(body);
}

module.exports = { notFoundHandler, errorHandler };
