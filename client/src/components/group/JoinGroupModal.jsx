import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { groupApi } from '../../api/endpoints';
import { parseApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';

export default function JoinGroupModal({ open, onClose, onJoined }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const close = () => {
    setCode('');
    setError('');
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Invite codes are exactly 6 characters');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const group = await groupApi.join(trimmed);
      toast.success(`You joined "${group.name}"`);
      onJoined(group);
      close();
      navigate(`/groups/${group.id}`);
    } catch (err) {
      const parsed = parseApiError(err, 'Could not join that group.');
      // Already a member? Take them there instead of showing a dead end.
      if (parsed.code === 'ALREADY_MEMBER' && parsed.details?.groupId) {
        toast.notify('You are already in that group.', 'info');
        close();
        navigate(`/groups/${parsed.details.groupId}`);
        return;
      }
      setError(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="Join a trip" description="Enter the invite code a friend shared with you." size="sm">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Invite code"
          placeholder="ABC123"
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            setError('');
          }}
          error={error}
          maxLength={6}
          autoFocus
          className="[&_input]:text-center [&_input]:text-lg [&_input]:font-bold [&_input]:tracking-[0.35em]"
        />

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Join trip
          </Button>
        </div>
      </form>
    </Modal>
  );
}
