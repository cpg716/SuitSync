import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { Card } from '@/components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../src/AuthContext';
import { MagnifyingGlass, Plus, Users } from '@phosphor-icons/react';
import { api } from '@/lib/apiClient';
import { ResourceSyncStatus } from '@/components/ResourceSyncStatus';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  lightspeedId: string;
  parties: any[];
  measurements: any;
}

interface PaginationData {
  total: number;
  pages: number;
  current: number;
  limit: number;
}

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();
  const { user } = useAuth();

  const fetcher = (url: string): Promise<{ customers: Customer[]; pagination: PaginationData; }> => Promise.resolve(api.get(url)).then(res => res.data as { customers: Customer[]; pagination: PaginationData; });

  const { data, error, mutate, isLoading } = useSWR<{ customers: Customer[], pagination: PaginationData }>(
    `/customers?search=${search}&page=${page}&limit=10`,
    fetcher
  );

  const customers = data?.customers || [];
  const pagination = data?.pagination;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    mutate();
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name || !addForm.email) {
      toastError('Name and email are required');
      return;
    }

    setSaving(true);
    try {
      const { data: newCustomer } = await api.post('/customers', addForm);
      setAddModalOpen(false);
      setAddForm({ name: '', email: '', phone: '', address: '' });
      mutate();
      success('Customer created successfully');
      if (newCustomer && typeof newCustomer === 'object' && 'id' in newCustomer) {
        router.push(`/customers/${newCustomer.id}`);
      }
    } catch (err) {
      toastError(err.response?.data?.message || 'Could not create customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Streamlined Action Bar - All in One Row */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
        {/* Search Section */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
          <div className="flex-1 relative min-w-0">
            <Input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full"
            />
            <MagnifyingGlass size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <Button type="submit" className="flex-shrink-0">
            Search
          </Button>
        </form>
        
        {/* Sync Status and Controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <ResourceSyncStatus resource="customers" />
          {user?.role === 'admin' && (
            <Button 
              onClick={() => setAddModalOpen(true)} 
              className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90"
            >
              <Plus size={20} />
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {isLoading && <div className="text-center py-12">Loading customers...</div>}
      {error && <div className="text-center py-12 text-red-500">Failed to load customers. Please try again.</div>}

      {!isLoading && !error && (
        <>
          <Card className="overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Customer</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Contact</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Parties</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Measurements</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {(Array.isArray(customers) && customers.length > 0) ? customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-accent/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary dark:text-accent">
                              {customer.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {customer.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-gray-100">{customer.email || '—'}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{customer.phone || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          {customer.parties?.length || 0} parties
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {customer.measurements ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => router.push(`/customers/${customer.id}`)}
                          className="text-primary dark:text-accent hover:underline"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <Users size={48} className="text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No customers found</h3>
                          <p className="mt-2 text-sm text-gray-500">
                            {search ? 'Try adjusting your search terms.' : 'Get started by adding your first customer.'}
                          </p>
                          {!search && user?.role === 'admin' && (
                            <Button 
                              onClick={() => setAddModalOpen(true)} 
                              className="mt-4"
                            >
                              Add Customer
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {(Array.isArray(customers) && customers.length > 0) ? customers.map((customer) => (
                  <div key={customer.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="h-12 w-12 rounded-full bg-primary/10 dark:bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-primary dark:text-accent">
                            {customer.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                            {customer.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {customer.email || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Phone</p>
                        <p className="text-gray-900 dark:text-gray-100">{customer.phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Parties</p>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          {customer.parties?.length || 0}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        {customer.measurements ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            Measurements Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                            Measurements Pending
                          </span>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => router.push(`/customers/${customer.id}`)}
                        className="text-primary dark:text-accent"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="p-6 text-center">
                    <div className="flex flex-col items-center">
                      <Users size={48} className="text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No customers found</h3>
                      <p className="mt-2 text-sm text-gray-500">
                        {search ? 'Try adjusting your search terms.' : 'Get started by adding your first customer.'}
                      </p>
                      {!search && user?.role === 'admin' && (
                        <Button 
                          onClick={() => setAddModalOpen(true)} 
                          className="mt-4"
                        >
                          Add Customer
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)}>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Add New Customer</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input
                  type="text"
                  value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Input
                  type="email"
                  value={addForm.email}
                  onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input
                  type="tel"
                  value={addForm.phone}
                  onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <Input
                  type="text"
                  value={addForm.address}
                  onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" onClick={() => setAddModalOpen(false)} variant="secondary">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Customer'}
                </Button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}