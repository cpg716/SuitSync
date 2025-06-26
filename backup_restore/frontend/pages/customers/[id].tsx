import { useRouter } from 'next/router';
import useSWR from 'swr';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { useState } from 'react';
import { useToast } from '../../components/ToastContext';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

export default function CustomerProfile() {
  const router = useRouter();
  const { id } = router.query;
  const { data: customer } = useSWR(id ? `/api/customers/${id}` : null, fetcher);
  const { data: parties = [] } = useSWR('/api/parties', fetcher);
  const { data: appointments = [] } = useSWR('/api/appointments', fetcher);
  const { data: alterations = [] } = useSWR('/api/alterations', fetcher);
  const { data: auditlog = [] } = useSWR('/api/auditlog', fetcher);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const { success, error: toastError } = useToast();

  function openEditModal() {
    setEditForm({ name: customer.name, email: customer.email, phone: customer.phone || '' });
    setEditModalOpen(true);
    setEditError('');
  }

  async function handleEditCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.name || !editForm.email) {
      setEditError('Name and email are required');
      toastError('Name and email are required');
      return;
    }
    setEditSaving(true);
    setEditError('');
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Failed to update customer');
      setEditModalOpen(false);
      router.replace(router.asPath);
      success('Customer updated');
    } catch (err) {
      setEditError('Could not update customer');
      toastError('Could not update customer');
    } finally {
      setEditSaving(false);
    }
  }

  if (!customer) return <div className="p-8">Loading…</div>;

  const customerParties = parties.filter((p: any) => p.customerId === customer.id);
  const customerAppointments = appointments.filter((a: any) => customerParties.some((p: any) => p.id === a.partyId));
  const customerAlterations = alterations.filter((a: any) => customerParties.some((p: any) => p.id === a.partyId));
  const customerAudit = auditlog.filter((log: any) => log.entity === 'Customer' && log.entityId === customer.id);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <div className="flex gap-2">
            <Button className="px-3 py-1 text-sm" onClick={openEditModal}>Edit</Button>
            <Button className="px-3 py-1 text-sm" onClick={() => router.push(`/customers/${customer.id}/measurements`)}>Measurements</Button>
          </div>
        </div>
        <div className="text-neutral-700 mb-1">Email: {customer.email}</div>
        <div className="text-neutral-700 mb-1">Phone: {customer.phone}</div>
      </Card>
      <Card title="Parties">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="py-2">Name</th>
              <th className="py-2">Event Date</th>
            </tr>
          </thead>
          <tbody>
            {customerParties.map((p: any) => (
              <tr key={p.id} className="border-t">
                <td className="py-2">{p.name}</td>
                <td className="py-2">{p.eventDate.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Appointments">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="py-2">Party</th>
              <th className="py-2">Date/Time</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {customerAppointments.map((a: any) => (
              <tr key={a.id} className="border-t">
                <td className="py-2">{customerParties.find((p: any) => p.id === a.partyId)?.name || ''}</td>
                <td className="py-2">{a.dateTime.replace('T', ' ').slice(0, 16)}</td>
                <td className="py-2">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Alterations">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="py-2">Party</th>
              <th className="py-2">Notes</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {customerAlterations.map((a: any) => (
              <tr key={a.id} className="border-t">
                <td className="py-2">{customerParties.find((p: any) => p.id === a.partyId)?.name || ''}</td>
                <td className="py-2">{a.notes}</td>
                <td className="py-2">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Activity Log">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="py-2">Action</th>
              <th className="py-2">User</th>
              <th className="py-2">Time</th>
              <th className="py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {customerAudit.map((log: any) => (
              <tr key={log.id} className="border-t">
                <td className="py-2">{log.action}</td>
                <td className="py-2">{log.user?.name || ''}</td>
                <td className="py-2">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="py-2">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {/* Edit Customer Modal */}
      <Modal isOpen={editModalOpen}>
        <form onSubmit={handleEditCustomer} className="space-y-4 p-4 w-80">
          <h2 className="text-lg font-semibold mb-2">Edit Customer</h2>
          <Input
            placeholder="Name"
            value={editForm.name}
            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
            required
            aria-label="Name"
          />
          <Input
            type="email"
            placeholder="Email"
            value={editForm.email}
            onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
            required
            aria-label="Email"
          />
          <Input
            placeholder="Phone"
            value={editForm.phone}
            onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
            aria-label="Phone"
          />
          {editError && <div className="text-red-600 text-sm">{editError}</div>}
          <Button type="submit" className="w-full" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</Button>
        </form>
      </Modal>
    </div>
  );
} 