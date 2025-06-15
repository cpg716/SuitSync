import { useState } from 'react';
import Button from './ui/Button';
import { useToast } from './ToastContext';

const garmentOptions = ['Coat', 'Vest', 'Trousers'];

export default function AlterationTagEditor({
  initial = {},
  onSave,
}: {
  initial?: any;
  onSave: (data: any) => Promise<void>;
}) {
  const [form, setForm] = useState<any>({
    tagNumber: initial.tagNumber || `TAG-${Date.now()}`,
    customerName: initial.customerName || '',
    customerAddress: initial.customerAddress || '',
    garmentType: initial.garmentType || 'Coat',
    price: initial.price || 0,
    tax: initial.tax || 0,
    alterationCharge: initial.alterationCharge || 0,
    toBeDone: initial.toBeDone || '',
    willCall: initial.willCall || '',
    remarks: initial.remarks || '',
    timeSpentMinutes: initial.timeSpentMinutes || 0,
  });
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);

  function update(k: string, v: any) {
    setForm((f: any) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: any) {
    e.preventDefault();
    setSaving(true);
    if (!form.customerName || !form.garmentType) {
      toastError('Customer name and garment type are required');
      setSaving(false);
      return;
    }
    try {
      await onSave(form);
      success('Alteration saved');
    } catch (err) {
      toastError('Error saving');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-neutral-700">Tag #</span>
          <input
            type="text"
            value={form.tagNumber}
            disabled
            className="mt-1 w-full px-4 py-2 border border-neutral-300 rounded-lg"
          />
        </label>
        <label className="block">
          <span className="text-neutral-700">Date</span>
          <input
            type="datetime-local"
            value={form.date || ''}
            onChange={e => update('date', e.target.value)}
            className="mt-1 w-full px-4 py-2 border border-neutral-300 rounded-lg"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-neutral-700">Customer Name</span>
          <input
            type="text"
            value={form.customerName}
            onChange={e => update('customerName', e.target.value)}
            className="mt-1 w-full px-4 py-2 border border-neutral-300 rounded-lg"
          />
        </label>
        <label className="block">
          <span className="text-neutral-700">Customer Address</span>
          <input
            type="text"
            value={form.customerAddress}
            onChange={e => update('customerAddress', e.target.value)}
            className="mt-1 w-full px-4 py-2 border border-neutral-300 rounded-lg"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-neutral-700">Garment Type</span>
        <select
          value={form.garmentType}
          onChange={e => update('garmentType', e.target.value)}
          className="mt-1 w-full px-4 py-2 border border-neutral-300 rounded-lg"
        >
          {garmentOptions.map(o => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-neutral-700">Remarks</span>
        <textarea
          value={form.remarks}
          onChange={e => update('remarks', e.target.value)}
          className="mt-1 w-full px-4 py-2 border border-neutral-300 rounded-lg"
        />
      </label>

      {/* Time Tracking */}
      <div className="flex items-center space-x-4">
        <Button
          type="button"
          onClick={() => update('timerStart', new Date().toISOString())}
        >
          Start Timer
        </Button>
        <Button
          type="button"
          onClick={() => {
            const stop = new Date().toISOString();
            const start = new Date(form.timerStart).getTime();
            const mins = Math.round((new Date(stop).getTime() - start) / 60000);
            update('timerStop', stop);
            update('timeSpentMinutes', mins);
          }}
        >
          Stop Timer
        </Button>
        <span>{form.timeSpentMinutes} min</span>
      </div>

      {/* Submit */}
      <div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Alteration'}
        </Button>
      </div>
    </form>
  );
} 