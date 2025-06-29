import { useState } from 'react';
import { Button } from './ui/Button';
import { useToast } from './ToastContext';

// Dummy data for parties and customers (replace with real API calls in production)
const parties = [
  { id: 1, name: 'Smith Wedding' },
  { id: 2, name: 'Johnson Gala' },
];
const customers = [
  { id: 42, name: 'John Walkin' },
  { id: 43, name: 'Jane Doe' },
];

export default function AlterationTagEditor({
  initial = {},
  onSave,
}: {
  initial?: any;
  onSave: (data: any) => Promise<void>;
}) {
  const [jobType, setJobType] = useState('party');
  const [partyId, setPartyId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [saleLineItemId, setSaleLineItemId] = useState('');
  const [tailorId, setTailorId] = useState('');
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');
  const [timeSpentMinutes, setTimeSpentMinutes] = useState(0);
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [measurements, setMeasurements] = useState({
    chest: '',
    waistJacket: '',
    hips: '',
    shoulderWidth: '',
    sleeveLength: '',
    jacketLength: '',
    overarm: '',
    neck: '',
    trouserWaist: '',
    inseam: '',
    outseam: '',
    height: '',
    weight: '',
    shirtCollar: '',
    shirtSleeveLength: '',
    fitPreference: '',
  });

  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!saleLineItemId || (jobType === 'party' && !partyId) || (jobType === 'walkin' && !customerId)) {
      toastError('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        saleLineItemId: Number(saleLineItemId),
        partyId: jobType === 'party' ? Number(partyId) : undefined,
        customerId: jobType === 'walkin' ? Number(customerId) : undefined,
        tailorId: tailorId ? Number(tailorId) : undefined,
        status,
        notes,
        timeSpentMinutes: Number(timeSpentMinutes),
        measurements,
      });
      success('Alteration saved');
    } catch (err) {
      toastError('Error saving');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block mb-1">Job Type</label>
        <select className="w-full border rounded px-3 py-2" value={jobType} onChange={e => setJobType(e.target.value)}>
          <option value="party">Party</option>
          <option value="walkin">Walk-In</option>
        </select>
      </div>
      {jobType === 'party' ? (
        <div>
          <label className="block mb-1">Party</label>
          <select className="w-full border rounded px-3 py-2" value={partyId} onChange={e => setPartyId(e.target.value)} required={jobType === 'party'}>
            <option value="">Select Party</option>
            {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      ) : (
        <div>
          <label className="block mb-1">Customer</label>
          <select className="w-full border rounded px-3 py-2" value={customerId} onChange={e => setCustomerId(e.target.value)} required={jobType === 'walkin'}>
            <option value="">Select Customer</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="block mb-1">Sale Line Item ID</label>
        <input className="w-full border rounded px-3 py-2" value={saleLineItemId} onChange={e => setSaleLineItemId(e.target.value)} required />
      </div>
      <div>
        <label className="block mb-1">Tailor ID</label>
        <input className="w-full border rounded px-3 py-2" value={tailorId} onChange={e => setTailorId(e.target.value)} />
      </div>
      <div>
        <label className="block mb-1">Status</label>
        <select className="w-full border rounded px-3 py-2" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="complete">Complete</option>
        </select>
      </div>
      <div>
        <label className="block mb-1">Notes</label>
        <input className="w-full border rounded px-3 py-2" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div>
        <label className="block mb-1">Time Spent (min)</label>
        <input type="number" className="w-full border rounded px-3 py-2" value={timeSpentMinutes} min={0} max={240} onChange={e => setTimeSpentMinutes(Number(e.target.value))} />
      </div>
      <div className="border rounded-lg p-4 mt-4">
        <h3 className="font-semibold mb-2">Suit Jacket Measurements</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label>Chest (in)
            <input className="w-full border rounded px-2 py-1" value={measurements.chest} onChange={e => setMeasurements(m => ({ ...m, chest: e.target.value }))} placeholder="e.g. 40" />
          </label>
          <label>Waist (Jacket) (in)
            <input className="w-full border rounded px-2 py-1" value={measurements.waistJacket} onChange={e => setMeasurements(m => ({ ...m, waistJacket: e.target.value }))} placeholder="e.g. 34" />
          </label>
          <label>Hips (in)
            <input className="w-full border rounded px-2 py-1" value={measurements.hips} onChange={e => setMeasurements(m => ({ ...m, hips: e.target.value }))} placeholder="e.g. 38" />
          </label>
          <label>Shoulder Width (in)
            <input className="w-full border rounded px-2 py-1" value={measurements.shoulderWidth} onChange={e => setMeasurements(m => ({ ...m, shoulderWidth: e.target.value }))} placeholder="e.g. 18" />
          </label>
          <label>Sleeve Length (in)
            <input className="w-full border rounded px-2 py-1" value={measurements.sleeveLength} onChange={e => setMeasurements(m => ({ ...m, sleeveLength: e.target.value }))} placeholder="e.g. 25" />
          </label>
          <label>Jacket Length (in)
            <input className="w-full border rounded px-2 py-1" value={measurements.jacketLength} onChange={e => setMeasurements(m => ({ ...m, jacketLength: e.target.value }))} placeholder="e.g. 30" />
          </label>
          <label>Overarm (in)
            <input className="w-full border rounded px-2 py-1" value={measurements.overarm} onChange={e => setMeasurements(m => ({ ...m, overarm: e.target.value }))} placeholder="e.g. 44" />
          </label>
          <label>Neck (in)
            <input className="w-full border rounded px-2 py-1" value={measurements.neck} onChange={e => setMeasurements(m => ({ ...m, neck: e.target.value }))} placeholder="e.g. 16" />
          </label>
        </div>
        <h3 className="font-semibold mt-6 mb-2">Suit Pants Measurements</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label>Trouser Waist (in)
            <input className="w-full border rounded px-2 py-1" value={measurements.trouserWaist} onChange={e => setMeasurements(m => ({ ...m, trouserWaist: e.target.value }))} placeholder="e.g. 32" />
          </label>
          <label>Inseam (in)
            <input className="w-full border rounded px-2 py-1" value={measurements.inseam} onChange={e => setMeasurements(m => ({ ...m, inseam: e.target.value }))} placeholder="e.g. 30" />
          </label>
          <label>Outseam (in)
            <input className="w-full border rounded px-2 py-1" value={measurements.outseam} onChange={e => setMeasurements(m => ({ ...m, outseam: e.target.value }))} placeholder="e.g. 40" />
          </label>
        </div>
        <h3 className="font-semibold mt-6 mb-2">Additional Info</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label>Height (in)
            <input className="w-full border rounded px-2 py-1" value={measurements.height} onChange={e => setMeasurements(m => ({ ...m, height: e.target.value }))} placeholder="e.g. 70" />
          </label>
          <label>Weight (lbs)
            <input className="w-full border rounded px-2 py-1" value={measurements.weight} onChange={e => setMeasurements(m => ({ ...m, weight: e.target.value }))} placeholder="e.g. 180" />
          </label>
          <label>Shirt Collar (in)
            <input className="w-full border rounded px-2 py-1" value={measurements.shirtCollar} onChange={e => setMeasurements(m => ({ ...m, shirtCollar: e.target.value }))} placeholder="e.g. 15.5" />
          </label>
          <label>Shirt Sleeve Length (in)
            <input className="w-full border rounded px-2 py-1" value={measurements.shirtSleeveLength} onChange={e => setMeasurements(m => ({ ...m, shirtSleeveLength: e.target.value }))} placeholder="e.g. 34" />
          </label>
        </div>
        <div className="mt-4">
          <label>Fit Preference
            <textarea className="w-full border rounded px-2 py-1" value={measurements.fitPreference} onChange={e => setMeasurements(m => ({ ...m, fitPreference: e.target.value }))} placeholder="e.g. Slim, Regular, Relaxed, or notes" />
          </label>
        </div>
      </div>
      <div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save Alteration'}
        </Button>
      </div>
    </form>
  );
} 