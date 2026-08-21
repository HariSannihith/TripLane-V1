import { useState } from 'react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';
import ActivityPlanner from './ActivityPlanner';
import { placesApi } from '../../api/endpoints';
import { formatDateRange, formatMoney, nightsBetween } from '../../utils/format';

/** Budget verdict for the group's per-person range. */
function budgetStatus(total, group) {
  if (!group.budgetMax || group.budgetMax <= 0) return null;
  if (total > group.budgetMax) return { tone: 'danger', label: 'Over budget' };
  if (group.budgetMin > 0 && total < group.budgetMin) return { tone: 'warning', label: 'Under budget' };
  return { tone: 'success', label: 'Within budget' };
}

export default function SuggestionCard({
  suggestion,
  group,
  currentUserId,
  isOwner,
  totalVotes,
  votingLocked,
  busy,
  onVote,
  onUnvote,
  onDelete,
  onAddActivity,
  onRemoveActivity,
}) {
  const [expanded, setExpanded] = useState(false);

  const photo = placesApi.photoUrl(suggestion.photoRef, 640);
  const isAuthor = suggestion.createdBy?.id === currentUserId;
  const canManage = isAuthor || isOwner;
  const share = totalVotes > 0 ? Math.round((suggestion.voteCount / totalVotes) * 100) : 0;
  const budget = budgetStatus(suggestion.totalCost, group);
  const nights = nightsBetween(suggestion.startDate, suggestion.endDate);

  return (
    <article
      className={`card overflow-hidden transition ${
        suggestion.isFinal ? 'ring-2 ring-emerald-500' : suggestion.votedByMe ? 'ring-2 ring-brand-500' : ''
      }`}
    >
      <div className="relative h-32 bg-gradient-to-br from-brand-500 to-indigo-700 sm:h-36">
        {photo && <img src={photo} alt={suggestion.name} className="h-full w-full object-cover" loading="lazy" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/70 to-transparent" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-3 p-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-white">{suggestion.name}</h3>
            {suggestion.address && <p className="truncate text-xs text-white/80">{suggestion.address}</p>}
          </div>
          {suggestion.rating != null && (
            <span className="chip shrink-0 bg-white/90 text-amber-700">★ {suggestion.rating.toFixed(1)}</span>
          )}
        </div>
        {suggestion.isFinal && (
          <span className="absolute right-3 top-3 chip bg-emerald-500 text-white">🏆 Chosen</span>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">💰 {formatMoney(suggestion.totalCost, group.currency)} pp</Badge>
          {budget && <Badge tone={budget.tone}>{budget.label}</Badge>}
          {nights !== null && <Badge tone="neutral">🌙 {nights} nights</Badge>}
        </div>

        <p className="mt-3 text-sm text-ink-600">📅 {formatDateRange(suggestion.startDate, suggestion.endDate)}</p>

        {suggestion.notes && (
          <p className="mt-2.5 rounded-xl bg-ink-50 px-3 py-2.5 text-sm leading-relaxed text-ink-600">
            {suggestion.notes}
          </p>
        )}

        {suggestion.activityCost > 0 && (
          <p className="mt-2 text-xs text-ink-500">
            {formatMoney(suggestion.estimatedCost, group.currency)} base +{' '}
            {formatMoney(suggestion.activityCost, group.currency)} in planned activities
          </p>
        )}

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink-500">
            <span>
              {suggestion.voteCount} {suggestion.voteCount === 1 ? 'vote' : 'votes'}
            </span>
            <span>{share}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-ink-100" role="presentation">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                suggestion.isFinal ? 'bg-emerald-500' : 'bg-brand-500'
              }`}
              style={{ width: `${share}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
          <div className="flex min-w-0 items-center gap-2 text-xs text-ink-500">
            <Avatar user={suggestion.createdBy} size="xs" />
            <span className="truncate">Suggested by {isAuthor ? 'you' : suggestion.createdBy?.name}</span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {canManage && !votingLocked && (
              <button
                type="button"
                onClick={() => onDelete(suggestion)}
                className="rounded-lg p-1.5 text-ink-400 transition hover:bg-rose-50 hover:text-rose-600"
                aria-label={`Remove ${suggestion.name}`}
                title="Remove destination"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 6h12M8 6V4h4v2m-6 0v10h8V6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}

            {suggestion.votedByMe ? (
              <Button
                size="sm"
                variant="subtle"
                loading={busy}
                disabled={votingLocked}
                onClick={() => onUnvote(suggestion)}
              >
                ✓ Your vote
              </Button>
            ) : (
              <Button size="sm" loading={busy} disabled={votingLocked} onClick={() => onVote(suggestion)}>
                Vote
              </Button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-3 flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-xs font-medium text-ink-500 transition hover:text-brand-700"
          aria-expanded={expanded}
        >
          <span>
            {suggestion.activities.length > 0
              ? `${suggestion.activities.length} planned ${suggestion.activities.length === 1 ? 'activity' : 'activities'}`
              : 'Plan activities'}
          </span>
          <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        </button>

        {expanded && (
          <ActivityPlanner
            suggestion={suggestion}
            group={group}
            currentUserId={currentUserId}
            isOwner={isOwner}
            locked={votingLocked}
            onAdd={onAddActivity}
            onRemove={onRemoveActivity}
          />
        )}
      </div>
    </article>
  );
}
