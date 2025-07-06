import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { Modal } from './Modal';
import { TailorSelect } from './UserSelect';
import { api } from '../../lib/apiClient';
import { format } from 'date-fns';
import type { Party, TailorsResponse } from '../../src/types/parties';

// TypeScript interfaces
interface Alteration {
  id?: string;
  partyId: string;
  customerId: string;
  garmentType: string;
  status: string;
  priority: string;
  scheduledDate: string;
  estimatedMinutes: number;
  notes: string;
  tailorId: string;
  saleLineItemId?: string;
  itemDescription?: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Tailor {
  id: string;
  name: string;
}

interface AlterationModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Alteration) => Promise<void>;
  alteration?: Alteration | null;
  loading?: boolean;
}

// Constants
const ALTERATION_STATUSES = ['pending', 'in_progress', 'complete', 'canceled'];
const ALTERATION_PRIORITIES = ['low', 'medium', 'high'];
const GARMENT_TYPES = ['Suit', 'Jacket', 'Pants', 'Vest', 'Shirt', 'Dress', 'Other'];

export const AlterationModal = function({ open, onClose, onSubmit, alteration, loading }: AlterationModalProps) {
  // State for form fields
  const [formData, setFormData] = useState<Alteration>({
    partyId: alteration?.partyId || '',
    customerId: alteration?.customerId || '',
    garmentType: alteration?.garmentType || 'Suit',
    status: alteration?.status || 'pending',
    priority: alteration?.priority || 'medium',
    scheduledDate: alteration?.scheduledDate || format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    estimatedMinutes: alteration?.estimatedMinutes || 60,
    notes: alteration?.notes || '',
    tailorId: alteration?.tailorId || '',
  });

  // State for dynamic data
  const [parties, setParties] = useState<Party[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [saleLineItems, setSaleLineItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch required data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partiesRes, customersRes, tailorsRes] = await Promise.all([
          api.get('/api/parties'),
          api.get('/api/customers'),
          api.get<TailorsResponse>('/api/users')
        ]);

        setParties(Array.isArray(partiesRes.data) ? partiesRes.data : []);
        setCustomers(Array.isArray(customersRes.data) ? customersRes.data : []);

        // Handle different response formats for users/tailors
        if (tailorsRes.data && Array.isArray(tailorsRes.data.users)) {
          // Use combined users list and filter for tailors
          const allUsers = tailorsRes.data.users || [];
          setTailors(allUsers.filter(u => u.role === 'tailor'));
        } else if (tailorsRes.data && Array.isArray(tailorsRes.data.lightspeedUsers)) {
          // Use lightspeed users and filter for tailors
          const lightspeedUsers = tailorsRes.data.lightspeedUsers || [];
          setTailors(lightspeedUsers.filter(u => u.role === 'tailor'));
        } else if (Array.isArray(tailorsRes.data)) {
          // Fallback for direct array response
          setTailors(tailorsRes.data.filter(u => u.role === 'tailor'));
        }

        setDataLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setDataLoading(false);
      }
    };

    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    // Mock fetching sale line items
    if (searchTerm) {
      api.get(`/api/sales/line_items?search=${searchTerm}`).then(res => {
        setSaleLineItems(Array.isArray(res.data) ? res.data : []);
      });
    } else {
      setSaleLineItems([]);
    }
  }, [searchTerm]);

  // Handle form changes
  const handleChange = (field: keyof Alteration, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save alteration');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={alteration ? 'Edit Alteration' : 'New Alteration'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded">
            {error}
          </div>
        )}

        {dataLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              {/* Party Selection */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Party</label>
                <select
                  value={formData.partyId}
                  onChange={(e) => handleChange('partyId', e.target.value)}
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="">Select Party</option>
                  {(Array.isArray(parties) ? parties : []).map(party => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Customer</label>
                <select
                  value={formData.customerId}
                  onChange={(e) => handleChange('customerId', e.target.value)}
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  required
                >
                  <option value="">Select Customer</option>
                  {(Array.isArray(customers) ? customers : []).map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Garment Type */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Garment Type</label>
                <select
                  value={formData.garmentType}
                  onChange={(e) => handleChange('garmentType', e.target.value)}
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  required
                >
                  {GARMENT_TYPES.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tailor Assignment */}
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">Assign Tailor</label>
                <TailorSelect
                  users={Array.isArray(tailors) ? tailors : []}
                  value={formData.tailorId}
                  onValueChange={(value) => handleChange('tailorId', value)}
                  placeholder="Select tailor..."
                  allowEmpty={true}
                  emptyLabel="No tailor assigned"
                  className="w-full"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  required
                >
                  {ALTERATION_STATUSES.map(status => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  required
                >
                  {ALTERATION_PRIORITIES.map(priority => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scheduled Date/Time */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Scheduled Date/Time</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledDate}
                  onChange={(e) => handleChange('scheduledDate', e.target.value)}
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  required
                />
              </div>

              {/* Estimated Duration */}
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Estimated Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.estimatedMinutes}
                  onChange={(e) => handleChange('estimatedMinutes', parseInt(e.target.value))}
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  min="15"
                  step="15"
                  required
                />
              </div>
            </div>

            {/* Sale Line Item Search */}
            <div className="mb-4">
              <label htmlFor="saleLineItemSearch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link Sale Item (Search by Product Name or SKU)
              </label>
              <Input
                id="saleLineItemSearch"
                name="saleLineItemSearch"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="e.g., 'Navy Suit' or '12345'"
              />
              {saleLineItems.length > 0 && (
                <ul className="border rounded-md mt-2 max-h-40 overflow-y-auto">
                  {saleLineItems.map((item: any) => (
                    <li
                      key={item.id}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, saleLineItemId: item.id, itemDescription: `${item.product.name} (SKU: ${item.sku})` }));
                        setSaleLineItems([]);
                        setSearchTerm('');
                      }}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      {item.product.name} - {item.sku} (Sale #{item.sale_id})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {formData.itemDescription && (
              <div className="mb-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                <p className="text-sm font-semibold">Selected Item:</p>
                <p className="text-sm">{formData.itemDescription}</p>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1 dark:text-gray-300">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                rows={4}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                onClick={onClose}
                className="bg-gray-500 hover:bg-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
                disabled={submitLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || submitLoading || dataLoading}
                className="bg-primary hover:bg-primary-dark relative"
              >
                {submitLoading ? (
                  <>
                    <span className="opacity-0">Save</span>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
} 