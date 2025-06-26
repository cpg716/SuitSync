import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import dynamic from 'next/dynamic';
import Modal from './Modal';
const QrReader = dynamic(() => import('react-qr-reader'), { ssr: false });

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
  const [showQR, setShowQR] = useState(false);

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

  // Handle QR scan result
  const handleScan = async (data) => {
    if (data) {
      setShowQR(false);
      // Assume QR encodes a URL like https://suitsync.app/ticket/{id} or just the id
      let id = data;
      if (typeof id === 'string' && id.includes('/')) {
        id = id.split('/').pop();
      }
      if (id && !isNaN(Number(id))) {
        // Try to fetch alteration/job by id
        const res = await fetch(`/api/alterations/${id}`);
        if (res.ok) {
          const job = await res.json();
          // Pre-fill form fields from job
          setJobType(job.partyId ? 'party' : 'walkin');
          setPartyId(job.partyId || '');
          setCustomerId(job.customerId || '');
          setSaleLineItemId(job.saleLineItemId || '');
          setTailorId(job.tailorId || '');
          setStatus(job.status || 'pending');
          setNotes(job.notes || '');
          setTimeSpentMinutes(job.timeSpentMinutes || 0);
          setMeasurements(job.measurements || {});
          setParts(job.parts || []);
          setAssociateId(job.associateId || '');
        }
      }
    }
  };
  const handleError = err => { setShowQR(false); };

  return (
    <Modal 
      isOpen={open} 
      onClose={onClose}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {alteration ? 'Edit Alteration' : 'New Alteration'}
          </h2>
        </div>

        {/* Main content in grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Job Type Selection */}
            <div className="flex gap-4 mb-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="party"
                  checked={jobType === 'party'}
                  onChange={e => setJobType(e.target.value)}
                  className="form-radio"
                />
                <span className="ml-2">Party Job</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="walkin"
                  checked={jobType === 'walkin'}
                  onChange={e => setJobType(e.target.value)}
                  className="form-radio"
                />
                <span className="ml-2">Walk-in</span>
              </label>
            </div>

            {/* Party Selection */}
            {jobType === 'party' && (
              <div>
                <label className="block text-sm font-medium mb-1">Party</label>
                <select
                  value={partyId}
                  onChange={e => setPartyId(e.target.value)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select Party</option>
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium mb-1">Customer</label>
              <select
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Tailor Assignment */}
            <div>
              <label className="block text-sm font-medium mb-1">Assigned Tailor</label>
              <select
                value={tailorId}
                onChange={e => setTailorId(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Tailor</option>
                {tailors.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="complete">Complete</option>
              </select>
            </div>

            {/* Time Spent */}
            <div>
              <label className="block text-sm font-medium mb-1">Time Spent (minutes)</label>
              <input
                type="number"
                value={timeSpentMinutes}
                onChange={e => setTimeSpentMinutes(Number(e.target.value))}
                className="w-full p-2 border rounded"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Parts List */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Alteration Parts</label>
                <Button type="button" onClick={handleAddPart} size="sm">+ Add Part</Button>
              </div>
              <div className="space-y-4">
                {parts.map((part, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <select
                      value={part.part}
                      onChange={e => handlePartChange(idx, 'part', e.target.value)}
                      className="flex-1 p-2 border rounded"
                    >
                      <option value="">Select Part</option>
                      {garmentParts.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <select
                      value={part.workType}
                      onChange={e => handlePartChange(idx, 'workType', e.target.value)}
                      className="flex-1 p-2 border rounded"
                    >
                      <option value="">Select Work Type</option>
                      {part.part && workTypes[part.part]?.map(wt => (
                        <option key={wt} value={wt}>{wt}</option>
                      ))}
                    </select>
                    <Button type="button" onClick={() => handleRemovePart(idx)} variant="danger" size="sm">×</Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full p-2 border rounded h-32"
                placeholder="Enter any additional notes..."
              />
            </div>
          </div>
        </div>

        {/* Measurements Section */}
        <div className="mt-6">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Measurements</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Jacket Measurements */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Jacket</h4>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Chest</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border p-2"
                      value={measurements.chest}
                      onChange={e => setMeasurements(m => ({ ...m, chest: e.target.value }))}
                      placeholder="inches"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Waist</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border p-2"
                      value={measurements.waistJacket}
                      onChange={e => setMeasurements(m => ({ ...m, waistJacket: e.target.value }))}
                      placeholder="inches"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Shoulder Width</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border p-2"
                      value={measurements.shoulderWidth}
                      onChange={e => setMeasurements(m => ({ ...m, shoulderWidth: e.target.value }))}
                      placeholder="inches"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sleeve Length</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border p-2"
                      value={measurements.sleeveLength}
                      onChange={e => setMeasurements(m => ({ ...m, sleeveLength: e.target.value }))}
                      placeholder="inches"
                    />
                  </label>
                </div>
              </div>

              {/* Pants Measurements */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Pants</h4>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Waist</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border p-2"
                      value={measurements.trouserWaist}
                      onChange={e => setMeasurements(m => ({ ...m, trouserWaist: e.target.value }))}
                      placeholder="inches"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Inseam</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border p-2"
                      value={measurements.inseam}
                      onChange={e => setMeasurements(m => ({ ...m, inseam: e.target.value }))}
                      placeholder="inches"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Outseam</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border p-2"
                      value={measurements.outseam}
                      onChange={e => setMeasurements(m => ({ ...m, outseam: e.target.value }))}
                      placeholder="inches"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Hips</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border p-2"
                      value={measurements.hips}
                      onChange={e => setMeasurements(m => ({ ...m, hips: e.target.value }))}
                      placeholder="inches"
                    />
                  </label>
                </div>
              </div>

              {/* Shirt Measurements */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">Shirt</h4>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Neck</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border p-2"
                      value={measurements.neck}
                      onChange={e => setMeasurements(m => ({ ...m, neck: e.target.value }))}
                      placeholder="inches"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sleeve Length</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border p-2"
                      value={measurements.shirtSleeveLength}
                      onChange={e => setMeasurements(m => ({ ...m, shirtSleeveLength: e.target.value }))}
                      placeholder="inches"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Collar</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border p-2"
                      value={measurements.shirtCollar}
                      onChange={e => setMeasurements(m => ({ ...m, shirtCollar: e.target.value }))}
                      placeholder="inches"
                    />
                  </label>
                </div>
              </div>

              {/* General Measurements */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">General</h4>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Height</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border p-2"
                      value={measurements.height}
                      onChange={e => setMeasurements(m => ({ ...m, height: e.target.value }))}
                      placeholder="inches"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Weight</span>
                    <input
                      type="text"
                      className="mt-1 w-full rounded border p-2"
                      value={measurements.weight}
                      onChange={e => setMeasurements(m => ({ ...m, weight: e.target.value }))}
                      placeholder="lbs"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Fit Preference</span>
                    <textarea
                      className="mt-1 w-full rounded border p-2"
                      value={measurements.fitPreference}
                      onChange={e => setMeasurements(m => ({ ...m, fitPreference: e.target.value }))}
                      placeholder="e.g., Slim, Regular, Relaxed"
                      rows={2}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
          <Button type="button" onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {alteration ? 'Update' : 'Create'} Alteration
          </Button>
        </div>
      </form>
    </Modal>
  );
} 