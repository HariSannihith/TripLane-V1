'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { requireAuth } = require('../middleware/auth');
const { search, details, photo } = require('../controllers/placesController');

const router = express.Router();

// Google Places is billed per call, so cap how fast one client can spend it.
const placesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Slow down a little — too many place lookups.' } },
});

// The photo proxy is consumed by <img src="...">, which cannot carry an
// Authorization header, so it stays unauthenticated. It is safe: the reference
// format is strictly validated, the API key never leaves the server, and the
// rate limiter caps abuse.
router.get('/photo', placesLimiter, photo);

router.use(requireAuth, placesLimiter);

router.get('/search', search);
router.get('/:placeId', details);

module.exports = router;
