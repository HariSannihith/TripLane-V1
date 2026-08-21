'use strict';

const Activity = require('../models/Activity');

/**
 * Records a feed entry. Feed writes must never break the action that triggered
 * them, so failures are logged instead of thrown.
 */
async function logActivity({ group, actor, type, message, meta = {} }) {
  try {
    return await Activity.create({ group, actor, type, message, meta });
  } catch (err) {
    console.error('[activity] failed to record entry', type, err.message);
    return null;
  }
}

module.exports = { logActivity };
