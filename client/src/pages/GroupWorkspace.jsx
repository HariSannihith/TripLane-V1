import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { groupApi, suggestionApi } from '../api/endpoints';
import { parseApiError } from '../api/client';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Countdown from '../components/group/Countdown';
import MembersPanel from '../components/group/MembersPanel';
import VotingPanel from '../components/group/VotingPanel';
import ActivityFeed from '../components/group/ActivityFeed';
import SuggestionCard from '../components/group/SuggestionCard';
import AddSuggestionModal from '../components/group/AddSuggestionModal';
import GroupSettingsModal from '../components/group/GroupSettingsModal';
import { formatDateRange, formatMoney } from '../utils/format';

export default function GroupWorkspace() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [finalising, setFinalising] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      setFeed(await groupApi.activity(groupId, 40));
    } catch {
      // The feed is supporting detail — never block the page on it.
    } finally {
      setFeedLoading(false);
    }
  }, [groupId]);

  const load = useCallback(async () => {
    try {
      setLoadError('');
      setData(await groupApi.detail(groupId));
    } catch (error) {
      setLoadError(parseApiError(error, 'Could not load this trip.').message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
    loadFeed();
  }, [load, loadFeed]);

  /** Re-reads the group after any mutation so every panel agrees on the state. */
  const refresh = useCallback(async () => {
    await Promise.all([load(), loadFeed()]);
  }, [load, loadFeed]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" label="Loading trip" />
      </div>
    );
  }

  if (loadError || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          icon="🚫"
          title="Trip unavailable"
          description={loadError || 'This trip does not exist, or you are no longer a member.'}
          action={
            <Link to="/dashboard">
              <Button>Back to my trips</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const { group, suggestions, voting } = data;
  const isOwner = group.myRole === 'owner';
  const isFinalized = group.status === 'finalized';

  const handleVote = async (suggestion) => {
    setBusyId(suggestion.id);
    try {
      await suggestionApi.vote(group.id, suggestion.id);
      toast.success(voting.myVote ? `Vote moved to ${suggestion.name}` : `Voted for ${suggestion.name}`);
      await refresh();
    } catch (error) {
      toast.error(parseApiError(error, 'Could not record your vote.').message);
    } finally {
      setBusyId(null);
    }
  };

  const handleUnvote = async (suggestion) => {
    setBusyId(suggestion.id);
    try {
      await suggestionApi.unvote(group.id, suggestion.id);
      toast.notify('Vote withdrawn', 'info');
      await refresh();
    } catch (error) {
      toast.error(parseApiError(error, 'Could not withdraw your vote.').message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteSuggestion = async () => {
    const suggestion = pendingDelete;
    setBusyId(suggestion.id);
    try {
      await suggestionApi.remove(group.id, suggestion.id);
      toast.success(`${suggestion.name} removed`);
      setPendingDelete(null);
      await refresh();
    } catch (error) {
      toast.error(parseApiError(error, 'Could not remove that destination.').message);
    } finally {
      setBusyId(null);
    }
  };

  const handleAddActivity = async (suggestion, payload) => {
    try {
      await suggestionApi.addActivity(group.id, suggestion.id, payload);
      await refresh();
    } catch (error) {
      // Surfaced inline by the planner form.
      throw new Error(parseApiError(error, 'Could not add that activity.').message);
    }
  };

  const handleRemoveActivity = async (suggestion, activity) => {
    try {
      await suggestionApi.removeActivity(group.id, suggestion.id, activity.id);
      await refresh();
    } catch (error) {
      toast.error(parseApiError(error, 'Could not remove that activity.').message);
    }
  };

  const handleFinalize = async (suggestionId) => {
    setFinalising(true);
    try {
      const result = await groupApi.finalize(group.id, suggestionId);
      toast.success(`${result.winner.name} is locked in! 🎉`);
      await refresh();
    } catch (error) {
      const parsed = parseApiError(error, 'Could not finalise the trip.');
      // The panel opens its own tie-break chooser, so this only fires if the
      // server sees a tie the client did not know about yet.
      if (parsed.code === 'TIE') {
        toast.error('The vote is tied — pick one of the leading destinations.');
        await refresh();
      } else {
        toast.error(parsed.message);
      }
    } finally {
      setFinalising(false);
    }
  };

  const handleReopen = async () => {
    setFinalising(true);
    try {
      await groupApi.reopen(group.id);
      toast.notify('Voting reopened', 'info');
      await refresh();
    } catch (error) {
      toast.error(parseApiError(error, 'Could not reopen voting.').message);
    } finally {
      setFinalising(false);
    }
  };

  const handleRemoveMember = async (member) => {
    try {
      await groupApi.removeMember(group.id, member.id);
      toast.success(`${member.name} removed from the trip`);
      await refresh();
    } catch (error) {
      toast.error(parseApiError(error, 'Could not remove that member.').message);
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await groupApi.leave(group.id);
      toast.notify(`You left "${group.name}"`, 'info');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      toast.error(parseApiError(error, 'Could not leave the group.').message);
      setLeaving(false);
      setConfirmLeave(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-ink-500 transition hover:text-brand-700"
      >
        ← My trips
      </Link>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{group.name}</h1>
            <Badge tone={isFinalized ? 'success' : 'brand'}>{isFinalized ? 'Locked in' : 'Planning'}</Badge>
          </div>
          {group.description && <p className="mt-2 max-w-2xl text-sm text-ink-600">{group.description}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-ink-500">
            <span>📅 {formatDateRange(group.startDate, group.endDate)}</span>
            {group.budgetMax > 0 && (
              <span>
                💰 {formatMoney(group.budgetMin, group.currency)} – {formatMoney(group.budgetMax, group.currency)} pp
              </span>
            )}
            <span>👥 {group.members.length} members</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {!isFinalized && <Button onClick={() => setAddOpen(true)}>Suggest a place</Button>}
          {isOwner ? (
            <Button variant="secondary" onClick={() => setSettingsOpen(true)}>
              Settings
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmLeave(true)}>
              Leave trip
            </Button>
          )}
        </div>
      </header>

      {isFinalized && group.finalSuggestion && (
        <div className="mt-6">
          <Countdown group={group} suggestion={group.finalSuggestion} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">
              Destinations ({suggestions.length})
            </h2>
            {!isFinalized && voting.myVote && (
              <span className="text-xs text-ink-500">You can switch your vote any time.</span>
            )}
          </div>

          {suggestions.length === 0 ? (
            <EmptyState
              icon="📍"
              title="No destinations yet"
              description="Suggest the first place — search a real destination, add a cost estimate and let the group vote."
              action={!isFinalized && <Button onClick={() => setAddOpen(true)}>Suggest a place</Button>}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  group={group}
                  currentUserId={user.id}
                  isOwner={isOwner}
                  totalVotes={voting.totalVotes}
                  votingLocked={isFinalized}
                  busy={busyId === suggestion.id}
                  onVote={handleVote}
                  onUnvote={handleUnvote}
                  onDelete={setPendingDelete}
                  onAddActivity={handleAddActivity}
                  onRemoveActivity={handleRemoveActivity}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <VotingPanel
            group={group}
            suggestions={suggestions}
            voting={voting}
            isOwner={isOwner}
            finalising={finalising}
            onFinalize={handleFinalize}
            onReopen={handleReopen}
          />
          <MembersPanel
            group={group}
            currentUserId={user.id}
            isOwner={isOwner}
            votedUserIds={voting.voterIds}
            onRemoveMember={handleRemoveMember}
          />
          <ActivityFeed entries={feed} loading={feedLoading} />
        </aside>
      </div>

      <AddSuggestionModal open={addOpen} onClose={() => setAddOpen(false)} group={group} onCreated={refresh} />

      {isOwner && (
        <GroupSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          group={group}
          onUpdated={refresh}
          onDeleted={() => navigate('/dashboard', { replace: true })}
        />
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteSuggestion}
        loading={busyId === pendingDelete?.id}
        title={`Remove ${pendingDelete?.name}?`}
        message="Any votes cast for this destination will be discarded."
        confirmLabel="Remove destination"
      />

      <ConfirmDialog
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        onConfirm={handleLeave}
        loading={leaving}
        title={`Leave "${group.name}"?`}
        message="You will lose access to this trip and your vote will be discarded. You can rejoin with the invite code."
        confirmLabel="Leave trip"
      />
    </div>
  );
}
