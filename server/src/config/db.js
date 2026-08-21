'use strict';

const mongoose = require('mongoose');
const { mongoUri } = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`[db] connected to ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

module.exports = { connectDB };
