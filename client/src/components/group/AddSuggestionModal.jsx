import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import PlaceSearch from './PlaceSearch';
import { suggestionApi } from '../../api/endpoints';
import { parseApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { formatMoney, toDateInputValue } from '../../utils/format';

const EMPTY = { name: '', address: '', estimatedCost: '', startDate: '', endDate: '', notes: '' };

export default function AddSuggestionModal({ open, onClose, group, onCreated }) {
  const toast = useToast();
  const [place, setPlace] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [manual, setManual] = useState(false);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  const close = () => {
    setPlace(null);
    setForm(EMPTY);
    setErrors({});
    setFormError('');
    setManual(false);
    onClose();
  };

  const handleSelectPlace = (selected) => {
    setPlace(selected);
    // Prefill from the place, and seed dates from the group's travel window.
    setForm((current) => ({
      ...current,
      name: selected.name,
      address: selected.address,
      startDate: current.startDate || toDateInputValue(group.startDate),
      endDate: current.endDate || toDateInputValue(group.endDate),
    }));
    setErrors({});
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Pick a place or type a destination name';
    if (form.estimatedCost === '' || Number.isNaN(Number(form.estimatedCost))) {
      next.estimatedCost = 'Enter an estimated cost per person';
    } else if (Number(form.estimatedCost) < 0) {
      next.estimatedCost = 'Cost cannot be negative';
    }
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      next.endDate = 'The return date must be on or after the departure date';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const suggestion = await suggestionApi.create(group.id, {
        placeId: place?.placeId || null,
        name: form.name.trim(),
        address: form.address.trim(),
        location: place?.location || {},
        photoRef: place?.photoRef || null,
        rating: place?.rating ?? null,
        estimatedCost: Number(form.estimatedCost),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        notes: form.notes.trim(),
      });
      toast.success(`${suggestion.name} added to the shortlist`);
      onCreated(suggestion);
      close();
    } catch (error) {
      const parsed = parseApiError(error, 'Could not add that destination.');
      setErrors(parsed.details);
      setFormError(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  const overBudget =
    group.budgetMax > 0 && Number(form.estimatedCost || 0) > group.budgetMax
      ? `Above the group's ${formatMoney(group.budgetMax, group.currency)} cap — you can still suggest it.`
      : null;

  return (
    <Modal
      open={open}
      onClose={close}
      title="Suggest a destination"
      description="Search a real place, or add one by hand."
      size="lg"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {formError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError}
          </div>
        )}

        {!manual ? (
          <>
            <PlaceSearch onSelect={handleSelectPlace} selected={place} />
            <button
              type="button"
              onClick={() => setManual(true)}
              className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              Can’t find it? Enter the destination manually
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setManual(false)}
            className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            ← Back to place search
          </button>
        )}

        {(place || manual) && (
          <div className="space-y-4 border-t border-ink-100 pt-5">
            <Input label="Destination name" value={form.name} onChange={update('name')} error={errors.name} />
            <Input
              label="Location"
              placeholder="City, Country"
              value={form.address}
              onChange={update('address')}
              error={errors.address}
            />

            <Input
              label={`Estimated cost per person (${group.currency})`}
              type="number"
              min="0"
              placeholder="1200"
              value={form.estimatedCost}
              onChange={update('estimatedCost')}
              error={errors.estimatedCost}
              hint={
                overBudget ||
                (group.budgetMax > 0
                  ? `Group budget: ${formatMoney(group.budgetMin, group.currency)} – ${formatMoney(group.budgetMax, group.currency)}`
                  : 'Flights, stay and the basics.')
              }
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Departure" type="date" value={form.startDate} onChange={update('startDate')} error={errors.startDate} />
              <Input label="Return" type="date" value={form.endDate} onChange={update('endDate')} error={errors.endDate} />
            </div>

            <Input
              as="textarea"
              label="Why this place?"
              placeholder="Autumn colours are peak in November, and flights are cheap midweek…"
              value={form.notes}
              onChange={update('notes')}
              error={errors.notes}
            />
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} disabled={!place && !manual}>
            Add to shortlist
          </Button>
        </div>
      </form>
    </Modal>
  );
}
