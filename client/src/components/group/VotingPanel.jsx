import { useState } from 'react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { formatMoney } from '../../utils/format';

/**
 * Live standings plus the organiser's finalise control. When the vote is tied,
 * finalising opens a chooser so the organiser must break the tie explicitly.
 */
export default function VotingPanel({
  group,
  suggestions,
  voting,
  isOwner,
  finalising,
  onFinalize,
  onReopen,
}) {
  const [tieOpen, setTieOpen] = useState(false);

  const ranked = [...suggestions].sort((a, b) => b.voteCount - a.voteCount || a.name.localeCompare(b.name));
  const leaders = suggestions.filter((suggestion) => voting.leaders.includes(suggestion.id));
  const yetToVote = group.members.length - voting.totalVotes;
  const isFinalized = group.status === 'finalized';

  const handleFinalizeClick = () => {
    if (voting.isTie) {
      setTieOpen(true);
      return;
    }
    onFinalize();
  };

  const handleTieChoice = async (suggestionId) => {
    await onFinalize(suggestionId);
    setTieOpen(false);
  };

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Standings</h2>
          <p className="mt-1 text-sm text-ink-600">
            {voting.totalVotes} of {group.members.length} {group.members.length === 1 ? 'member has' : 'members have'} voted
          </p>
        </div>
        {voting.isTie && !isFinalized && <Badge tone="warning">Tied</Badge>}
        {isFinalized && <Badge tone="success">Final</Badge>}
      </div>

      {ranked.length === 0 ? (
        <p className="mt-4 text-sm text-ink-500">No destinations yet — add one to start the vote.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {ranked.map((suggestion, index) => {
            const share = voting.totalVotes > 0 ? Math.round((suggestion.voteCount / voting.totalVotes) * 100) : 0;
            const isLeader = voting.leaders.includes(suggestion.id) && voting.totalVotes > 0;

            return (
              <li key={suggestion.id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-4 shrink-0 text-xs font-bold text-ink-300">{index + 1}</span>
                    <span className={`truncate ${isLeader ? 'font-semibold text-ink-900' : 'text-ink-600'}`}>
                      {suggestion.name}
                    </span>
                    {suggestion.isFinal && <span aria-label="Chosen destination">🏆</span>}
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-500">
                    {suggestion.voteCount} · {share}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      suggestion.isFinal ? 'bg-emerald-500' : isLeader ? 'bg-brand-500' : 'bg-ink-300'
                    }`}
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {!isFinalized && yetToVote > 0 && ranked.length > 0 && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Waiting on {yetToVote} {yetToVote === 1 ? 'member' : 'members'} to vote.
        </p>
      )}

      {voting.isTie && !isFinalized && (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800">
          {leaders.length} destinations are level on {voting.topCount}{' '}
          {voting.topCount === 1 ? 'vote' : 'votes'}. The organiser decides the winner.
        </p>
      )}

      {isOwner && (
        <div className="mt-5 border-t border-ink-100 pt-4">
          {isFinalized ? (
            <Button variant="secondary" className="w-full" loading={finalising} onClick={onReopen}>
              Reopen voting
            </Button>
          ) : (
            <Button
              className="w-full"
              loading={finalising}
              disabled={ranked.length === 0}
              onClick={handleFinalizeClick}
            >
              {voting.isTie ? 'Break the tie' : 'Lock in the winner'}
            </Button>
          )}
          {!isFinalized && voting.totalVotes === 0 && ranked.length > 0 && (
            <p className="mt-2 text-center text-xs text-ink-400">Nobody has voted yet — you can still pick one.</p>
          )}
        </div>
      )}

      <Modal
        open={tieOpen}
        onClose={() => setTieOpen(false)}
        title="Break the tie"
        description={`These destinations are level on ${voting.topCount} ${voting.topCount === 1 ? 'vote' : 'votes'}. Choose the one the group is going with.`}
      >
        <ul className="space-y-2">
          {leaders.map((suggestion) => (
            <li key={suggestion.id}>
              <button
                type="button"
                disabled={finalising}
                onClick={() => handleTieChoice(suggestion.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-ink-200 px-4 py-3 text-left transition hover:border-brand-400 hover:bg-brand-50 disabled:opacity-60"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink-900">{suggestion.name}</span>
                  <span className="block truncate text-xs text-ink-500">
                    {formatMoney(suggestion.totalCost, group.currency)} pp · {suggestion.voteCount}{' '}
                    {suggestion.voteCount === 1 ? 'vote' : 'votes'}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-brand-600" aria-hidden="true">
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Modal>
    </section>
  );
}
