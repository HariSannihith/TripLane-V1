'use strict';

const mongoose = require('mongoose');

/** A single planned activity inside a proposed trip (museum visit, hike, ...). */
const plannedActivitySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    note: { type: String, trim: true, maxlength: 300, default: '' },
    cost: { type: Number, default: 0, min: 0 },
    day: { type: Number, default: 1, min: 1, max: 60 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const suggestionSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Destination — sourced from Google Places when available, else typed by hand.
    placeId: { type: String, default: null },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    address: { type: String, trim: true, maxlength: 300, default: '' },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    photoRef: { type: String, default: null },
    rating: { type: Number, default: null, min: 0, max: 5 },

    // Trip parameters proposed for this destination.
    estimatedCost: { type: Number, required: true, min: 0 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },

    activities: { type: [plannedActivitySchema], default: [] },
  },
  { timestamps: true }
);

// One destination may only be proposed once per group — keeps the vote tally
// meaningful and prevents accidental double entries.
suggestionSchema.index(
  { group: 1, placeId: 1 },
  { unique: true, partialFilterExpression: { placeId: { $type: 'string' } } }
);

module.exports = mongoose.model('Suggestion', suggestionSchema);
