'use strict';

const express = require('express');
const authRoutes = require('./authRoutes');
const groupRoutes = require('./groupRoutes');
const placesRoutes = require('./placesRoutes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
router.use('/auth', authRoutes);
router.use('/groups', groupRoutes);
router.use('/places', placesRoutes);

module.exports = router;
