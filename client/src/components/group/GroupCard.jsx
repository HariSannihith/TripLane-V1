import { Link } from 'react-router-dom';
import Badge from '../ui/Badge';
import { formatDateRange, formatMoney } from '../../utils/format';

export default function GroupCard({ group }) {
  const isFinalized = group.status === 'finalized';

  return (
    <Link
      to={`/groups/${group.id}`}
      className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 text-base font-semibold text-ink-900 group-hover:text-brand-700">{group.name}</h3>
        <Badge tone={isFinalized ? 'success' : 'brand'}>{isFinalized ? 'Locked in' : 'Planning'}</Badge>
      </div>

      {group.description && <p className="mt-2 line-clamp-2 text-sm text-ink-500">{group.description}</p>}

      <dl className="mt-4 space-y-1.5 text-sm text-ink-600">
        <div className="flex items-center gap-2">
          <span aria-hidden="true">📅</span>
          <dd>{formatDateRange(group.startDate, group.endDate)}</dd>
        </div>
        {group.budgetMax > 0 && (
          <div className="flex items-center gap-2">
            <span aria-hidden="true">💰</span>
            <dd>
              {formatMoney(group.budgetMin, group.currency)} – {formatMoney(group.budgetMax, group.currency)} per person
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4 text-xs text-ink-500">
        <span className="flex items-center gap-3">
          <span>
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {group.suggestionCount ?? 0} {group.suggestionCount === 1 ? 'idea' : 'ideas'}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {group.myRole === 'owner' && <Badge tone="neutral">Organiser</Badge>}
          {!isFinalized && !group.hasVoted && group.suggestionCount > 0 && (
            <Badge tone="warning">Vote pending</Badge>
          )}
        </span>
      </div>
    </Link>
  );
}
