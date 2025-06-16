import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';

// Dummy data for parties, customers, and tailors (replace with real API calls in production)
const parties = [
  { id: 1, name: 'Smith Wedding' },
  { id: 2, name: 'Johnson Gala' },
];
const customers = [
  { id: 42, name: 'John Walkin' },
  { id: 43, name: 'Jane Doe' },
];
const tailors = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Carlos' },
];
const garmentParts = [
  'Coat', 'Pants', 'Vest', 'Shirt', 'Other'
];
const associates = [
  { id: 1, name: 'Sam Sales' },
  { id: 2, name: 'Alex Associate' },
  { id: 3, name: 'Jamie Retail' },
];
const workTypes = {
  Coat: [
    'Sleeve Length', 'Shoulders', 'Waist', 'Length', 'Sleeve Width', 'Collar', 'Lapels', 'Vents', 'Buttons', 'Hem', 'Pockets', 'Lining', 'Repair', 'General Fit',
  ],
  Pants: [
    'Waist', 'Seat', 'Thighs', 'Leg Length', 'Tapering', 'Leg Width', 'Rise', 'Buttons', 'Hem', 'Repair', 'General Fit',
  ],
  Vest: [
    'Waist', 'Length', 'Buttons', 'Hem', 'Repair', 'General Fit',
  ],
  Shirt: [
    'Sleeve Length', 'Collar', 'Shirt Sleeve Length', 'Shirt Collar', 'Hem', 'Repair', 'General Fit',
  ],
  Other: [
    'Repair', 'General Fit', 'Custom',
  ],
};

export default function AlterationModal({ open, onClose, onSubmit, alteration, loading }) {
  const [jobType, setJobType] = useState(alteration?.party ? 'party' : 'walkin');
  const [partyId, setPartyId] = useState(alteration?.party?.id || '');
  const [customerId, setCustomerId] = useState(alteration?.customer?.id || '');
  const [saleLineItemId, setSaleLineItemId] = useState(alteration?.saleLineItemId || '');
  const [tailorId, setTailorId] = useState(alteration?.tailor?.id || '');
  const [status, setStatus] = useState(alteration?.status || 'pending');
  const [notes, setNotes] = useState(alteration?.notes || '');
  const [timeSpentMinutes, setTimeSpentMinutes] = useState(alteration?.timeSpentMinutes || 0);
  const [measurements, setMeasurements] = useState(alteration?.measurements || {
    chest: '', waistJacket: '', hips: '', shoulderWidth: '', sleeveLength: '', jacketLength: '', overarm: '', neck: '',
    trouserWaist: '', inseam: '', outseam: '', height: '', weight: '', shirtCollar: '', shirtSleeveLength: '', fitPreference: '',
  });
  const [customerMeasurementsLoaded, setCustomerMeasurementsLoaded] = useState(false);
  const [parts, setParts] = useState(
    alteration?.parts || [
      { part: 'Coat', tailorId: '', workType: '' },
      { part: 'Pants', tailorId: '', workType: '' },
    ]
  );
  const [associateId, setAssociateId] = useState(alteration?.associateId || '');

  useEffect(() => {
    if (!alteration && (partyId || customerId) && !customerMeasurementsLoaded) {
      // Try party member first
      if (partyId && customerId) {
        fetch(`/api/parties/${partyId}/members?customerId=${customerId}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            const member = Array.isArray(data) ? data.find(m => m.lsCustomerId == customerId) : null;
            if (member && member.measurements) {
              setMeasurements(m => ({ ...m, ...member.measurements }));
              setCustomerMeasurementsLoaded(true);
            } else if (customerId) {
              fetch(`/api/customers/${customerId}/measurements`)
                .then(r => r.ok ? r.json() : null)
                .then(data => {
                  if (data?.measurements) setMeasurements(m => ({ ...m, ...data.measurements }));
                  setCustomerMeasurementsLoaded(true);
                });
            }
          });
      } else if (customerId) {
        fetch(`/api/customers/${customerId}/measurements`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data?.measurements) setMeasurements(m => ({ ...m, ...data.measurements }));
            setCustomerMeasurementsLoaded(true);
          });
      }
    }
  }, [partyId, customerId, alteration, customerMeasurementsLoaded]);

  useEffect(() => {
    if (alteration) {
      setJobType(alteration.party ? 'party' : 'walkin');
      setPartyId(alteration.party?.id || '');
      setCustomerId(alteration.customer?.id || '');
      setSaleLineItemId(alteration.saleLineItemId || '');
      setTailorId(alteration.tailor?.id || '');
      setStatus(alteration.status || 'pending');
      setNotes(alteration.notes || '');
      setTimeSpentMinutes(alteration.timeSpentMinutes || 0);
      setMeasurements(alteration.measurements || {
        chest: '', waistJacket: '', hips: '', shoulderWidth: '', sleeveLength: '', jacketLength: '', overarm: '', neck: '',
        trouserWaist: '', inseam: '', outseam: '', height: '', weight: '', shirtCollar: '', shirtSleeveLength: '', fitPreference: '',
      });
      setCustomerMeasurementsLoaded(false);
      setParts(alteration.parts || [
        { part: 'Coat', tailorId: '', workType: '' },
        { part: 'Pants', tailorId: '', workType: '' },
      ]);
      setAssociateId(alteration.associateId || '');
    }
  }, [alteration]);

  const handlePartChange = (idx, field, value) => {
    setParts(parts => parts.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };
  const handleAddPart = () => {
    setParts(parts => [...parts, { part: '', tailorId: '', workType: '' }]);
  };
  const handleRemovePart = idx => {
    setParts(parts => parts.filter((_, i) => i !== idx));
  };
  const handlePartWorkTypeChange = (idx, value) => {
    setParts(parts => parts.map((p, i) => i === idx ? { ...p, workTypes: value } : p));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!saleLineItemId || (jobType === 'party' && !partyId) || (jobType === 'walkin' && !customerId)) return;
    await onSubmit({
      saleLineItemId: Number(saleLineItemId),
      partyId: jobType === 'party' ? Number(partyId) : undefined,
      customerId: jobType === 'walkin' ? Number(customerId) : undefined,
      tailorId: tailorId ? Number(tailorId) : undefined,
      status,
      notes,
      timeSpentMinutes: Number(timeSpentMinutes),
      measurements,
      parts,
    });
    // After saving, sync back to customer and party member if present
    if (customerId) {
      await fetch(`/api/customers/${customerId}/measurements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measurements }),
      });
    }
    if (partyId && customerId) {
      // Find party member by partyId and customerId
      const res = await fetch(`/api/parties/${partyId}/members?customerId=${customerId}`);
      if (res.ok) {
        const members = await res.json();
        const member = Array.isArray(members) ? members.find(m => m.lsCustomerId == customerId) : null;
        if (member) {
          await fetch(`/api/parties/${partyId}/members/${member.id}/measurements`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ measurements }),
          });
        }
      }
    }
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <Card className="max-w-4xl w-full p-8 relative bg-white dark:bg-gray-900 text-black dark:text-white shadow-xl">
        <button className="absolute top-2 right-2 text-xl text-black dark:text-white" onClick={onClose}>&times;</button>
        <h2 className="text-2xl font-bold mb-6 text-primary dark:text-accent">{alteration ? 'Edit' : 'Add'} Alteration</h2>
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Main Salesperson */}
          <div className="mb-4">
            <label className="block mb-1 font-medium">Main Salesperson</label>
            <select className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white" value={associateId} onChange={e => setAssociateId(e.target.value)} required>
              <option value="">Select Salesperson</option>
              {associates.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-medium">Job Type</label>
              <select className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white" value={jobType} onChange={e => setJobType(e.target.value)}>
                <option value="party">Party</option>
                <option value="walkin">Walk-In</option>
              </select>
            </div>
            {jobType === 'party' ? (
              <div>
                <label className="block mb-1 font-medium">Party</label>
                <select className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white" value={partyId} onChange={e => setPartyId(e.target.value)} required={jobType === 'party'}>
                  <option value="">Select Party</option>
                  {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            ) : (
              <div>
                <label className="block mb-1 font-medium">Customer</label>
                <select className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white" value={customerId} onChange={e => setCustomerId(e.target.value)} required={jobType === 'walkin'}>
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block mb-1 font-medium">Sale Line Item ID</label>
              <input className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white" value={saleLineItemId} onChange={e => setSaleLineItemId(e.target.value)} required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Tailor ID</label>
              <input className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white" value={tailorId} onChange={e => setTailorId(e.target.value)} />
            </div>
            <div>
              <label className="block mb-1 font-medium">Status</label>
              <select className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Notes</label>
              <input className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div>
              <label className="block mb-1 font-medium">Time Spent (min)</label>
              <input type="number" className="w-full border rounded px-3 py-2 bg-white dark:bg-gray-800 text-black dark:text-white" value={timeSpentMinutes} min={0} max={240} onChange={e => setTimeSpentMinutes(e.target.value)} />
            </div>
          </div>
          {/* Garment Parts Section */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h3 className="font-semibold mb-2 text-primary dark:text-accent flex items-center justify-between">
              Garment Parts & Tailors
              <Button type="button" className="ml-2 px-2 py-1 text-xs bg-primary text-white" onClick={handleAddPart}>+ Add Part</Button>
            </h3>
            <div className="space-y-2">
              {parts.map((part, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center">
                  <select className="border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={part.part} onChange={e => handlePartChange(idx, 'part', e.target.value)}>
                    <option value="">Select Part</option>
                    {garmentParts.map(gp => <option key={gp} value={gp}>{gp}</option>)}
                  </select>
                  {/* Multi-select for work types */}
                  <select
                    multiple
                    className="border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white h-16"
                    value={part.workTypes || []}
                    onChange={e => handlePartWorkTypeChange(idx, Array.from(e.target.selectedOptions, o => o.value))}
                  >
                    {(workTypes[part.part] || workTypes.Other).map(wt => <option key={wt} value={wt}>{wt}</option>)}
                  </select>
                  <select className="border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={part.tailorId} onChange={e => handlePartChange(idx, 'tailorId', e.target.value)}>
                    <option value="">Select Tailor</option>
                    {tailors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input className="border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={part.workTypeNotes || ''} onChange={e => handlePartChange(idx, 'workTypeNotes', e.target.value)} placeholder="Notes" />
                  <Button type="button" className="px-2 py-1 text-xs bg-red-500 text-white" onClick={() => handleRemovePart(idx)}>-</Button>
                </div>
              ))}
            </div>
          </div>
          {/* Measurements Section */}
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <h3 className="font-semibold mb-2 text-primary dark:text-accent">Measurements</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="text-xs font-medium">Chest (in)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.chest} onChange={e => setMeasurements(m => ({ ...m, chest: e.target.value }))} placeholder="e.g. 40" />
              </label>
              <label className="text-xs font-medium">Waist (Jacket) (in)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.waistJacket} onChange={e => setMeasurements(m => ({ ...m, waistJacket: e.target.value }))} placeholder="e.g. 34" />
              </label>
              <label className="text-xs font-medium">Hips (in)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.hips} onChange={e => setMeasurements(m => ({ ...m, hips: e.target.value }))} placeholder="e.g. 38" />
              </label>
              <label className="text-xs font-medium">Shoulder Width (in)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.shoulderWidth} onChange={e => setMeasurements(m => ({ ...m, shoulderWidth: e.target.value }))} placeholder="e.g. 18" />
              </label>
              <label className="text-xs font-medium">Sleeve Length (in)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.sleeveLength} onChange={e => setMeasurements(m => ({ ...m, sleeveLength: e.target.value }))} placeholder="e.g. 25" />
              </label>
              <label className="text-xs font-medium">Jacket Length (in)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.jacketLength} onChange={e => setMeasurements(m => ({ ...m, jacketLength: e.target.value }))} placeholder="e.g. 30" />
              </label>
              <label className="text-xs font-medium">Overarm (in)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.overarm} onChange={e => setMeasurements(m => ({ ...m, overarm: e.target.value }))} placeholder="e.g. 44" />
              </label>
              <label className="text-xs font-medium">Neck (in)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.neck} onChange={e => setMeasurements(m => ({ ...m, neck: e.target.value }))} placeholder="e.g. 16" />
              </label>
              <label className="text-xs font-medium">Trouser Waist (in)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.trouserWaist} onChange={e => setMeasurements(m => ({ ...m, trouserWaist: e.target.value }))} placeholder="e.g. 32" />
              </label>
              <label className="text-xs font-medium">Inseam (in)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.inseam} onChange={e => setMeasurements(m => ({ ...m, inseam: e.target.value }))} placeholder="e.g. 30" />
              </label>
              <label className="text-xs font-medium">Outseam (in)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.outseam} onChange={e => setMeasurements(m => ({ ...m, outseam: e.target.value }))} placeholder="e.g. 40" />
              </label>
              <label className="text-xs font-medium">Height (in)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.height} onChange={e => setMeasurements(m => ({ ...m, height: e.target.value }))} placeholder="e.g. 70" />
              </label>
              <label className="text-xs font-medium">Weight (lbs)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.weight} onChange={e => setMeasurements(m => ({ ...m, weight: e.target.value }))} placeholder="e.g. 180" />
              </label>
              <label className="text-xs font-medium">Shirt Collar (in)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.shirtCollar} onChange={e => setMeasurements(m => ({ ...m, shirtCollar: e.target.value }))} placeholder="e.g. 15.5" />
              </label>
              <label className="text-xs font-medium">Shirt Sleeve Length (in)
                <input className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.shirtSleeveLength} onChange={e => setMeasurements(m => ({ ...m, shirtSleeveLength: e.target.value }))} placeholder="e.g. 34" />
              </label>
              <label className="text-xs font-medium">Fit Preference
                <textarea className="w-full border rounded px-2 py-1 bg-white dark:bg-gray-900 text-black dark:text-white" value={measurements.fitPreference} onChange={e => setMeasurements(m => ({ ...m, fitPreference: e.target.value }))} placeholder="e.g. Slim, Regular, Relaxed, or notes" />
              </label>
            </div>
          </div>
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
        </form>
      </Card>
    </div>
  );
} 