import { useState } from 'react';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useToast } from '../../context/ToastContext';

export default function MembersPanel({ group, currentUserId, isOwner, votedUserIds, onRemoveMember }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [removing, setRemoving] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is blocked on insecure origins — the code is on screen anyway.
      toast.notify(`Invite code: ${group.inviteCode}`, 'info');
    }
  };

  const confirmRemoval = async () => {
    setRemoving(true);
    try {
      await onRemoveMember(pendingRemoval);
      setPendingRemoval(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <section className="card p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">
        Members ({group.members.length})
      </h2>

      <ul className="mt-4 space-y-2.5">
        {group.members.map(({ user, role }) => {
          const isYou = user.id === currentUserId;
          const hasVoted = votedUserIds ? votedUserIds.includes(user.id) : null;

          return (
            <li key={user.id} className="flex items-center gap-3">
              <Avatar user={user} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">
                  {user.name} {isYou && <span className="text-ink-400">(you)</span>}
                </p>
                <p className="truncate text-xs text-ink-500">{user.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {role === 'owner' && <Badge tone="brand">Organiser</Badge>}
                {hasVoted === false && group.status === 'planning' && <Badge tone="warning">No vote</Badge>}
                {isOwner && role !== 'owner' && (
                  <button
                    type="button"
                    onClick={() => setPendingRemoval(user)}
                    className="rounded-md px-1.5 py-1 text-ink-300 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Remove ${user.name}`}
                    title="Remove member"
                  >
                    ×
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 rounded-xl border border-dashed border-brand-300 bg-brand-50/60 p-4">
        <p className="text-xs font-medium text-brand-800">Invite code</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 rounded-lg bg-white px-3 py-2 text-center text-lg font-bold tracking-[0.3em] text-ink-900">
            {group.inviteCode}
          </code>
          <Button size="sm" variant="secondary" onClick={copyCode} className="shrink-0">
            {copied ? '✓ Copied' : 'Copy'}
          </Button>
        </div>
        <p className="mt-2 text-xs text-brand-700">Share this with anyone who should help plan.</p>
      </div>

      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        onClose={() => setPendingRemoval(null)}
        onConfirm={confirmRemoval}
        loading={removing}
        title={`Remove ${pendingRemoval?.name}?`}
        message="They will lose access to this trip immediately, and their vote will be discarded. They can rejoin with the invite code."
        confirmLabel="Remove member"
      />
    </section>
  );
}
