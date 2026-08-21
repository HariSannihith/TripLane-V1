'use strict';

const mongoose = require('mongoose');
const Group = require('../models/Group');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Loads the group named by :groupId and asserts the caller is a member.
 * Non-members get 404 rather than 403 so group existence is not leaked.
 */
const requireGroupMember = asyncHandler(async (req, res, next) => {
  const { groupId } = req.params;
  if (!mongoose.isValidObjectId(groupId)) throw ApiError.notFound('Group not found');

  const group = await Group.findById(groupId);
  if (!group) throw ApiError.notFound('Group not found');
  if (!group.isMember(req.user._id)) throw ApiError.notFound('Group not found');

  req.group = group;
  req.isGroupOwner = group.isOwner(req.user._id);
  return next();
});

/** Must run after requireGroupMember. */
const requireGroupOwner = (req, res, next) => {
  if (!req.isGroupOwner) {
    return next(ApiError.forbidden('Only the group organiser can do that'));
  }
  return next();
};

module.exports = { requireGroupMember, requireGroupOwner };
