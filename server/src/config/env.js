'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  // Fail fast: a server running without a DB URI or signing secret is not
  // meaningfully "up", and silently defaulting a JWT secret is a security hole.
  console.error(
    `[config] Missing required environment variables: ${missing.join(', ')}\n` +
      '[config] Copy server/.env.example to server/.env and fill in the values.'
  );
  process.exit(1);
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
};
