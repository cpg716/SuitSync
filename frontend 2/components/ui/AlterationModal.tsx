import React, { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import dynamic from 'next/dynamic';
import Modal from './Modal';
import { api } from '../../lib/apiClient';
import { format } from 'date-fns';
const QrReader = dynamic(() => import('react-qr-reader'), { ssr: false });

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
}

interface Party {
  id: string;
  name: string;
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

export default function AlterationModal({ open, onClose, onSubmit, alteration, loading }: AlterationModalProps) {
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

  // Fetch required data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partiesRes, customersRes, tailorsRes] = await Promise.all([
          api.get('/api/parties'),
          api.get('/api/customers'),
          api.get('/api/users?role=tailor')
        ]);

        setParties(partiesRes.data || []);
        setCustomers(customersRes.data || []);
        setTailors(tailorsRes.data || []);
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
    <Modal
      open={open}
      onClose={onClose}
      title={alteration ? 'Edit Alteration' : 'New Alteration'}
    >
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
                  {parties.map(party => (
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
                  {customers.map(customer => (
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
                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Assign Tailor</label>
                <select
                  value={formData.tailorId}
                  onChange={(e) => handleChange('tailorId', e.target.value)}
                  className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                >
                  <option value="">Select Tailor</option>
                  {tailors.map(tailor => (
                    <option key={tailor.id} value={tailor.id}>
                      {tailor.name}
                    </option>
                  ))}
                </select>
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