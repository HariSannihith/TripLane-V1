'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { requireGroupMember, requireGroupOwner } = require('../middleware/groupAccess');
const groupController = require('../controllers/groupController');
const suggestionController = require('../controllers/suggestionController');
const voteController = require('../controllers/voteController');
const { CODE_LENGTH } = require('../utils/inviteCode');
const { SUPPORTED_CURRENCY_CODES } = require('../utils/currencies');

const router = express.Router();

// Every group route requires a signed-in user.
router.use(requireAuth);

/**
 * express-validator v7 expects `optional({ values: 'undefined' | 'null' | 'falsy' })`;
 * the older `{ nullable, checkFalsy }` flags are accepted but silently ignored.
 * `values: 'falsy'` is what lets a client send '' or null to mean "not set".
 *
 * The rules are built by a factory rather than reused directly because calling
 * `.optional()` again on a finished chain resets its options — which would
 * quietly re-break null handling on the PATCH routes.
 */
const groupBodyRules = ({ partial = false } = {}) => {
  const name = body('name').trim().isLength({ min: 3, max: 80 }).withMessage('Trip name must be 3-80 characters');

  return [
    partial ? name.optional() : name,
    body('description').optional({ values: 'null' }).trim().isLength({ max: 500 }).withMessage('Description is too long'),
    body('startDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid start date'),
    body('endDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid end date'),
    body('budgetMin').optional({ values: 'falsy' }).isFloat({ min: 0, max: 1000000 }).withMessage('Budget must be a positive number'),
    body('budgetMax').optional({ values: 'falsy' }).isFloat({ min: 0, max: 1000000 }).withMessage('Budget must be a positive number'),
    body('currency')
      .optional({ values: 'falsy' })
      .customSanitizer((value) => String(value || '').trim().toUpperCase())
      .isIn(SUPPORTED_CURRENCY_CODES)
      .withMessage('Choose a currency from the supported list'),
  ];
};

const suggestionBodyRules = ({ partial = false } = {}) => {
  const name = body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Destination name must be 2-120 characters');
  const cost = body('estimatedCost').isFloat({ min: 0, max: 1000000 }).withMessage('Enter an estimated cost per person');

  return [
    partial ? name.optional() : name,
    partial ? cost.optional() : cost,
    body('address').optional({ values: 'null' }).trim().isLength({ max: 300 }),
    body('startDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid departure date'),
    body('endDate').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid return date'),
    body('notes').optional({ values: 'null' }).trim().isLength({ max: 1000 }).withMessage('Notes are too long'),
    body('rating').optional({ values: 'null' }).isFloat({ min: 0, max: 5 }),
  ];
};

/* ------------------------------- collections ------------------------------ */

router.route('/').get(groupController.listMyGroups).post(groupBodyRules(), validate, groupController.createGroup);

router.post(
  '/join',
  [
    body('inviteCode')
      .trim()
      .isLength({ min: CODE_LENGTH, max: CODE_LENGTH })
      .withMessage(`Invite codes are ${CODE_LENGTH} characters`),
  ],
  validate,
  groupController.joinGroup
);

/* ------------------------------ single group ------------------------------ */

router
  .route('/:groupId')
  .get(requireGroupMember, groupController.getGroup)
  .patch(requireGroupMember, requireGroupOwner, groupBodyRules({ partial: true }), validate, groupController.updateGroup)
  .delete(requireGroupMember, requireGroupOwner, groupController.deleteGroup);

router.post('/:groupId/leave', requireGroupMember, groupController.leaveGroup);
router.delete('/:groupId/members/:userId', requireGroupMember, requireGroupOwner, groupController.removeMember);

router.get('/:groupId/activity', requireGroupMember, [query('limit').optional().isInt({ min: 1, max: 100 })], validate, groupController.getActivityFeed);

/* -------------------------------- decisions ------------------------------- */

router.get('/:groupId/results', requireGroupMember, groupController.getResults);
router.post(
  '/:groupId/finalize',
  requireGroupMember,
  requireGroupOwner,
  [body('suggestionId').optional().isMongoId().withMessage('Unknown destination')],
  validate,
  groupController.finalizeTrip
);
router.post('/:groupId/reopen', requireGroupMember, requireGroupOwner, groupController.reopenTrip);

/* ------------------------------- suggestions ------------------------------ */

router
  .route('/:groupId/suggestions')
  .get(requireGroupMember, suggestionController.listSuggestions)
  .post(requireGroupMember, suggestionBodyRules(), validate, suggestionController.createSuggestion);

router
  .route('/:groupId/suggestions/:suggestionId')
  .patch(
    requireGroupMember,
    [
      param('suggestionId').isMongoId().withMessage('Unknown destination'),
      ...suggestionBodyRules({ partial: true }),
    ],
    validate,
    suggestionController.updateSuggestion
  )
  .delete(
    requireGroupMember,
    [param('suggestionId').isMongoId().withMessage('Unknown destination')],
    validate,
    suggestionController.deleteSuggestion
  );

router.post(
  '/:groupId/suggestions/:suggestionId/activities',
  requireGroupMember,
  [
    param('suggestionId').isMongoId().withMessage('Unknown destination'),
    body('title').trim().isLength({ min: 2, max: 120 }).withMessage('Activity name must be 2-120 characters'),
    body('note').optional().trim().isLength({ max: 300 }),
    body('cost').optional().isFloat({ min: 0, max: 100000 }).withMessage('Cost must be a positive number'),
    body('day').optional().isInt({ min: 1, max: 60 }).withMessage('Day must be between 1 and 60'),
  ],
  validate,
  suggestionController.addPlannedActivity
);

router.delete(
  '/:groupId/suggestions/:suggestionId/activities/:activityId',
  requireGroupMember,
  [param('suggestionId').isMongoId(), param('activityId').isMongoId()],
  validate,
  suggestionController.removePlannedActivity
);

/* ---------------------------------- votes --------------------------------- */

router
  .route('/:groupId/suggestions/:suggestionId/vote')
  .post(requireGroupMember, [param('suggestionId').isMongoId().withMessage('Unknown destination')], validate, voteController.castVote)
  .delete(requireGroupMember, [param('suggestionId').isMongoId().withMessage('Unknown destination')], validate, voteController.retractVote);

module.exports = router;
