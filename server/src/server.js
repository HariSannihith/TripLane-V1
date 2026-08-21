'use strict';

const app = require('./app');
const { connectDB } = require('./config/db');
const { port, nodeEnv } = require('./config/env');

async function start() {
  try {
    await connectDB();
    const server = app.listen(port, () => {
      console.log(`[server] TripLane API listening on http://localhost:${port} (${nodeEnv})`);
    });

    const shutdown = (signal) => {
      console.log(`[server] ${signal} received, shutting down`);
      server.close(() => process.exit(0));
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  }
}

start();
