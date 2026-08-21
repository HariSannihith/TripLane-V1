'use strict';

const Vote = require('../models/Vote');

/**
 * Aggregates the votes of a group into a tally keyed by suggestion id, plus the
 * current leader(s). A tie is any state where two or more suggestions share the
 * top count — the group cannot be finalised on votes alone until the organiser
 * breaks it.
 */
async function tallyGroupVotes(groupId) {
  const rows = await Vote.aggregate([
    { $match: { group: groupId } },
    { $group: { _id: '$suggestion', count: { $sum: 1 } } },
  ]);

  const counts = {};
  rows.forEach((row) => {
    counts[String(row._id)] = row.count;
  });

  const totalVotes = rows.reduce((sum, row) => sum + row.count, 0);
  const topCount = rows.reduce((max, row) => Math.max(max, row.count), 0);
  const leaders = rows.filter((row) => row.count === topCount && topCount > 0).map((row) => String(row._id));

  return {
    counts,
    totalVotes,
    topCount,
    leaders,
    isTie: leaders.length > 1,
  };
}

/** The suggestion the calling user currently backs in this group, if any. */
async function getUserVote(groupId, userId) {
  const vote = await Vote.findOne({ group: groupId, user: userId });
  return vote ? String(vote.suggestion) : null;
}

/**
 * Who has voted — not what they voted for. Lets the UI nudge members who have
 * not weighed in yet without turning the ballot public.
 */
async function getVoterIds(groupId) {
  const ids = await Vote.find({ group: groupId }).distinct('user');
  return ids.map(String);
}

module.exports = { tallyGroupVotes, getUserVote, getVoterIds };
