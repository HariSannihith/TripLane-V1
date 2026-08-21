'use strict';

const mongoose = require('mongoose');
const { SUPPORTED_CURRENCY_CODES, DEFAULT_CURRENCY } = require('../utils/currencies');

const memberSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    inviteCode: { type: String, required: true, unique: true, uppercase: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: { type: [memberSchema], default: [] },

    // Planning constraints shared by the whole group.
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    budgetMin: { type: Number, default: 0, min: 0 },
    budgetMax: { type: Number, default: 0, min: 0 },
    currency: {
      type: String,
      default: DEFAULT_CURRENCY,
      required: true,
      uppercase: true,
      enum: {
        values: SUPPORTED_CURRENCY_CODES,
        message: 'Choose a currency from the supported list',
      },
    },

    status: { type: String, enum: ['planning', 'finalized'], default: 'planning', index: true },
    finalSuggestion: { type: mongoose.Schema.Types.ObjectId, ref: 'Suggestion', default: null },
    finalizedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

groupSchema.index({ 'members.user': 1 });

groupSchema.methods.isMember = function isMember(userId) {
  return this.members.some((member) => String(member.user._id || member.user) === String(userId));
};

groupSchema.methods.isOwner = function isOwner(userId) {
  return String(this.owner._id || this.owner) === String(userId);
};

module.exports = mongoose.model('Group', groupSchema);
