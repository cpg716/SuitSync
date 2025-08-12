import { useState } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '../../components/ToastContext';
import { useAuth } from '../../src/AuthContext';
import { simpleFetcher } from '@/lib/simpleApiClient';
import { api } from '@/lib/apiClient';
import { ResourceSyncStatus } from '@/components/ResourceSyncStatus';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle, 
  Search, 
  Plus, 
  Users, 
  TrendingUp, 
  Clock, 
  PieChart 
} from 'lucide-react';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { CustomerAvatar } from '@/components/ui/CustomerAvatar';

interface Customer {
  id: number;
  first_name?: string;
  last_name?: string;
  email: string;
  phone: string;
  lightspeedId: string;
  parties: any[];
  measurements: any;
  display_name?: string;
}

interface PaginationData {
  total: number;
  pages: number;
  current: number;
  limit: number;
}

export default function CustomersPage() {
  const isClient = typeof window !== 'undefined';
  const router = isClient ? useRouter() : null;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();
  const { user } = useAuth();
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncPreview, setSyncPreview] = useState<{ new: number; updated: number; unchanged: number; total: number } | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const { data, error, mutate, isLoading } = useSWR<{ customers: Customer[], pagination: PaginationData }>(
    `/api/customers?search=${search}&page=${page}&limit=10`,
    simpleFetcher,
    {
      refreshInterval: 30000,
      revalidateOnFocus: false,
      dedupingInterval: 10000
    }
  );

  const customers = data?.customers || [];
  const pagination = data?.pagination;

  // Summary data for hero section
  const summary = {
    totalCustomers: pagination?.total || 0,
    customersWithParties: customers.filter(c => c.parties && c.parties.length > 0).length,
    customersWithMeasurements: customers.filter(c => c.measurements).length,
    activeCustomers: customers.filter(c => c.parties && c.parties.length > 0).length,
  };



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
      const { data: newCustomer } = await api.post('/api/customers', addForm);
      setAddModalOpen(false);
      setAddForm({ name: '', email: '', phone: '', address: '' });
      mutate();
      success('Customer created successfully');
      if (newCustomer && typeof newCustomer === 'object' && 'id' in newCustomer) {
        router?.push(`/customers/${newCustomer.id}`);
      }
    } catch (err) {
      let message = 'Could not create customer';
      if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data && typeof err.response.data.message === 'string') {
        message = err.response.data.message || message;
      }
      toastError(message);
    } finally {
      setSaving(false);
    }
  }

  // Handler for sync button
  const handleSyncClick = async () => {
    setSyncModalOpen(true);
    setSyncLoading(true);
    setSyncError(null);
    setSyncPreview(null);
    try {
      // Simulate step-by-step checks for a more visual checklist
      const steps = [
        { key: 'new', label: 'Checking for new customers' },
        { key: 'updated', label: 'Checking for updated customers' },
        { key: 'unchanged', label: 'Checking for unchanged customers' },
      ];
      let preview: any = {};
      for (let i = 0; i < steps.length; i++) {
        // Simulate network delay for each step
        await new Promise(res => setTimeout(res, 400));
        if (i === 0) {
          const res = await api.get('/api/sync/customers/preview');
          preview = res.data;
        }
        setSyncPreview(prev => ({ ...preview, _step: i + 1 }));
      }
    } catch (err: any) {
      setSyncError(err?.response?.data?.message || 'Failed to check for updates');
    } finally {
      setSyncLoading(false);
    }
  };

  // Handler for confirming sync
  const handleConfirmSync = async () => {
    setSyncLoading(true);
    setSyncError(null);
    try {
      await api.post('/api/sync/customers');
      setSyncModalOpen(false);
      setSyncPreview(null);
      success('Customer sync started');
    } catch (err: any) {
      setSyncError(err?.response?.data?.message || 'Failed to start sync');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-xl shadow-lg p-8 flex flex-col md:flex-row items-center gap-6 animate-fade-in">
        <div className="flex-1">
          <h1 className="text-4xl font-extrabold text-white mb-2 drop-shadow-lg">Customer Management</h1>
          <p className="text-lg text-blue-100 mb-4">Manage all your customers and their information.</p>
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="lg" showName />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
            <PieChart className="w-12 h-12 text-white" />
          </div>
          <span className="text-white text-sm font-semibold">{summary.customersWithParties} / {summary.totalCustomers} Active</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <CardTitle>Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-200 animate-countup">{summary.totalCustomers}</div>
            <div className="text-sm text-blue-500">registered</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <CardTitle>With Parties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-200 animate-countup">{summary.customersWithParties}</div>
            <div className="text-sm text-green-500">have events</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingUp className="w-6 h-6 text-purple-600" />
            <CardTitle>With Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-200 animate-countup">{summary.customersWithMeasurements}</div>
            <div className="text-sm text-purple-500">measured</div>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50 dark:bg-indigo-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" />
            <CardTitle>Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-200 animate-countup">{summary.activeCustomers}</div>
            <div className="text-sm text-indigo-500">recent activity</div>
          </CardContent>
        </Card>
      </div>

      {/* Streamlined Action Bar - All in One Row */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
        {/* Search Section */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 w-full sm:w-auto">
          <div className="flex-1 relative min-w-0">
            <Input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full h-10 sm:h-11 text-sm sm:text-base"
            />
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <Button type="submit" className="flex-shrink-0 px-4 sm:px-6 min-h-[44px] sm:min-h-[40px] text-sm sm:text-base touch-manipulation">
            Search
          </Button>
        </form>

        {/* Sync Status and Controls */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto justify-between sm:justify-start">
          <ResourceSyncStatus resource="customers" onSyncClick={handleSyncClick} />
          {user?.role === 'admin' && (
            <Button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-1 sm:gap-2 bg-primary text-white hover:bg-primary/90 px-3 sm:px-4 min-h-[44px] sm:min-h-[40px] text-sm sm:text-base touch-manipulation"
            >
              <Plus size={18} />
              <span className="hidden xs:inline">Add Customer</span>
              <span className="xs:hidden">Add</span>
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
                        <div className="min-w-0 flex items-center gap-3">
                          <CustomerAvatar
                            name={`${customer.first_name || ''} ${customer.last_name || ''}`.trim()}
                            phone={customer.phone}
                            email={customer.email}
                            size="md"
                          />
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {customer.display_name || `${customer.last_name || ''}${customer.last_name && customer.first_name ? ', ' : ''}${customer.first_name || ''}`.trim() || 'N/A'}
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
                          onClick={() => router?.push(`/customers/${customer.id}`)}
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
                  <div key={customer.id} className="p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors active:bg-gray-100 dark:active:bg-gray-800">
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0 flex-1 flex items-start gap-3">
                        <CustomerAvatar
                          name={`${customer.first_name || ''} ${customer.last_name || ''}`.trim()}
                          phone={customer.phone}
                          email={customer.email}
                          size="md"
                        />
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                            {customer.display_name || `${customer.last_name || ''}${customer.last_name && customer.first_name ? ', ' : ''}${customer.first_name || ''}`.trim() || 'N/A'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {customer.email || '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 mb-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">Phone</p>
                        <p className="text-gray-900 dark:text-gray-100 mt-1">{customer.phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">Parties</p>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 mt-1">
                          {customer.parties?.length || 0}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        {customer.measurements ? (
                          <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            Measurements Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                            Measurements Pending
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router?.push(`/customers/${customer.id}`)}
                        className="text-primary dark:text-accent min-h-[44px] px-4 touch-manipulation"
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

            {/* Pagination Controls */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  Showing {((pagination.current - 1) * pagination.limit) + 1} to {Math.min(pagination.current * pagination.limit, pagination.total)} of {pagination.total} customers
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    Previous
                  </Button>
                  {/* Numbered pagination */}
                  {(() => {
                    const pages = [];
                    const totalPages = pagination.pages;
                    const current = pagination.current;
                    let start = Math.max(1, current - 2);
                    let end = Math.min(totalPages, current + 2);
                    if (current <= 3) {
                      end = Math.min(5, totalPages);
                    } else if (current >= totalPages - 2) {
                      start = Math.max(1, totalPages - 4);
                    }
                    if (start > 1) {
                      pages.push(
                        <Button key={1} variant={current === 1 ? 'default' : 'ghost'} size="sm" onClick={() => setPage(1)}>
                          1
                        </Button>
                      );
                      if (start > 2) pages.push(<span key="start-ellipsis">...</span>);
                    }
                    for (let i = start; i <= end; i++) {
                      pages.push(
                        <Button key={i} variant={current === i ? 'default' : 'ghost'} size="sm" onClick={() => setPage(i)}>
                          {i}
                        </Button>
                      );
                    }
                    if (end < totalPages) {
                      if (end < totalPages - 1) pages.push(<span key="end-ellipsis">...</span>);
                      pages.push(
                        <Button key={totalPages} variant={current === totalPages ? 'default' : 'ghost'} size="sm" onClick={() => setPage(totalPages)}>
                          {totalPages}
                        </Button>
                      );
                    }
                    return pages;
                  })()}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
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

          {/* Sync Preview Modal */}
          <Modal open={syncModalOpen} onClose={() => setSyncModalOpen(false)}>
            <div className="p-6 min-w-[340px] max-w-xs">
              <h2 className="text-lg font-bold mb-2">Customer Sync Preview</h2>
              {syncLoading && (
                <div className="py-4 text-center">
                  <Loader2 className="animate-spin mx-auto mb-2 text-blue-500" size={32} />
                  <div className="text-sm text-gray-600">Checking for updates...</div>
                </div>
              )}
              {syncError && (
                <div className="py-2 text-red-600 flex flex-col items-center">
                  <AlertTriangle className="mb-1" />
                  <div>{syncError}</div>
                  <Button variant="outline" className="mt-3" onClick={handleSyncClick}>Retry</Button>
                </div>
              )}
              {syncPreview && !syncLoading && !syncError && (
                <div className="space-y-4">
                  <div className="mb-2">
                    <div className="font-semibold text-base mb-1">Summary</div>
                    <div className="flex gap-2 items-center">
                      <CheckCircle className="text-green-500" size={20} />
                      <span className="text-green-700 font-medium">{syncPreview.new} new</span>
                      <CheckCircle className="text-green-500" size={20} />
                      <span className="text-green-700 font-medium">{syncPreview.updated} updated</span>
                      <CheckCircle className="text-gray-400" size={20} />
                      <span className="text-gray-600">{syncPreview.unchanged} unchanged</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Total in Lightspeed: {syncPreview.total}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <div className="font-medium mb-2 text-gray-700 dark:text-gray-200">Checks</div>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="text-green-500" size={18} />
                        <span>New customers: <span className="font-semibold">{syncPreview.new}</span></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="text-green-500" size={18} />
                        <span>Updated customers: <span className="font-semibold">{syncPreview.updated}</span></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="text-green-500" size={18} />
                        <span>Unchanged customers: <span className="font-semibold">{syncPreview.unchanged}</span></span>
                      </li>
                    </ul>
                  </div>
                  <div className="flex gap-2 mt-4 justify-end">
                    <Button variant="secondary" onClick={() => setSyncModalOpen(false)} disabled={syncLoading}>Cancel</Button>
                    <Button onClick={handleConfirmSync} disabled={syncLoading}>Sync</Button>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}