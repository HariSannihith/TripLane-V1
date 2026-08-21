import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import ConfirmDialog from '../ui/ConfirmDialog';
import { groupApi } from '../../api/endpoints';
import { parseApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { toDateInputValue } from '../../utils/format';
import { CURRENCIES, currencyLabel } from '../../utils/currencies';

/** Organiser-only trip settings, including the destructive delete action. */
export default function GroupSettingsModal({ open, onClose, group, onUpdated, onDeleted }) {
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Reset the draft whenever the dialog opens so stale edits never persist.
  useEffect(() => {
    if (!open) return;
    setForm({
      name: group.name,
      description: group.description || '',
      startDate: toDateInputValue(group.startDate),
      endDate: toDateInputValue(group.endDate),
      budgetMin: group.budgetMin || '',
      budgetMax: group.budgetMax || '',
      currency: group.currency,
    });
    setErrors({});
    setFormError('');
  }, [open, group]);

  if (!form) return null;

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 3) next.name = 'Trip name must be at least 3 characters';
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      next.endDate = 'The end date must be on or after the start date';
    }
    const min = Number(form.budgetMin || 0);
    const max = Number(form.budgetMax || 0);
    if (max > 0 && min > max) next.budgetMin = 'The minimum cannot exceed the maximum';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const updated = await groupApi.update(group.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        budgetMin: Number(form.budgetMin || 0),
        budgetMax: Number(form.budgetMax || 0),
        currency: form.currency,
      });
      toast.success('Trip details updated');
      onUpdated(updated);
      onClose();
    } catch (error) {
      const parsed = parseApiError(error, 'Could not save your changes.');
      setErrors(parsed.details);
      setFormError(parsed.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await groupApi.remove(group.id);
      toast.success('Trip deleted');
      onDeleted();
    } catch (error) {
      toast.error(parseApiError(error, 'Could not delete the trip.').message);
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Trip settings" description="Only the organiser can change these.">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {formError && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {formError}
            </div>
          )}

          <Input label="Trip name" value={form.name} onChange={update('name')} error={errors.name} />
          <Input
            as="textarea"
            label="Description"
            value={form.description}
            onChange={update('description')}
            error={errors.description}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Start date" type="date" value={form.startDate} onChange={update('startDate')} error={errors.startDate} />
            <Input label="End date" type="date" value={form.endDate} onChange={update('endDate')} error={errors.endDate} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Min budget" type="number" min="0" value={form.budgetMin} onChange={update('budgetMin')} error={errors.budgetMin} />
            <Input label="Max budget" type="number" min="0" value={form.budgetMax} onChange={update('budgetMax')} error={errors.budgetMax} />
          </div>

          <Input
            as="select"
            label="Currency"
            value={form.currency}
            onChange={update('currency')}
            error={errors.currency}
            hint={
              form.currency !== group.currency
                ? 'Existing amounts keep their numbers — they are relabelled, not converted.'
                : 'Every cost in this trip is shown in this currency.'
            }
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currencyLabel(currency)}
              </option>
            ))}
          </Input>

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </div>
        </form>

        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">Delete this trip</p>
          <p className="mt-1 text-xs text-rose-700">
            Removes the group, every suggestion, vote and the activity history. This cannot be undone.
          </p>
          <Button variant="danger" size="sm" className="mt-3" onClick={() => setConfirmDelete(true)}>
            Delete trip
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        loading={deleting}
        title={`Delete "${group.name}"?`}
        message="Every destination, vote and activity entry will be permanently removed for all members."
        confirmLabel="Delete permanently"
      />
    </>
  );
}
