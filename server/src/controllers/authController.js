'use strict';

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');

const AVATAR_COLORS = ['sky', 'violet', 'emerald', 'amber', 'rose', 'indigo', 'teal'];

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw ApiError.conflict('An account with that email already exists');

  const user = await User.create({
    name,
    email,
    password,
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
  });

  res.status(201).json({ token: signToken(user), user: user.toPublicJSON() });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // `password` is select:false on the schema, so ask for it explicitly.
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  // Same message for unknown email and wrong password: do not reveal which
  // addresses have accounts.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password');
  }

  res.json({ token: signToken(user), user: user.toPublicJSON() });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toPublicJSON() });
});

module.exports = { register, login, me };
