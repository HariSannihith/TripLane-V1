'use strict';

const Vote = require('../models/Vote');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { logActivity } = require('../services/activityService');
const { tallyGroupVotes } = require('../services/votingService');
const { loadSuggestion } = require('./suggestionController');

/**
 * Casts (or moves) the caller's single vote in this group.
 *
 * Duplicate-vote prevention has two layers: an explicit check that returns a
 * friendly 409 when the same destination is voted twice, and a unique index on
 * {group, user} that makes a second vote impossible even if two requests race.
 */
const castVote = asyncHandler(async (req, res) => {
  const group = req.group;
  if (group.status === 'finalized') {
    throw ApiError.conflict('Voting is closed — this trip is already finalised', { code: 'TRIP_FINALIZED' });
  }

  const suggestion = await loadSuggestion(req);
  const existing = await Vote.findOne({ group: group._id, user: req.user._id });

  if (existing && String(existing.suggestion) === String(suggestion._id)) {
    throw ApiError.conflict('You have already voted for this destination', { code: 'DUPLICATE_VOTE' });
  }

  let changed = false;
  if (existing) {
    existing.suggestion = suggestion._id;
    await existing.save();
    changed = true;
  } else {
    try {
      await Vote.create({ group: group._id, suggestion: suggestion._id, user: req.user._id });
    } catch (err) {
      // Lost a race against a concurrent vote from the same user: move it instead.
      if (err.code === 11000) {
        await Vote.updateOne({ group: group._id, user: req.user._id }, { suggestion: suggestion._id });
        changed = true;
      } else {
        throw err;
      }
    }
  }

  await logActivity({
    group: group._id,
    actor: req.user._id,
    type: changed ? 'vote.changed' : 'vote.cast',
    message: changed
      ? `${req.user.name} switched their vote to ${suggestion.name}`
      : `${req.user.name} voted for ${suggestion.name}`,
    meta: { suggestionId: suggestion._id },
  });

  const tally = await tallyGroupVotes(group._id);
  res.status(changed ? 200 : 201).json({
    voting: { ...tally, myVote: String(suggestion._id) },
    changed,
  });
});

const retractVote = asyncHandler(async (req, res) => {
  const group = req.group;
  if (group.status === 'finalized') {
    throw ApiError.conflict('Voting is closed — this trip is already finalised', { code: 'TRIP_FINALIZED' });
  }

  const suggestion = await loadSuggestion(req);
  const deleted = await Vote.findOneAndDelete({
    group: group._id,
    user: req.user._id,
    suggestion: suggestion._id,
  });
  if (!deleted) throw ApiError.notFound('You have not voted for this destination');

  await logActivity({
    group: group._id,
    actor: req.user._id,
    type: 'vote.retracted',
    message: `${req.user.name} withdrew their vote for ${suggestion.name}`,
    meta: { suggestionId: suggestion._id },
  });

  const tally = await tallyGroupVotes(group._id);
  res.json({ voting: { ...tally, myVote: null } });
});

module.exports = { castVote, retractVote };
