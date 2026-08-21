'use strict';

const mongoose = require('mongoose');
const Suggestion = require('../models/Suggestion');
const Vote = require('../models/Vote');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../services/activityService');
const { tallyGroupVotes, getUserVote } = require('../services/votingService');
const { presentSuggestion } = require('../utils/presenters');

/** Loads a suggestion that belongs to the group already resolved on the request. */
async function loadSuggestion(req) {
  const { suggestionId } = req.params;
  if (!mongoose.isValidObjectId(suggestionId)) throw ApiError.notFound('Destination not found');

  const suggestion = await Suggestion.findOne({ _id: suggestionId, group: req.group._id }).populate(
    'createdBy activities.addedBy'
  );
  if (!suggestion) throw ApiError.notFound('Destination not found');
  return suggestion;
}

function assertPlanning(group) {
  if (group.status === 'finalized') {
    throw ApiError.conflict('This trip is finalised. Reopen voting to make changes.', { code: 'TRIP_FINALIZED' });
  }
}

function assertCanManage(suggestion, req) {
  const isAuthor = String(suggestion.createdBy._id || suggestion.createdBy) === String(req.user._id);
  if (!isAuthor && !req.isGroupOwner) {
    throw ApiError.forbidden('Only the member who suggested this destination, or the organiser, can change it');
  }
}

function parseSuggestionDates(body, existing = {}) {
  const startDate = body.startDate !== undefined ? (body.startDate ? new Date(body.startDate) : null) : existing.startDate;
  const endDate = body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : existing.endDate;

  if (startDate && endDate && endDate < startDate) {
    throw ApiError.badRequest('The return date must be on or after the departure date', {
      code: 'VALIDATION_ERROR',
      details: { endDate: 'The return date must be on or after the departure date' },
    });
  }
  return { startDate: startDate || null, endDate: endDate || null };
}

const listSuggestions = asyncHandler(async (req, res) => {
  const [suggestions, tally, myVote] = await Promise.all([
    Suggestion.find({ group: req.group._id }).populate('createdBy activities.addedBy').sort({ createdAt: 1 }),
    tallyGroupVotes(req.group._id),
    getUserVote(req.group._id, req.user._id),
  ]);

  const finalId = req.group.finalSuggestion ? String(req.group.finalSuggestion) : null;

  res.json({
    suggestions: suggestions.map((suggestion) =>
      presentSuggestion(suggestion, {
        voteCount: tally.counts[String(suggestion._id)] || 0,
        votedByMe: myVote === String(suggestion._id),
        isFinal: finalId === String(suggestion._id),
      })
    ),
    voting: { ...tally, myVote },
  });
});

const createSuggestion = asyncHandler(async (req, res) => {
  assertPlanning(req.group);

  const { name, address = '', placeId = null, photoRef = null, rating = null, estimatedCost, notes = '', location = {} } = req.body;
  const { startDate, endDate } = parseSuggestionDates(req.body);

  if (placeId) {
    const duplicate = await Suggestion.findOne({ group: req.group._id, placeId });
    if (duplicate) throw ApiError.conflict('That destination has already been suggested for this trip');
  }

  const suggestion = await Suggestion.create({
    group: req.group._id,
    createdBy: req.user._id,
    placeId,
    name,
    address,
    location: {
      lat: location.lat ?? null,
      lng: location.lng ?? null,
    },
    photoRef,
    rating,
    estimatedCost: Number(estimatedCost),
    startDate,
    endDate,
    notes,
  });

  await logActivity({
    group: req.group._id,
    actor: req.user._id,
    type: 'suggestion.created',
    message: `${req.user.name} suggested ${suggestion.name}`,
    meta: { suggestionId: suggestion._id },
  });

  await suggestion.populate('createdBy');
  res.status(201).json({ suggestion: presentSuggestion(suggestion) });
});

const updateSuggestion = asyncHandler(async (req, res) => {
  assertPlanning(req.group);
  const suggestion = await loadSuggestion(req);
  assertCanManage(suggestion, req);

  ['name', 'address', 'notes'].forEach((field) => {
    if (req.body[field] !== undefined) suggestion[field] = req.body[field];
  });
  if (req.body.estimatedCost !== undefined) suggestion.estimatedCost = Number(req.body.estimatedCost);

  const { startDate, endDate } = parseSuggestionDates(req.body, suggestion);
  suggestion.startDate = startDate;
  suggestion.endDate = endDate;

  await suggestion.save();
  await logActivity({
    group: req.group._id,
    actor: req.user._id,
    type: 'suggestion.updated',
    message: `${req.user.name} updated ${suggestion.name}`,
    meta: { suggestionId: suggestion._id },
  });

  const voteCount = await Vote.countDocuments({ suggestion: suggestion._id });
  const myVote = await getUserVote(req.group._id, req.user._id);
  res.json({ suggestion: presentSuggestion(suggestion, { voteCount, votedByMe: myVote === String(suggestion._id) }) });
});

const deleteSuggestion = asyncHandler(async (req, res) => {
  assertPlanning(req.group);
  const suggestion = await loadSuggestion(req);
  assertCanManage(suggestion, req);

  await Vote.deleteMany({ suggestion: suggestion._id });
  await Suggestion.deleteOne({ _id: suggestion._id });

  await logActivity({
    group: req.group._id,
    actor: req.user._id,
    type: 'suggestion.deleted',
    message: `${req.user.name} removed ${suggestion.name}`,
  });

  res.json({ message: 'Destination removed' });
});

const addPlannedActivity = asyncHandler(async (req, res) => {
  assertPlanning(req.group);
  const suggestion = await loadSuggestion(req);

  const { title, note = '', cost = 0, day = 1 } = req.body;
  suggestion.activities.push({ title, note, cost: Number(cost), day: Number(day), addedBy: req.user._id });
  await suggestion.save();

  await logActivity({
    group: req.group._id,
    actor: req.user._id,
    type: 'plan.activity.added',
    message: `${req.user.name} added "${title}" to ${suggestion.name}`,
    meta: { suggestionId: suggestion._id },
  });

  await suggestion.populate('createdBy activities.addedBy');
  const voteCount = await Vote.countDocuments({ suggestion: suggestion._id });
  const myVote = await getUserVote(req.group._id, req.user._id);
  res.status(201).json({
    suggestion: presentSuggestion(suggestion, { voteCount, votedByMe: myVote === String(suggestion._id) }),
  });
});

const removePlannedActivity = asyncHandler(async (req, res) => {
  assertPlanning(req.group);
  const suggestion = await loadSuggestion(req);

  const activity = suggestion.activities.id(req.params.activityId);
  if (!activity) throw ApiError.notFound('Activity not found');

  const isAuthor = String(activity.addedBy._id || activity.addedBy) === String(req.user._id);
  if (!isAuthor && !req.isGroupOwner) {
    throw ApiError.forbidden('Only the member who added this activity, or the organiser, can remove it');
  }

  const { title } = activity;
  activity.deleteOne();
  await suggestion.save();

  await logActivity({
    group: req.group._id,
    actor: req.user._id,
    type: 'plan.activity.removed',
    message: `${req.user.name} removed "${title}" from ${suggestion.name}`,
    meta: { suggestionId: suggestion._id },
  });

  await suggestion.populate('createdBy activities.addedBy');
  const voteCount = await Vote.countDocuments({ suggestion: suggestion._id });
  const myVote = await getUserVote(req.group._id, req.user._id);
  res.json({ suggestion: presentSuggestion(suggestion, { voteCount, votedByMe: myVote === String(suggestion._id) }) });
});

module.exports = {
  listSuggestions,
  createSuggestion,
  updateSuggestion,
  deleteSuggestion,
  addPlannedActivity,
  removePlannedActivity,
  loadSuggestion,
};
