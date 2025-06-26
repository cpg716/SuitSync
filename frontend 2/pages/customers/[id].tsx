import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Tabs from '../../components/ui/Tabs';
import { useToast } from '../../components/ToastContext';
import { Calendar, Ruler, Scissors } from '@phosphor-icons/react';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  lightspeedId: string;
  parties: any[];
  measurements: any;
}

const TABS = [
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'alterations', label: 'Alterations', icon: Scissors },
  { id: 'measurements', label: 'Measurements', icon: Ruler }
];

export default function CustomerProfile() {
  const router = useRouter();
  const { id } = router.query;
  const [activeTab, setActiveTab] = useState('appointments');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [editSaving, setEditSaving] = useState(false);
  const { success, error: toastError } = useToast();

  // Fetch customer data
  const { data: customer, mutate } = useSWR<Customer>(
    id ? `/api/customers/${id}` : null,
    { refreshInterval: 30000 }
  );

  // Fetch related data
  const { data: appointments = [] } = useSWR(
    id ? `/api/appointments?customerId=${id}` : null,
    { refreshInterval: 30000 }
  );
  const { data: alterations = [] } = useSWR(
    id ? `/api/alterations?customerId=${id}` : null,
    { refreshInterval: 30000 }
  );

  function openEditModal() {
    if (!customer) return;
    setEditForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone || '',
      address: customer.address || ''
    });
    setEditModalOpen(true);
  }

  async function handleEditCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.name || !editForm.email) {
      toastError('Name and email are required');
      return;
    }
    setEditSaving(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Failed to update customer');
      setEditModalOpen(false);
      mutate();
      success('Customer updated');
    } catch (err) {
      toastError('Could not update customer');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleUpdateMeasurements(measurements: any) {
    try {
      const res = await fetch(`/api/customers/${id}/measurements`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ measurements }),
      });
      if (!res.ok) throw new Error('Failed to update measurements');
      mutate();
      success('Measurements updated');
    } catch (err) {
      toastError('Could not update measurements');
    }
  }

  if (!customer) return <div className="p-8">Loading…</div>;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <div className="text-sm text-gray-500 mt-1">
              Customer ID: {customer.lightspeedId || 'Not synced'}
            </div>
          </div>
          <Button onClick={openEditModal}>Edit Customer</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500">Contact Information</div>
            <div className="mt-2 space-y-2">
              <div>Email: {customer.email}</div>
              <div>Phone: {customer.phone || 'Not provided'}</div>
              <div>Address: {customer.address || 'Not provided'}</div>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Summary</div>
            <div className="mt-2 space-y-2">
              <div>Parties: {customer.parties.length}</div>
              <div>Appointments: {appointments.length}</div>
              <div>Alterations: {alterations.length}</div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
        
        <div className="mt-6">
          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Appointments</h2>
                <Button onClick={() => router.push(`/create-appointment?customerId=${customer.id}`)}>
                  Add Appointment
                </Button>
              </div>
              {appointments.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {appointments.map((appt: any) => (
                      <tr key={appt.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4">{new Date(appt.dateTime).toLocaleString()}</td>
                        <td className="px-6 py-4">{appt.type}</td>
                        <td className="px-6 py-4">{appt.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500">No appointments found</div>
              )}
            </div>
          )}

          {activeTab === 'alterations' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Alterations</h2>
                <Button onClick={() => router.push(`/create-alteration?customerId=${customer.id}`)}>
                  Add Alteration
                </Button>
              </div>
              {alterations.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {alterations.map((alt: any) => (
                      <tr key={alt.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4">{new Date(alt.createdAt).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            alt.status === 'complete' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                          }`}>
                            {alt.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">{alt.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500">No alterations found</div>
              )}
            </div>
          )}

          {activeTab === 'measurements' && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Measurements</h2>
              <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const measurements = Object.fromEntries(formData.entries());
                handleUpdateMeasurements(measurements);
              }}>
                <div>
                  <label className="block text-sm font-medium mb-1">Chest</label>
                  <Input
                    type="text"
                    name="chest"
                    defaultValue={customer.measurements?.chest || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Waist (Jacket)</label>
                  <Input
                    type="text"
                    name="waistJacket"
                    defaultValue={customer.measurements?.waistJacket || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hips</label>
                  <Input
                    type="text"
                    name="hips"
                    defaultValue={customer.measurements?.hips || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Shoulder Width</label>
                  <Input
                    type="text"
                    name="shoulderWidth"
                    defaultValue={customer.measurements?.shoulderWidth || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Sleeve Length</label>
                  <Input
                    type="text"
                    name="sleeveLength"
                    defaultValue={customer.measurements?.sleeveLength || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Jacket Length</label>
                  <Input
                    type="text"
                    name="jacketLength"
                    defaultValue={customer.measurements?.jacketLength || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Trouser Waist</label>
                  <Input
                    type="text"
                    name="trouserWaist"
                    defaultValue={customer.measurements?.trouserWaist || ''}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Inseam</label>
                  <Input
                    type="text"
                    name="inseam"
                    defaultValue={customer.measurements?.inseam || ''}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <Input
                    type="text"
                    name="notes"
                    defaultValue={customer.measurements?.notes || ''}
                  />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit" className="w-full">Save Measurements</Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </Card>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <form onSubmit={handleEditCustomer} className="space-y-4">
          <h2 className="text-xl font-bold mb-4">Edit Customer</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Input
              type="text"
              value={editForm.name}
              onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              value={editForm.email}
              onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <Input
              type="tel"
              value={editForm.phone}
              onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <Input
              type="text"
              value={editForm.address}
              onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" onClick={() => setEditModalOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={editSaving}>
              {editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
} 