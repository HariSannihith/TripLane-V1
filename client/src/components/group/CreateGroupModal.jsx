import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { groupApi } from '../../api/endpoints';
import { parseApiError } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { CURRENCIES, currencyLabel, guessCurrency } from '../../utils/currencies';

const emptyForm = () => ({
  name: '',
  description: '',
  startDate: '',
  endDate: '',
  budgetMin: '',
  budgetMax: '',
  // Start from the currency the user's locale implies rather than dollars.
  currency: guessCurrency(),
});

export default function CreateGroupModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  const close = () => {
    setForm(emptyForm());
    setErrors({});
    setFormError('');
    onClose();
  };

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 3) next.name = 'Give the trip a name (3+ characters)';
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      next.endDate = 'The end date must be on or after the start date';
    }
    const min = Number(form.budgetMin || 0);
    const max = Number(form.budgetMax || 0);
    if (min < 0 || max < 0) next.budgetMin = 'Budgets cannot be negative';
    else if (max > 0 && min > max) next.budgetMin = 'The minimum cannot exceed the maximum';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const group = await groupApi.create({
        name: form.name.trim(),
        description: form.description.trim(),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        budgetMin: Number(form.budgetMin || 0),
        budgetMax: Number(form.budgetMax || 0),
        currency: form.currency,
      });
      toast.success(`"${group.name}" created — share code ${group.inviteCode}`);
      onCreated(group);
      close();
    } catch (error) {
      const parsed = parseApiError(error, 'Could not create the group.');
      setErrors(parsed.details);
      setFormError(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Start a new trip"
      description="Set the ground rules — your group can suggest destinations inside them."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {formError}
          </div>
        )}

        <Input
          label="Trip name"
          placeholder="Summer reunion 2026"
          value={form.name}
          onChange={update('name')}
          error={errors.name}
          autoFocus
        />
        <Input
          as="textarea"
          label="Description"
          placeholder="A week away with the university crowd…"
          value={form.description}
          onChange={update('description')}
          error={errors.description}
          hint="Optional — helps members know what they are voting on."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Earliest start"
            type="date"
            value={form.startDate}
            onChange={update('startDate')}
            error={errors.startDate}
          />
          <Input
            label="Latest end"
            type="date"
            value={form.endDate}
            onChange={update('endDate')}
            error={errors.endDate}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Min budget"
            type="number"
            min="0"
            placeholder="500"
            value={form.budgetMin}
            onChange={update('budgetMin')}
            error={errors.budgetMin}
          />
          <Input
            label="Max budget"
            type="number"
            min="0"
            placeholder="1800"
            value={form.budgetMax}
            onChange={update('budgetMax')}
            error={errors.budgetMax}
          />
        </div>

        <Input
          as="select"
          label="Currency"
          value={form.currency}
          onChange={update('currency')}
          error={errors.currency}
          hint="Every cost in this trip is shown in this currency."
        >
          {CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currencyLabel(currency)}
            </option>
          ))}
        </Input>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={close} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Create trip
          </Button>
        </div>
      </form>
    </Modal>
  );
}
