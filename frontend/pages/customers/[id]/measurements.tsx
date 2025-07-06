import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { fetcher } from '@/lib/apiClient';

const defaultMeasurements = {
  chest: '', waistJacket: '', hips: '', shoulderWidth: '', sleeveLength: '', jacketLength: '', overarm: '', neck: '',
  trouserWaist: '', inseam: '', outseam: '', height: '', weight: '', shirtCollar: '', shirtSleeveLength: '', fitPreference: '',
  outOfTown: false,
};

type Measurement = { [key: string]: number | string };

export default function CustomerMeasurements() {
  const router = useRouter();
  const { id } = router.query;
  const [measurements, setMeasurements] = useState(defaultMeasurements);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetcher(`/customers/${id}/measurements`).then(data => {
        if (Array.isArray(data) && data.length > 0) setMeasurements({ ...defaultMeasurements, ...data[0] });
        else if (typeof data === 'object' && data !== null) setMeasurements({ ...defaultMeasurements, ...data });
        setLoading(false);
      });
    }
  }, [id]);

  const handleSave = async (data: Measurement) => {
    try {
      const res = await fetch(`/customers/${id}/measurements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measurements }),
      });
      if (res.ok) console.log('Measurements saved');
      else console.error('Failed to save measurements');
    } catch (error) {
      console.error('Error saving measurements:', error);
      console.error('Failed to save measurements');
    }
    setSaving(false);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const safeMeasurements = { ...measurements, outOfTown: String(measurements.outOfTown) };
    handleSave(safeMeasurements);
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white dark:bg-gray-dark rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Customer Measurements</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center mb-2">
          <label className="mr-2 font-semibold">Out of Town?</label>
          <input type="checkbox" checked={!!measurements.outOfTown} onChange={e => setMeasurements(m => ({ ...m, outOfTown: e.target.checked }))} />
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
        <div className="mt-6">
          <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Measurements'}</button>
        </div>
      </form>
    </div>
  );
} 