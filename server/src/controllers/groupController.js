'use strict';

const mongoose = require('mongoose');
const Group = require('../models/Group');
const Suggestion = require('../models/Suggestion');
const Vote = require('../models/Vote');
const Activity = require('../models/Activity');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { generateInviteCode } = require('../utils/inviteCode');
const { DEFAULT_CURRENCY, normalizeCurrency } = require('../utils/currencies');
const { logActivity } = require('../services/activityService');
const { tallyGroupVotes, getUserVote, getVoterIds } = require('../services/votingService');
const {
  presentGroupSummary,
  presentGroupDetail,
  presentSuggestion,
  presentActivityEntry,
} = require('../utils/presenters');

const MAX_INVITE_ATTEMPTS = 5;

/** Retries on the (unlikely) unique-index collision rather than trusting one draw. */
async function createWithUniqueInviteCode(payload) {
  for (let attempt = 0; attempt < MAX_INVITE_ATTEMPTS; attempt += 1) {
    try {
      return await Group.create({ ...payload, inviteCode: generateInviteCode() });
    } catch (err) {
      const isDuplicateCode = err.code === 11000 && err.keyPattern && err.keyPattern.inviteCode;
      if (!isDuplicateCode || attempt === MAX_INVITE_ATTEMPTS - 1) throw err;
    }
  }
  throw new ApiError(500, 'Could not generate a unique invite code');
}

function parseDateRange(body) {
  const startDate = body.startDate ? new Date(body.startDate) : null;
  const endDate = body.endDate ? new Date(body.endDate) : null;
  if (startDate && endDate && endDate < startDate) {
    throw ApiError.badRequest('The end date must be on or after the start date', {
      code: 'VALIDATION_ERROR',
      details: { endDate: 'The end date must be on or after the start date' },
    });
  }
  return { startDate, endDate };
}

function assertBudgetRange(budgetMin, budgetMax) {
  if (budgetMax > 0 && budgetMin > budgetMax) {
    throw ApiError.badRequest('The minimum budget cannot exceed the maximum', {
      code: 'VALIDATION_ERROR',
      details: { budgetMin: 'The minimum budget cannot exceed the maximum' },
    });
  }
}

const createGroup = asyncHandler(async (req, res) => {
  const { name, description = '', budgetMin = 0, budgetMax = 0 } = req.body;
  // Validation treats a falsy currency as "not provided", and a destructuring
  // default only covers `undefined` — so normalise null and '' here too.
  const currency = normalizeCurrency(req.body.currency) || DEFAULT_CURRENCY;
  const { startDate, endDate } = parseDateRange(req.body);
  assertBudgetRange(Number(budgetMin), Number(budgetMax));

  const group = await createWithUniqueInviteCode({
    name,
    description,
    owner: req.user._id,
    members: [{ user: req.user._id, role: 'owner' }],
    startDate,
    endDate,
    budgetMin: Number(budgetMin),
    budgetMax: Number(budgetMax),
    currency,
  });

  await logActivity({
    group: group._id,
    actor: req.user._id,
    type: 'group.created',
    message: `${req.user.name} created the trip group`,
  });

  await group.populate('owner members.user');
  res.status(201).json({ group: presentGroupSummary(group, { suggestionCount: 0, myRole: 'owner' }) });
});

const listMyGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ 'members.user': req.user._id })
    .populate('owner')
    .sort({ updatedAt: -1 });

  const groupIds = groups.map((group) => group._id);
  const [suggestionCounts, myVotes] = await Promise.all([
    Suggestion.aggregate([
      { $match: { group: { $in: groupIds } } },
      { $group: { _id: '$group', count: { $sum: 1 } } },
    ]),
    Vote.find({ group: { $in: groupIds }, user: req.user._id }),
  ]);

  const countByGroup = Object.fromEntries(suggestionCounts.map((row) => [String(row._id), row.count]));
  const votedGroups = new Set(myVotes.map((vote) => String(vote.group)));

  res.json({
    groups: groups.map((group) =>
      presentGroupSummary(group, {
        suggestionCount: countByGroup[String(group._id)] || 0,
        myRole: group.isOwner(req.user._id) ? 'owner' : 'member',
        hasVoted: votedGroups.has(String(group._id)),
      })
    ),
  });
});

const joinGroup = asyncHandler(async (req, res) => {
  const inviteCode = String(req.body.inviteCode || '').trim().toUpperCase();

  const group = await Group.findOne({ inviteCode });
  if (!group) throw ApiError.notFound('No group matches that invite code');

  if (group.isMember(req.user._id)) {
    throw ApiError.conflict('You are already a member of this group', { code: 'ALREADY_MEMBER', details: { groupId: group._id } });
  }

  group.members.push({ user: req.user._id, role: 'member' });
  await group.save();

  await logActivity({
    group: group._id,
    actor: req.user._id,
    type: 'member.joined',
    message: `${req.user.name} joined the group`,
  });

  await group.populate('owner');
  res.status(200).json({ group: presentGroupSummary(group, { myRole: 'member' }) });
});

/** Full planning view: group, members, suggestions with live tally, own vote. */
const getGroup = asyncHandler(async (req, res) => {
  const group = req.group;
  await group.populate([
    { path: 'owner' },
    { path: 'members.user' },
    { path: 'finalSuggestion', populate: [{ path: 'createdBy' }, { path: 'activities.addedBy' }] },
  ]);

  const [suggestions, tally, myVote, voterIds] = await Promise.all([
    Suggestion.find({ group: group._id }).populate('createdBy activities.addedBy').sort({ createdAt: 1 }),
    tallyGroupVotes(group._id),
    getUserVote(group._id, req.user._id),
    getVoterIds(group._id),
  ]);

  const finalId = group.finalSuggestion ? String(group.finalSuggestion._id || group.finalSuggestion) : null;

  res.json({
    group: presentGroupDetail(group, { myRole: req.isGroupOwner ? 'owner' : 'member' }),
    suggestions: suggestions.map((suggestion) =>
      presentSuggestion(suggestion, {
        voteCount: tally.counts[String(suggestion._id)] || 0,
        votedByMe: myVote === String(suggestion._id),
        isFinal: finalId === String(suggestion._id),
      })
    ),
    voting: { ...tally, myVote, voterIds },
  });
});

const updateGroup = asyncHandler(async (req, res) => {
  const group = req.group;
  const updatable = ['name', 'description'];

  updatable.forEach((field) => {
    if (req.body[field] !== undefined) group[field] = req.body[field];
  });

  // A blank currency means "leave it alone" rather than "clear it", so the
  // group can never end up without one.
  if (req.body.currency) group.currency = normalizeCurrency(req.body.currency);

  if (req.body.startDate !== undefined || req.body.endDate !== undefined) {
    const { startDate, endDate } = parseDateRange({
      startDate: req.body.startDate !== undefined ? req.body.startDate : group.startDate,
      endDate: req.body.endDate !== undefined ? req.body.endDate : group.endDate,
    });
    group.startDate = startDate;
    group.endDate = endDate;
  }

  if (req.body.budgetMin !== undefined) group.budgetMin = Number(req.body.budgetMin);
  if (req.body.budgetMax !== undefined) group.budgetMax = Number(req.body.budgetMax);
  assertBudgetRange(group.budgetMin, group.budgetMax);

  await group.save();
  await logActivity({
    group: group._id,
    actor: req.user._id,
    type: 'group.updated',
    message: `${req.user.name} updated the trip details`,
  });

  await group.populate('owner members.user');
  res.json({ group: presentGroupDetail(group, { myRole: 'owner' }) });
});

const deleteGroup = asyncHandler(async (req, res) => {
  const groupId = req.group._id;
  // Remove dependents so votes/suggestions cannot outlive their group.
  await Promise.all([
    Suggestion.deleteMany({ group: groupId }),
    Vote.deleteMany({ group: groupId }),
    Activity.deleteMany({ group: groupId }),
  ]);
  await Group.deleteOne({ _id: groupId });

  res.json({ message: 'Group deleted' });
});

const leaveGroup = asyncHandler(async (req, res) => {
  const group = req.group;
  if (group.isOwner(req.user._id)) {
    throw ApiError.badRequest('The organiser cannot leave. Transfer ownership or delete the group instead.');
  }

  group.members = group.members.filter((member) => String(member.user) !== String(req.user._id));
  await group.save();
  await Vote.deleteOne({ group: group._id, user: req.user._id });

  await logActivity({
    group: group._id,
    actor: req.user._id,
    type: 'member.left',
    message: `${req.user.name} left the group`,
  });

  res.json({ message: 'You left the group' });
});

const removeMember = asyncHandler(async (req, res) => {
  const group = req.group;
  const { userId } = req.params;

  if (!mongoose.isValidObjectId(userId)) throw ApiError.notFound('Member not found');
  if (String(userId) === String(group.owner)) throw ApiError.badRequest('The organiser cannot be removed');

  const member = group.members.find((entry) => String(entry.user) === String(userId));
  if (!member) throw ApiError.notFound('Member not found');

  group.members = group.members.filter((entry) => String(entry.user) !== String(userId));
  await group.save();
  await Vote.deleteOne({ group: group._id, user: userId });

  await logActivity({
    group: group._id,
    actor: req.user._id,
    type: 'member.removed',
    message: `${req.user.name} removed a member from the group`,
    meta: { removedUser: userId },
  });

  await group.populate('owner members.user');
  res.json({ group: presentGroupDetail(group, { myRole: 'owner' }) });
});

const getResults = asyncHandler(async (req, res) => {
  const group = req.group;
  const [tally, myVote, suggestions] = await Promise.all([
    tallyGroupVotes(group._id),
    getUserVote(group._id, req.user._id),
    Suggestion.find({ group: group._id }).populate('createdBy activities.addedBy'),
  ]);

  const byId = new Map(suggestions.map((suggestion) => [String(suggestion._id), suggestion]));
  const finalId = group.finalSuggestion ? String(group.finalSuggestion) : null;

  res.json({
    voting: { ...tally, myVote },
    // Leaders are returned in full so the UI can render a tie-break chooser.
    leaders: tally.leaders
      .filter((id) => byId.has(id))
      .map((id) =>
        presentSuggestion(byId.get(id), {
          voteCount: tally.counts[id] || 0,
          votedByMe: myVote === id,
          isFinal: finalId === id,
        })
      ),
    membersYetToVote: group.members.length - tally.totalVotes,
    status: group.status,
  });
});

/**
 * Locks the winning destination. With a clear winner the organiser can finalise
 * without arguments; on a tie they must name one of the tied suggestions.
 */
const finalizeTrip = asyncHandler(async (req, res) => {
  const group = req.group;
  if (group.status === 'finalized') {
    throw ApiError.conflict('This trip is already finalised. Reopen it first to change the destination.');
  }

  const suggestionCount = await Suggestion.countDocuments({ group: group._id });
  if (suggestionCount === 0) throw ApiError.badRequest('Add at least one destination before finalising');

  const tally = await tallyGroupVotes(group._id);
  const requestedId = req.body.suggestionId;
  let winnerId;

  if (requestedId) {
    if (!mongoose.isValidObjectId(requestedId)) throw ApiError.badRequest('Unknown destination');
    // A manual pick is only allowed among tied leaders, or when nobody voted.
    const isLeader = tally.leaders.includes(String(requestedId));
    if (tally.totalVotes > 0 && !isLeader) {
      throw ApiError.badRequest('You can only finalise a destination that is leading the vote');
    }
    winnerId = String(requestedId);
  } else if (tally.totalVotes === 0) {
    throw ApiError.badRequest('Nobody has voted yet. Pick a destination explicitly to finalise anyway.', {
      code: 'NO_VOTES',
    });
  } else if (tally.isTie) {
    throw ApiError.conflict('The vote is tied. Choose one of the tied destinations to break it.', {
      code: 'TIE',
      details: { leaders: tally.leaders, votes: tally.topCount },
    });
  } else {
    [winnerId] = tally.leaders;
  }

  const winner = await Suggestion.findOne({ _id: winnerId, group: group._id }).populate('createdBy activities.addedBy');
  if (!winner) throw ApiError.notFound('That destination is not part of this group');

  group.status = 'finalized';
  group.finalSuggestion = winner._id;
  group.finalizedAt = new Date();
  // The trip window follows the winning proposal so the countdown has a target.
  if (winner.startDate) group.startDate = winner.startDate;
  if (winner.endDate) group.endDate = winner.endDate;
  await group.save();

  await logActivity({
    group: group._id,
    actor: req.user._id,
    type: 'trip.finalized',
    message: `${req.user.name} locked in ${winner.name}`,
    meta: { suggestionId: winner._id, tieBreak: tally.isTie },
  });

  await group.populate([{ path: 'owner' }, { path: 'members.user' }, { path: 'finalSuggestion', populate: 'createdBy' }]);
  res.json({
    group: presentGroupDetail(group, { myRole: 'owner' }),
    winner: presentSuggestion(winner, { voteCount: tally.counts[String(winner._id)] || 0, isFinal: true }),
    tieBroken: tally.isTie,
  });
});

const reopenTrip = asyncHandler(async (req, res) => {
  const group = req.group;
  if (group.status !== 'finalized') throw ApiError.badRequest('This trip is not finalised');

  group.status = 'planning';
  group.finalSuggestion = null;
  group.finalizedAt = null;
  await group.save();

  await logActivity({
    group: group._id,
    actor: req.user._id,
    type: 'trip.reopened',
    message: `${req.user.name} reopened voting`,
  });

  await group.populate('owner members.user');
  res.json({ group: presentGroupDetail(group, { myRole: 'owner' }) });
});

const getActivityFeed = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const entries = await Activity.find({ group: req.group._id })
    .populate('actor')
    .sort({ createdAt: -1 })
    .limit(limit);

  res.json({ activity: entries.map(presentActivityEntry) });
});

module.exports = {
  createGroup,
  listMyGroups,
  joinGroup,
  getGroup,
  updateGroup,
  deleteGroup,
  leaveGroup,
  removeMember,
  getResults,
  finalizeTrip,
  reopenTrip,
  getActivityFeed,
};
