'use strict';

const mongoose = require('mongoose');

const ACTIVITY_TYPES = [
  'group.created',
  'group.updated',
  'member.joined',
  'member.left',
  'member.removed',
  'suggestion.created',
  'suggestion.updated',
  'suggestion.deleted',
  'plan.activity.added',
  'plan.activity.removed',
  'vote.cast',
  'vote.changed',
  'vote.retracted',
  'trip.finalized',
  'trip.reopened',
];

/** Append-only feed of everything that happens inside a group. */
const activitySchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    message: { type: String, required: true, maxlength: 300 },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
module.exports.ACTIVITY_TYPES = ACTIVITY_TYPES;
