import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { groupApi } from '../api/endpoints';
import { parseApiError } from '../api/client';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import GroupCard from '../components/group/GroupCard';
import CreateGroupModal from '../components/group/CreateGroupModal';
import JoinGroupModal from '../components/group/JoinGroupModal';

const FILTERS = [
  { key: 'all', label: 'All trips' },
  { key: 'planning', label: 'Planning' },
  { key: 'finalized', label: 'Locked in' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      setGroups(await groupApi.list());
    } catch (err) {
      setError(parseApiError(err, 'Could not load your trips.').message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (filter === 'all' ? groups : groups.filter((group) => group.status === filter)),
    [groups, filter]
  );

  const stats = useMemo(
    () => ({
      total: groups.length,
      planning: groups.filter((group) => group.status === 'planning').length,
      finalized: groups.filter((group) => group.status === 'finalized').length,
      awaitingVote: groups.filter((group) => group.status === 'planning' && !group.hasVoted).length,
    }),
    [groups]
  );

  const handleCreated = (group) => {
    setGroups((current) => [group, ...current]);
  };

  const handleJoined = () => {
    // Re-fetch so counts and roles come from the server rather than being guessed.
    load().catch(() => toast.error('Joined, but the list could not refresh.'));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            Hey {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="mt-1.5 text-sm text-ink-500">
            {stats.total === 0
              ? 'Create your first trip or join one with an invite code.'
              : stats.awaitingVote > 0
                ? `You have ${stats.awaitingVote} trip${stats.awaitingVote === 1 ? '' : 's'} waiting on your vote.`
                : 'All caught up — nothing is waiting on you.'}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={() => setJoinOpen(true)}>
            Join with code
          </Button>
          <Button onClick={() => setCreateOpen(true)}>New trip</Button>
        </div>
      </div>

      {groups.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Trips', value: stats.total, icon: '🧳' },
            { label: 'Planning', value: stats.planning, icon: '🗳️' },
            { label: 'Locked in', value: stats.finalized, icon: '✅' },
            { label: 'Need your vote', value: stats.awaitingVote, icon: '⏰' },
          ].map((stat) => (
            <div key={stat.label} className="card p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{stat.label}</p>
              <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold text-ink-900">
                {stat.value}
                <span className="text-base" aria-hidden="true">
                  {stat.icon}
                </span>
              </p>
            </div>
          ))}
        </div>
      )}

      {groups.length > 0 && (
        <div className="mt-8 flex gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                filter === option.key ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="h-8 w-8" label="Loading your trips" />
          </div>
        ) : error ? (
          <EmptyState
            icon="⚠️"
            title="Could not load your trips"
            description={error}
            action={<Button onClick={load}>Try again</Button>}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={groups.length === 0 ? '🧳' : '🔍'}
            title={groups.length === 0 ? 'No trips yet' : 'Nothing in this filter'}
            description={
              groups.length === 0
                ? 'Start a group, share the invite code, and let everyone pitch a destination.'
                : 'Try a different filter to see your other trips.'
            }
            action={
              groups.length === 0 ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => setCreateOpen(true)}>Create a trip</Button>
                  <Button variant="secondary" onClick={() => setJoinOpen(true)}>
                    Join with a code
                  </Button>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setFilter('all')}>
                  Show all trips
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </div>

      <CreateGroupModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />
      <JoinGroupModal open={joinOpen} onClose={() => setJoinOpen(false)} onJoined={handleJoined} />
    </div>
  );
}
