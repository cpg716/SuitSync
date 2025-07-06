import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { AppointmentForm } from '@/components/ui/AppointmentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useToast } from '@/components/ToastContext';
import { api } from '@/lib/apiClient';

interface AppointmentFormData {
  customerId?: number;
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
  const isClient = typeof window !== 'undefined';
  const router = isClient ? useRouter() : null;
  const { success, error } = useToast();
  const [tailors, setTailors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    dateTime: '',
    durationMinutes: 60,
    type: 'fitting',
    notes: '',
    tailorId: '',
    customerId: '',
    partyId: '',
    partyMemberId: '',
    autoScheduleNext: false
  });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);

  useEffect(() => {
    fetchTailors();
  }, []);

  const fetchTailors = async () => {
    try {
      const response = await api.get('/api/users?role=tailor,sales_management,admin');
      setTailors((response.data as any[]).filter((user: any) => 
        ['tailor', 'sales_management', 'admin'].includes(user.role)
      ));
    } catch (err) {
      console.error('Error fetching tailors:', err);
      error('Failed to load tailors');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setSelectedParty(null);
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      partyId: '',
      partyMemberId: ''
    }));
  };

  const handlePartyMemberSelect = (party, member) => {
    setSelectedParty(party);
    setSelectedCustomer(null);
    setFormData(prev => ({
      ...prev,
      partyId: party.id,
      partyMemberId: member.id,
      customerId: '',
      autoScheduleNext: true
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCustomer && !selectedParty) {
      error('Please select a customer or party member');
      return;
    }
    
    try {
      const submitData = {
        ...formData,
        customerId: formData.customerId ? parseInt(formData.customerId) : undefined,
        partyId: formData.partyId ? parseInt(formData.partyId) : undefined,
        partyMemberId: formData.partyMemberId ? parseInt(formData.partyMemberId) : undefined,
        tailorId: formData.tailorId ? parseInt(formData.tailorId) : undefined,
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
                tailors={tailors}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}