import { useState } from 'react';
import Button from '../ui/Button';
import { formatMoney } from '../../utils/format';

const EMPTY = { title: '', cost: '', day: '1', note: '' };

/** Day-by-day itinerary for one proposed destination. */
export default function ActivityPlanner({ suggestion, group, currentUserId, isOwner, locked, onAdd, onRemove }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setError('');
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    if (form.title.trim().length < 2) {
      setError('Give the activity a name (2+ characters)');
      return;
    }

    setSubmitting(true);
    try {
      await onAdd(suggestion, {
        title: form.title.trim(),
        note: form.note.trim(),
        cost: Number(form.cost || 0),
        day: Number(form.day || 1),
      });
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Group activities by day so the itinerary reads chronologically.
  const byDay = suggestion.activities.reduce((acc, activity) => {
    (acc[activity.day] ||= []).push(activity);
    return acc;
  }, {});
  const days = Object.keys(byDay)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="mt-2 animate-fade-in rounded-xl bg-ink-50 p-3.5">
      {suggestion.activities.length === 0 ? (
        <p className="text-xs text-ink-500">
          Nothing planned yet. Add the things this group would actually do there — it helps everyone vote.
        </p>
      ) : (
        <ul className="space-y-3">
          {days.map((day) => (
            <li key={day}>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-400">Day {day}</p>
              <ul className="space-y-1.5">
                {byDay[day].map((activity) => {
                  const canRemove = !locked && (activity.addedBy?.id === currentUserId || isOwner);
                  return (
                    <li
                      key={activity.id}
                      className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink-800">{activity.title}</p>
                        {activity.note && <p className="mt-0.5 text-xs text-ink-500">{activity.note}</p>}
                        <p className="mt-0.5 text-[11px] text-ink-400">
                          {activity.cost > 0 ? `${formatMoney(activity.cost, group.currency)} · ` : ''}
                          added by {activity.addedBy?.id === currentUserId ? 'you' : activity.addedBy?.name}
                        </p>
                      </div>
                      {canRemove && (
                        <button
                          type="button"
                          onClick={() => onRemove(suggestion, activity)}
                          className="shrink-0 rounded-md px-1 text-ink-300 transition hover:text-rose-600"
                          aria-label={`Remove ${activity.title}`}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {!locked && (
        <form onSubmit={handleAdd} className="mt-3 border-t border-ink-200 pt-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="field flex-1 py-2 text-sm"
              placeholder="Add an activity…"
              value={form.title}
              onChange={update('title')}
              aria-label="Activity name"
            />
            <div className="flex gap-2">
              <input
                className="field w-20 py-2 text-sm"
                type="number"
                min="1"
                max="60"
                value={form.day}
                onChange={update('day')}
                aria-label="Day number"
                title="Day"
              />
              <input
                className="field w-24 py-2 text-sm"
                type="number"
                min="0"
                placeholder="Cost"
                value={form.cost}
                onChange={update('cost')}
                aria-label="Activity cost"
              />
              <Button type="submit" size="sm" loading={submitting} className="shrink-0">
                Add
              </Button>
            </div>
          </div>
          {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
        </form>
      )}
    </div>
  );
}
