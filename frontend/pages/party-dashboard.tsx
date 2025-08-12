import { useState, useMemo, useEffect } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { useToast } from '../components/ToastContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { Pagination } from '../components/ui/Pagination';
import PartyTimelineRibbon from '../components/PartyTimelineRibbon';

function CalendarErrorBoundary({ children }: { children: React.ReactNode }) {
  try {
    return children;
  } catch (e) {
    return <div className="text-red-600">Calendar failed to load.</div>;
  }
}

export default function PartyDashboard() {
  const { data: parties = [], mutate } = useSWR('/parties');
  const { data: customers = [], mutate: mutateCustomers } = useSWR('/customers');
  const { data: appointments = [] } = useSWR('/appointments/upcoming');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', eventDate: '', customerId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', name: '', eventDate: '', customerId: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const { success, error: toastError } = useToast();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [atRiskParties, setAtRiskParties] = useState([]);

  useEffect(() => {
    fetch('/api/parties/at-risk', { credentials: 'include' })
      .then(res => res.json())
      .then(setAtRiskParties);
  }, []);

  const filtered = useMemo(() =>
    (Array.isArray(parties) ? parties : []).filter((p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (Array.isArray(customers) ? customers : []).find((c: any) => c.id === p.customerId)?.name?.toLowerCase().includes(search.toLowerCase())
    ), [parties, customers, search]);

  const paginated = filtered.slice((page-1)*pageSize, page*pageSize);

  async function handleAddParty(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    if (!form.name || !form.eventDate || !form.customerId) {
      setError('All fields are required');
      toastError('All fields are required');
      setSaving(false);
      return;
    }
    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          eventDate: form.eventDate,
          customerId: Number(form.customerId),
        }),
      });
      if (!res.ok) throw new Error('Failed to add party');
      setModalOpen(false);
      setForm({ name: '', eventDate: '', customerId: '' });
      mutate();
      success('Party added');
    } catch (err) {
      setError('Could not add party');
      toastError('Could not add party');
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(party: any) {
    setEditForm({
      id: party.id,
      name: party.name,
      eventDate: party.eventDate.slice(0, 10),
      customerId: String(party.customerId),
    });
    setEditModalOpen(true);
    setEditError('');
  }

  async function handleEditParty(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true); setEditError('');
    if (!editForm.name || !editForm.eventDate || !editForm.customerId) {
      setEditError('All fields are required');
      toastError('All fields are required');
      setEditSaving(false);
      return;
    }
    try {
      const res = await fetch(`/api/parties/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editForm.name,
          eventDate: editForm.eventDate,
          customerId: Number(editForm.customerId),
        }),
      });
      if (!res.ok) throw new Error('Failed to update party');
      setEditModalOpen(false);
      mutate();
      success('Party updated');
    } catch (err) {
      setEditError('Could not update party');
      toastError('Could not update party');
    } finally {
      setEditSaving(false);
    }
  }

  const events = parties.map((p: any) => ({
    title: `${p.name} (${p.eventDate ? p.eventDate.slice(0, 10) : ''})`,
    start: p.eventDate,
    id: p.id,
  }));

  return (
    <div className="flex flex-col space-y-4">
      {Array.isArray(parties) && parties[0] && (
        <PartyTimelineRibbon
          eventDate={parties[0].eventDate}
          firstFittingDate={parties[0].appointments?.find((a: any)=>a.type==='first_fitting')?.dateTime}
          alterationsFittingDate={parties[0].appointments?.find((a: any)=>a.type==='alterations_fitting')?.dateTime}
          pickupDate={parties[0].appointments?.find((a: any)=>a.type==='pickup')?.dateTime}
          dueDate={parties[0].alterationJobs?.[0]?.dueDate}
        />
      )}
      {atRiskParties.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-red-700 mb-2">At-Risk / Overdue Parties</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {atRiskParties.map((p: any) => (
              <Card key={p.id} className="border-2 border-red-500 bg-red-50 dark:bg-red-900">
                <div className="font-bold text-lg">{p.name}</div>
                <div className="text-gray-700 dark:text-gray-200">Event: {new Date(p.eventDate).toLocaleDateString()}</div>
                <div className="text-gray-700 dark:text-gray-200">Main Customer: {p.customer?.name || '—'}</div>
                <div className="text-red-800 dark:text-red-200 mt-2 font-semibold">{p.notes}</div>
                <div className="mt-2 text-xs text-gray-500">Members: {p.members.length} | Appointments: {p.appointments.length}</div>
              </Card>
            ))}
          </div>
        </div>
      )}
      <ul className="divide-y">
        {paginated.map((p: any) => (
          <li key={p.id} className="p-4">
            <div className="font-bold">{p.name}</div>
            <div className="text-gray-500 text-sm">{p.eventDate ? new Date(p.eventDate).toLocaleDateString() : ''}</div>
          </li>
        ))}
      </ul>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={filtered.length}
        onPageChange={setPage}
        className="my-4 flex justify-center"
      />
    </div>
  );
}