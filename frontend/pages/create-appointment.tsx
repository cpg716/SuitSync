import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { AppointmentForm } from '@/components/ui/AppointmentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useToast } from '@/components/ToastContext';
import { api } from '@/lib/apiClient';

interface AppointmentFormData {
  individualCustomerId?: number;
  partyId?: number;
  partyMemberId?: number;
  dateTime: string;
  durationMinutes: number;
  type: 'first_fitting' | 'alterations_fitting' | 'pickup' | 'fitting';
  notes: string;
  tailorId?: number;
  autoScheduleNext: boolean;
}

export default function CreateAppointment() {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);
  const [formData, setFormData] = useState<AppointmentFormData>({
    individualCustomerId: undefined,
    partyId: undefined,
    partyMemberId: undefined,
    dateTime: '',
    durationMinutes: 60,
    type: 'fitting',
    notes: '',
    autoScheduleNext: false
  });

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setSelectedParty(null);
    setFormData(prev => ({
      ...prev,
      individualCustomerId: customer.id,
      partyId: undefined,
      partyMemberId: undefined,
      autoScheduleNext: false
    }));
  };

  const handlePartyMemberSelect = (party, member) => {
    setSelectedParty(party);
    setSelectedCustomer(null);
    setFormData(prev => ({
      ...prev,
      partyId: party.id,
      partyMemberId: member.id,
      individualCustomerId: undefined,
      autoScheduleNext: true
    }));
  };

  const handleSubmit = async (formData) => {
    if (!selectedCustomer && !selectedParty) {
      error('Please select a customer or party member');
      return;
    }
    
    try {
      const submitData = {
        ...formData,
        individualCustomerId: formData.individualCustomerId ? parseInt(formData.individualCustomerId) : undefined,
        partyId: formData.partyId ? parseInt(formData.partyId) : undefined,
        partyMemberId: formData.partyMemberId ? parseInt(formData.partyMemberId) : undefined,
        durationMinutes: typeof formData.durationMinutes === 'string' ? parseInt(formData.durationMinutes) : Number(formData.durationMinutes)
      };
      
      const response = await api.post('/api/appointments', submitData);
      
      if ((response.data as any).workflowTriggered) {
        success('Appointment created successfully with automated workflow triggers');
      } else {
        success('Appointment created successfully');
      }
      
      router.push('/appointments');
    } catch (err) {
      console.error('Error creating appointment:', err);
      let errorMessage = 'Failed to create appointment';
      if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'error' in err.response.data) {
        errorMessage = err.response.data.error || errorMessage;
      }
      error(errorMessage);
    }
  };

  const handleCancel = () => {
    router.push('/appointments');
  };

  if (loading) {
    return (
      <Layout title="Create Appointment">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Create Appointment">
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Schedule New Appointment</CardTitle>
              <p className="text-gray-600 dark:text-gray-400">
                Create appointments for individual customers or wedding party members with automated workflow support.
              </p>
            </CardHeader>
            <CardContent>
              <AppointmentForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}