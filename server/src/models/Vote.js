'use strict';

const mongoose = require('mongoose');

/**
 * Each member holds at most one vote per group. Casting a vote for a different
 * suggestion moves the existing vote rather than adding a second one, and the
 * unique index below makes duplicate votes impossible even under a race between
 * two concurrent requests.
 */
const voteSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    suggestion: { type: mongoose.Schema.Types.ObjectId, ref: 'Suggestion', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

voteSchema.index({ group: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
