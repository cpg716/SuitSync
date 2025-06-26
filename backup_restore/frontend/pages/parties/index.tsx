import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { useToast } from '../../components/ToastContext';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Pagination from '../../components/ui/Pagination';
import { format, addMonths, differenceInMonths, differenceInDays } from 'date-fns';

const PHASES = [
  { name: 'Suit Selection', color: 'bg-blue-500', monthsFrom: 6, monthsTo: 3 },
  { name: 'Measurements', color: 'bg-green-500', monthsFrom: 3, monthsTo: 1 },
  { name: 'Alteration Fitting', color: 'bg-yellow-400', monthsFrom: 1, monthsTo: 0.25 },
  { name: 'Pick-Up Reminder', color: 'bg-orange-400', monthsFrom: 0.25, monthsTo: 0 },
];

function getPhase(eventDate, now) {
  const months = differenceInMonths(new Date(eventDate), now) + (differenceInDays(new Date(eventDate), now) % 30) / 30;
  for (const [i, phase] of PHASES.entries()) {
    if (months <= phase.monthsFrom && months > phase.monthsTo) return i;
  }
  return PHASES.length - 1;
}

function getNextAction(party, now) {
  if (!party) return '';
  const eventDate = new Date(party.eventDate);
  const months = differenceInMonths(eventDate, now) + (differenceInDays(eventDate, now) % 30) / 30;
  for (const phase of PHASES) {
    if (months <= phase.monthsFrom && months > phase.monthsTo) {
      const phaseStart = addMonths(eventDate, -phase.monthsFrom);
      const daysUntil = differenceInDays(phaseStart, now);
      return `Next: ${phase.name} in ${daysUntil} days`;
    }
  }
  return 'No upcoming actions';
}

function ProgressBar({ phase }) {
  return (
    <div className="flex w-full h-3 rounded overflow-hidden mt-2">
      {PHASES.map((p, i) => (
        <div
          key={p.name}
          className={`${p.color} ${i <= phase ? '' : 'bg-gray-200 dark:bg-gray-700'} flex-1 transition-all`}
        />
      ))}
    </div>
  );
}

function PartyModal({ open, onClose, onSubmit, initial, customers }) {
  const [form, setForm] = useState(initial || { name: '', eventDate: '', notes: '', customerId: '' });
  const [saving, setSaving] = useState(false);
  return (
    <Modal isOpen={open}>
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded shadow-lg w-96">
          <h2 className="text-xl font-bold mb-4">{initial ? 'Edit Party' : 'Add Party'}</h2>
          <Input className="mb-2 w-full" placeholder="Party Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input className="mb-2 w-full" type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} />
          <select className="mb-2 w-full border rounded p-2" value={form.customerId} onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}>
            <option value="">Select Customer</option>
            {Array.isArray(customers)
              ? customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
              : <option disabled>Failed to load customers</option>}
          </select>
          <textarea className="mb-2 w-full border rounded p-2" placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-2 justify-end mt-4">
            <Button onClick={onClose} className="bg-gray-300 text-black dark:bg-gray-800 dark:text-gray-100">Cancel</Button>
            <Button onClick={async () => { setSaving(true); await onSubmit(form); setSaving(false); }} disabled={saving}>
              {saving ? 'Saving...' : (initial ? 'Save' : 'Add')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function PartiesList() {
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const { success, error: toastError } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editParty, setEditParty] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [showSalesFlow, setShowSalesFlow] = useState(false);
  const [newParty, setNewParty] = useState(null);

  useEffect(() => {
    fetch('/api/parties')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setParties(data);
        } else {
          setError(data?.error || 'Failed to load parties');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load parties');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(setCustomers);
  }, []);

  const filtered = parties.filter(party =>
    party.name.toLowerCase().includes(search.toLowerCase()) ||
    party.customer?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const paginated = filtered.slice((page-1)*pageSize, page*pageSize);

  return (
    <div className="w-full max-w-screen-lg mx-auto bg-white text-black dark:bg-gray-dark dark:text-white">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
        <h1 className="text-3xl font-bold text-primary dark:text-accent">Parties</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search parties or customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-light rounded-lg px-3 py-2 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-primary bg-white text-black dark:bg-gray-dark dark:text-white"
          />
          <Button className="ml-2 px-4 py-2 bg-primary text-white" aria-label="Add Party" onClick={() => { setEditParty(null); setModalOpen(true); }}>+ Add Party</Button>
        </div>
      </div>
      <Card className="p-0 bg-white dark:bg-gray-dark border-2 border-gray-400 dark:border-gray-700">
        {loading ? (
          <div className="space-y-2 p-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-3 text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="p-3 text-gray-500">No parties found.</div>
        ) : (
          <table className="w-full border-t-2 rounded text-black dark:text-white bg-white dark:bg-gray-dark border-gray-400 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-light dark:bg-gray">
                <th className="p-2 text-left font-semibold">Name</th>
                <th className="p-2 text-left font-semibold">Event Date</th>
                <th className="p-2 text-left font-semibold">Customer</th>
                <th className="p-2 text-left font-semibold">Status</th>
                <th className="p-2 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(party => (
                <tr key={party.id} className="border-t hover:bg-gray-light dark:hover:bg-gray transition">
                  <td className="p-2 font-medium text-lg flex items-center gap-2">
                    <span className="inline-block">
                      <Link href={`/parties/${party.id}`} className="hover:underline text-primary dark:text-accent">
                        {party.name}
                      </Link>
                    </span>
                  </td>
                  <td className="p-2">{new Date(party.eventDate).toLocaleDateString()}</td>
                  <td className="p-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center font-bold text-primary dark:text-accent">
                      {party.customer?.name?.[0] || '?'}
                    </div>
                    <span>{party.customer?.name || '—'}</span>
                  </td>
                  <td className="p-2">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${party.syncedToLs ? 'bg-primary-light text-primary dark:bg-primary dark:text-accent' : 'bg-gray-light text-gray-dark dark:bg-gray-800 dark:text-gray-200'}`}>
                      {party.syncedToLs ? 'Synced' : 'Local'}
                    </span>
                  </td>
                  <td className="p-2 flex gap-2">
                    <Link href={`/parties/${party.id}`} className="text-primary underline mr-2 dark:text-accent">
                      View
                    </Link>
                    <Button className="px-3 py-1 text-xs bg-gray text-white">Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        className="my-4 flex justify-center"
      />
      <PartyModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditParty(null); }}
        initial={editParty}
        customers={customers}
        onSubmit={async (form) => {
          try {
            const res = await fetch(editParty ? `/api/parties/${editParty.id}` : '/api/parties', {
              method: editParty ? 'PUT' : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error('Failed to save');
            setModalOpen(false); setEditParty(null);
            success('Party saved!');
            // Refresh list
            fetch('/api/parties').then(r => r.json()).then(setParties);
            if (!editParty) {
              // Show sales flow modal for new party
              const partyData = await res.json();
              setNewParty(partyData);
              setShowSalesFlow(true);
            }
          } catch (e) {
            toastError('Failed to save party');
          }
        }}
      />
      {/* Sales Flow Modal after party creation */}
      {showSalesFlow && newParty && (
        <Modal isOpen={showSalesFlow} onClose={() => setShowSalesFlow(false)}>
          <div className="w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-2">Sales Flow for {newParty.name}</h2>
            <ProgressBar phase={getPhase(newParty.eventDate, new Date())} />
            <div className="mt-4 text-gray-700 dark:text-gray-300">{getNextAction(newParty, new Date())}</div>
            <div className="mt-4 flex gap-2">
              <Button className="bg-blue-500 text-white" onClick={() => { setShowSalesFlow(false); window.location.href = `/parties/${newParty.id}`; }}>Go to Party Details</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
} 