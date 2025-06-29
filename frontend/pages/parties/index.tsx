import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { format, addMonths, differenceInMonths, differenceInDays } from 'date-fns';
import useSWR from 'swr';
import { api } from '@/lib/apiClient';
import { useRouter } from 'next/router';

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
    <Modal open={open} onClose={onClose}>
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

// If Party is not defined, define:
type Party = { id: string; name: string; [key: string]: any };

const fetcher = (url: string): Promise<{ parties: Party[] }> => Promise.resolve(api.get(url)).then(res => res.data as { parties: Party[] });

export default function PartiesList() {
  const { data: partiesData, error, isLoading, mutate } = useSWR('/parties', fetcher);
  const { data: customersData } = useSWR('/customers', fetcher);
  const router = useRouter();

  const parties = partiesData && typeof partiesData === 'object' && 'parties' in partiesData ? partiesData.parties : [];
  const customers = customersData && typeof customersData === 'object' && 'customers' in customersData ? customersData.customers : [];

  const [search, setSearch] = useState('');
  const { success, error: toastError } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editParty, setEditParty] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [showSalesFlow, setShowSalesFlow] = useState(false);
  const [newParty, setNewParty] = useState(null);

  const filtered = parties.filter(party =>
    party.name.toLowerCase().includes(search.toLowerCase()) ||
    (party.customer && party.customer.name && party.customer.name.toLowerCase().includes(search.toLowerCase()))
  );

  const paginated = filtered.slice((page-1)*pageSize, page*pageSize);

  const handleFormSubmit = async (formData) => {
    try {
      if (editParty) {
        await api.put(`/parties/${editParty.id}`, formData);
        success('Party updated successfully');
      } else {
        const response = await api.post('/parties', formData);
        if (response.data && typeof response.data === 'object' && 'party' in response.data) {
          setNewParty(response.data.party);
        }
        success('Party created successfully!');
        setShowSalesFlow(true);
      }
      mutate(); // Revalidate the parties list
      setModalOpen(false);
      setEditParty(null);
      if (newParty && typeof newParty === 'object' && 'id' in newParty) {
        router.push(`/parties/${newParty.id}`);
      }
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to save party');
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header and Search Section - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search parties or customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-black dark:text-white transition-colors"
          />
        </div>
        <Button 
          className="w-full sm:w-auto px-6 py-2 bg-primary text-white hover:bg-primary/90" 
          onClick={() => { setEditParty(null); setModalOpen(true); }}
        >
          + Add Party
        </Button>
      </div>

      {/* Parties Grid/Table - Responsive */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 dark:text-red-400">
            Failed to load parties. Please check your connection.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No parties found.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Party Name
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Event Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginated.map(party => (
                    <tr key={party.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link 
                          href={`/parties/${party.id}`} 
                          className="font-medium text-primary dark:text-accent hover:underline"
                        >
                          {party.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                        {new Date(party.eventDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-accent/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-primary dark:text-accent">
                              {party.customer?.name?.[0] || '?'}
                            </span>
                          </div>
                          <span className="text-gray-900 dark:text-gray-100">
                            {party.customer?.name || '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          party.syncedToLs 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {party.syncedToLs ? 'Synced' : 'Local'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <Link 
                            href={`/parties/${party.id}`}
                            className="text-primary dark:text-accent hover:underline text-sm"
                          >
                            View
                          </Link>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => { setEditParty(party); setModalOpen(true); }}
                            className="text-xs"
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginated.map(party => (
                  <div key={party.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/parties/${party.id}`}
                          className="text-lg font-medium text-primary dark:text-accent hover:underline block truncate"
                        >
                          {party.name}
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {new Date(party.eventDate).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${
                        party.syncedToLs 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}>
                        {party.syncedToLs ? 'Synced' : 'Local'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-primary/10 dark:bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary dark:text-accent">
                            {party.customer?.name?.[0] || '?'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                          {party.customer?.name || '—'}
                        </span>
                      </div>
                      
                      <div className="flex space-x-2 flex-shrink-0 ml-2">
                        <Link 
                          href={`/parties/${party.id}`}
                          className="text-primary dark:text-accent hover:underline text-sm"
                        >
                          View
                        </Link>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => { setEditParty(party); setModalOpen(true); }}
                          className="text-xs px-2 py-1"
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Pagination */}
      {filtered.length > pageSize && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          className="my-4 flex justify-center"
        />
      )}

      <PartyModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditParty(null); }}
        initial={editParty}
        customers={customers}
        onSubmit={handleFormSubmit}
      />
      {/* Sales Flow Modal after party creation */}
      {showSalesFlow && newParty && (
        <Modal open={showSalesFlow} onClose={() => setShowSalesFlow(false)}>
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