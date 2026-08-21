'use strict';

/**
 * Shapes Mongoose documents into the JSON contract the client consumes. Keeping
 * this in one place means every endpoint returns the same field names.
 */

function presentUser(user) {
  if (!user) return null;
  if (!user.name) return { id: String(user), name: 'Unknown member', email: null, avatarColor: 'sky' };
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatarColor: user.avatarColor || 'sky',
  };
}

function presentMember(member) {
  return {
    user: presentUser(member.user),
    role: member.role,
    joinedAt: member.joinedAt,
  };
}

function presentGroupSummary(group, extra = {}) {
  return {
    id: group._id,
    name: group.name,
    description: group.description,
    inviteCode: group.inviteCode,
    owner: presentUser(group.owner),
    memberCount: group.members.length,
    startDate: group.startDate,
    endDate: group.endDate,
    budgetMin: group.budgetMin,
    budgetMax: group.budgetMax,
    currency: group.currency,
    status: group.status,
    createdAt: group.createdAt,
    ...extra,
  };
}

function presentGroupDetail(group, extra = {}) {
  return {
    ...presentGroupSummary(group),
    members: group.members.map(presentMember),
    finalSuggestion: group.finalSuggestion && group.finalSuggestion.name ? presentSuggestion(group.finalSuggestion) : null,
    finalizedAt: group.finalizedAt,
    ...extra,
  };
}

function presentPlannedActivity(activity) {
  return {
    id: activity._id,
    title: activity.title,
    note: activity.note,
    cost: activity.cost,
    day: activity.day,
    addedBy: presentUser(activity.addedBy),
    createdAt: activity.createdAt,
  };
}

function presentSuggestion(suggestion, { voteCount = 0, votedByMe = false, isFinal = false } = {}) {
  const activities = (suggestion.activities || []).map(presentPlannedActivity);
  const activityCost = activities.reduce((sum, activity) => sum + (activity.cost || 0), 0);

  return {
    id: suggestion._id,
    group: suggestion.group,
    createdBy: presentUser(suggestion.createdBy),
    placeId: suggestion.placeId,
    name: suggestion.name,
    address: suggestion.address,
    location: suggestion.location,
    photoRef: suggestion.photoRef,
    rating: suggestion.rating,
    estimatedCost: suggestion.estimatedCost,
    activityCost,
    totalCost: (suggestion.estimatedCost || 0) + activityCost,
    startDate: suggestion.startDate,
    endDate: suggestion.endDate,
    notes: suggestion.notes,
    activities,
    voteCount,
    votedByMe,
    isFinal,
    createdAt: suggestion.createdAt,
  };
}

function presentActivityEntry(entry) {
  return {
    id: entry._id,
    type: entry.type,
    message: entry.message,
    actor: presentUser(entry.actor),
    meta: entry.meta || {},
    createdAt: entry.createdAt,
  };
}

module.exports = {
  presentUser,
  presentMember,
  presentGroupSummary,
  presentGroupDetail,
  presentSuggestion,
  presentActivityEntry,
};
