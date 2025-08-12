import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import CreatePartyModal from '../../components/ui/CreatePartyModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Pagination } from '../../components/ui/Pagination';
import { format, addMonths, differenceInMonths, differenceInDays } from 'date-fns';
import useSWR from 'swr';
import { simpleFetcher } from '@/lib/simpleApiClient';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/AuthContext';
import { ResourceSyncStatus } from '../../components/ResourceSyncStatus';
import { api } from '@/lib/apiClient';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { Users, Calendar, TrendingUp, CheckCircle, PieChart } from 'lucide-react';

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

function StatusSummaryBoxes({ statusCounts, mostBehindStatus }) {
  const statusConfig = {
    awaiting_measurements: { label: 'Awaiting Measurements', color: 'bg-red-500', textColor: 'text-white' },
    need_to_order: { label: 'Need to Order', color: 'bg-orange-500', textColor: 'text-white' },
    ordered: { label: 'Ordered', color: 'bg-blue-500', textColor: 'text-white' },
    received: { label: 'Received', color: 'bg-purple-500', textColor: 'text-white' },
    being_altered: { label: 'Being Altered', color: 'bg-yellow-500', textColor: 'text-black' },
    ready_for_pickup: { label: 'Ready for Pickup', color: 'bg-green-500', textColor: 'text-white' }
  };

  return (
    <div className="grid grid-cols-3 gap-1 mt-2">
      {Object.entries(statusCounts).map(([status, count]) => {
        const config = statusConfig[status];
        const isMostBehind = status === mostBehindStatus;
        return (
          <div
            key={status}
            className={`${config.color} ${config.textColor} text-xs px-2 py-1 rounded text-center font-medium ${
              isMostBehind ? 'ring-2 ring-black ring-opacity-50' : ''
            }`}
            title={`${config.label}: ${count} member${count !== 1 ? 's' : ''}`}
          >
            {String(count)}
          </div>
        );
      })}
    </div>
  );
}

function StatusUpdateModal({ open, onClose, member, onSubmit }) {
  const [form, setForm] = useState({
    status: member?.status || 'awaiting_measurements',
    suitOrderId: member?.suitOrderId || '',
    accessoriesOrderId: member?.accessoriesOrderId || '',
    notes: member?.notes || ''
  });
  const [saving, setSaving] = useState(false);

  const statusOptions = [
    { value: 'awaiting_measurements', label: 'Awaiting Measurements' },
    { value: 'need_to_order', label: 'Need to Order' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'received', label: 'Received' },
    { value: 'being_altered', label: 'Being Altered' },
    { value: 'ready_for_pickup', label: 'Ready for Pickup' }
  ];

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded shadow-lg w-96 max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Update Member Status</h2>
          
          {member && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <p className="font-medium">{member.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{member.role}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select 
                className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Suit Order ID</label>
              <input
                type="text"
                className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
                value={form.suitOrderId}
                onChange={e => setForm(f => ({ ...f, suitOrderId: e.target.value }))}
                placeholder="Enter suit order ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Accessories Order ID</label>
              <input
                type="text"
                className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
                value={form.accessoriesOrderId}
                onChange={e => setForm(f => ({ ...f, accessoriesOrderId: e.target.value }))}
                placeholder="Enter accessories order ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Add any notes..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <Button onClick={onClose} className="bg-gray-300 text-black dark:bg-gray-800 dark:text-gray-100">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Update Status'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
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

const fetcher = async (url: string): Promise<{ parties: Party[], lightspeedGroups?: any[] }> => {
  const result = await simpleFetcher(url);
  return result as { parties: Party[], lightspeedGroups?: any[] };
};

export default function PartiesList() {
  const { user, loading: authLoading } = useAuth();
  const { data: partiesData, error, isLoading, mutate } = useSWR(
    '/api/customers', 
    fetcher
  );
  const { data: customersData } = useSWR(
    '/api/customers', 
    fetcher
  );
  const isClient = typeof window !== 'undefined';
  const router = isClient ? useRouter() : null;

  const parties = partiesData && typeof partiesData === 'object' && 'parties' in partiesData ? partiesData.parties : [];
  const lightspeedGroups = partiesData && typeof partiesData === 'object' && 'lightspeedGroups' in partiesData ? partiesData.lightspeedGroups : [];
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

  // Summary data for hero section
  const summary = {
    totalParties: parties.length,
    upcomingParties: parties.filter(p => p.eventDate && new Date(p.eventDate) > new Date()).length,
    totalMembers: parties.reduce((sum, p) => sum + (p.totalMembers || 0), 0),
    completedParties: parties.filter(p => p.eventDate && new Date(p.eventDate) < new Date()).length,
  };



  const handleFormSubmit = async (formData) => {
    try {
      if (editParty) {
        await api.put(`/api/parties/${editParty.id}`, formData);
        success('Party updated successfully');
      } else {
        const response = await api.post('/api/parties', formData);
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
      let message = 'Failed to save party';
      if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'error' in err.response.data) {
        message = err.response.data.error || message;
      }
      toastError(message);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-xl shadow-lg p-8 flex flex-col md:flex-row items-center gap-6 animate-fade-in">
        <div className="flex-1">
          <h1 className="text-4xl font-extrabold text-white mb-2 drop-shadow-lg">Party Management</h1>
          <p className="text-lg text-blue-100 mb-4">Track and manage all your wedding parties and events.</p>
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="lg" showName />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
            <PieChart className="w-12 h-12 text-white" />
          </div>
          <span className="text-white text-sm font-semibold">{summary.upcomingParties} / {summary.totalParties} Active</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <CardTitle>Total Parties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-200 animate-countup">{summary.totalParties}</div>
            <div className="text-sm text-blue-500">{summary.upcomingParties} upcoming</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <Calendar className="w-6 h-6 text-green-600" />
            <CardTitle>Total Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-200 animate-countup">{summary.totalMembers}</div>
            <div className="text-sm text-green-500">across all parties</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-200 animate-countup">{summary.upcomingParties}</div>
            <div className="text-sm text-purple-500">scheduled</div>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50 dark:bg-indigo-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <CheckCircle className="w-6 h-6 text-indigo-600" />
            <CardTitle>Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-200 animate-countup">{summary.completedParties}</div>
            <div className="text-sm text-indigo-500">past events</div>
          </CardContent>
        </Card>
      </div>

      {/* Header and Search Section - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search parties or customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2.5 sm:py-2 focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-black dark:text-white transition-colors text-sm sm:text-base h-11 sm:h-10"
          />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ResourceSyncStatus resource="groups" />
          <CreatePartyInlineButton />
        </div>
      </div>

      {/* Parties Grid/Table - Responsive */}
      <Card className="overflow-hidden">
        {authLoading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : isLoading ? (
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
                      Member Status
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
                        <div className="space-y-2">
                          <StatusSummaryBoxes 
                            statusCounts={party.statusCounts || {}} 
                            mostBehindStatus={party.mostBehindStatus} 
                          />
                          <div className="text-xs text-gray-500">
                            {party.totalMembers || 0} member{(party.totalMembers || 0) !== 1 ? 's' : ''}
                          </div>
                        </div>
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
                  <div key={party.id} className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors active:bg-gray-100 dark:active:bg-gray-800">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/parties/${party.id}`}
                          className="text-base sm:text-lg font-medium text-primary dark:text-accent hover:underline block truncate"
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
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {party.groomName} • {party.groomPhone}
                        </p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <StatusSummaryBoxes 
                        statusCounts={party.statusCounts || {}} 
                        mostBehindStatus={party.mostBehindStatus} 
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {party.totalMembers || 0} member{(party.totalMembers || 0) !== 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 dark:bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm sm:text-base font-bold text-primary dark:text-accent">
                            {party.customer?.name?.[0] || '?'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Customer</p>
                          <span className="text-sm text-gray-900 dark:text-gray-100 truncate block">
                            {party.customer?.name || '—'}
                          </span>
                        </div>
                      </div>

                      <div className="flex space-x-2 flex-shrink-0 ml-3">
                        <Link
                          href={`/parties/${party.id}`}
                          className="text-primary dark:text-accent hover:underline text-sm font-medium min-h-[44px] flex items-center px-2 touch-manipulation"
                        >
                          View
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditParty(party); setModalOpen(true); }}
                          className="text-xs px-3 py-2 min-h-[44px] touch-manipulation"
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

function CreatePartyInlineButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 bg-primary text-white hover:bg-primary/90 min-h-[44px] sm:min-h-[40px] text-sm sm:text-base touch-manipulation"
        onClick={() => setOpen(true)}
      >
        <span className="hidden xs:inline">+ Add Party</span>
        <span className="xs:hidden">+ Add</span>
      </Button>
      <CreatePartyModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}