import Avatar from '../ui/Avatar';
import Spinner from '../ui/Spinner';
import { relativeTime } from '../../utils/format';

const ICONS = {
  'group.created': '🎉',
  'group.updated': '✏️',
  'member.joined': '👋',
  'member.left': '🚪',
  'member.removed': '🚫',
  'suggestion.created': '📍',
  'suggestion.updated': '✏️',
  'suggestion.deleted': '🗑️',
  'plan.activity.added': '🎟️',
  'plan.activity.removed': '✂️',
  'vote.cast': '🗳️',
  'vote.changed': '🔄',
  'vote.retracted': '↩️',
  'trip.finalized': '🏆',
  'trip.reopened': '🔓',
};

export default function ActivityFeed({ entries, loading }) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Activity</h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner label="Loading activity" />
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-4 text-sm text-ink-500">Nothing has happened yet.</p>
      ) : (
        <ul className="mt-4 max-h-[26rem] space-y-4 overflow-y-auto pr-1 scroll-slim">
          {entries.map((entry) => (
            <li key={entry.id} className="flex gap-3">
              <div className="relative flex flex-col items-center">
                <Avatar user={entry.actor} size="xs" />
                <span className="mt-1 w-px flex-1 bg-ink-100" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <p className="text-sm leading-snug text-ink-700">
                  <span className="mr-1" aria-hidden="true">
                    {ICONS[entry.type] || '•'}
                  </span>
                  {entry.message}
                </p>
                <p className="mt-0.5 text-xs text-ink-400">{relativeTime(entry.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
