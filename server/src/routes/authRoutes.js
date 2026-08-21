'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { nodeEnv } = require('../config/env');
const { register, login, me } = require('../controllers/authController');

const router = express.Router();

// Throttles credential stuffing without getting in a normal user's way. The
// allowance is looser in development so seeding and manual testing do not trip it.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: nodeEnv === 'production' ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts. Please wait a few minutes and try again.' } },
});

const emailRule = body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail();
const passwordRule = body('password')
  .isLength({ min: 8, max: 72 })
  .withMessage('Password must be at least 8 characters')
  .matches(/[a-zA-Z]/)
  .withMessage('Password must contain at least one letter')
  .matches(/[0-9]/)
  .withMessage('Password must contain at least one number');

router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Name must be 2-60 characters'),
    emailRule,
    passwordRule,
  ],
  validate,
  register
);

router.post(
  '/login',
  authLimiter,
  [emailRule, body('password').notEmpty().withMessage('Enter your password')],
  validate,
  login
);

router.get('/me', requireAuth, me);

module.exports = router;
