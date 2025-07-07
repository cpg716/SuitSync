import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { api, fetcher } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useToast } from '@/components/ToastContext';
import { User, Calendar, Ruler, Scissors, Edit, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Party } from '../../src/types/parties';
import type { MeasurementData } from '../../src/types/measurements';

// --- INTERFACES ---
interface Measurement {
  chest?: string;
  waistJacket?: string;
  hips?: string;
  shoulderWidth?: string;
  sleeveLength?: string;
  jacketLength?: string;
  waistPants?: string;
  inseam?: string;
  outseam?: string;
}
interface Alteration { id: number; createdAt: string; status: string; notes: string; }
interface Appointment { id: number; dateTime: string; type: string; notes: string; }
interface Customer {
  id: number;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  address?: string;
  lightspeedId?: string;
  parties: Party[];
  measurements?: Measurement;
  appointments: Appointment[];
  alterations: Alteration[];
}

// --- SUB-COMPONENTS ---

function CustomerHeader({ customer, onEdit }) {
  if (!customer) return <Skeleton className="h-48 w-full" />;
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <User className="w-12 h-12 text-gray-400" />
            <div>
              <CardTitle className="text-2xl">{`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'N/A'}</CardTitle>
              <p className="text-sm text-gray-500">Lightspeed ID: {customer.lightspeedId || 'N/A'}</p>
            </div>
          </div>
          <Button onClick={onEdit} variant="outline"><Edit className="mr-2 h-4 w-4" />Edit</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold mb-1">Contact Information</h4>
            <p><strong>Email:</strong> {customer.email}</p>
            <p><strong>Phone:</strong> {customer.phone || 'Not provided'}</p>
            <p><strong>Address:</strong> {customer.address || 'Not provided'}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Activity Summary</h4>
            <p><strong>Parties:</strong> {customer.parties?.length || 0}</p>
            <p><strong>Appointments:</strong> {customer.appointments?.length || 0}</p>
            <p><strong>Alterations:</strong> {customer.alterations?.length || 0}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AppointmentsTab({ customerId, appointments }) {
  const router = useRouter();
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => router.push(`/create-appointment?customerId=${customerId}`)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Appointment
        </Button>
      </div>
      {appointments?.length > 0 ? (
        <table className="w-full text-sm">
          {/* Table for appointments */}
        </table>
      ) : <p>No appointments found.</p>}
    </div>
  );
}

function AlterationsTab({ customerId, alterations }) {
  const router = useRouter();
  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => router.push(`/create-alteration?customerId=${customerId}`)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Alteration Job
        </Button>
      </div>
      {alterations?.length > 0 ? (
        <table className="w-full text-sm">
          {/* Table for alterations */}
        </table>
      ) : <p>No alterations found.</p>}
    </div>
  );
}

function MeasurementsTab({ measurements, customerId, onSave }) {
  const [formState, setFormState] = useState(measurements || {});
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formState);
    setIsSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
       <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Input fields for measurements */}
       </div>
       <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Measurements'}
       </Button>
    </form>
  );
}

function EditCustomerModal({ isOpen, onClose, customer, onSave }) {
  const [formData, setFormData] = useState(customer);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(customer);
  }, [customer]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    onClose();
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Edit Customer">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Form fields for editing customer */}
        <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
      </form>
    </Modal>
  );
}


// --- MAIN PAGE COMPONENT ---

export default function CustomerProfilePage() {
  const router = useRouter();
  const { id } = router.query;
  const { success, error: toastError } = useToast();
  
  const { data: customer, error: customerError, mutate } = useSWR<Customer>(
    id ? `/api/customers/${id}` : null,
    fetcher as (url: string) => Promise<Customer>
  );

  const [isEditModalOpen, setEditModalOpen] = useState(false);

  const handleSaveCustomer = async (formData) => {
    try {
      await api.put(`/api/customers/${id}`, formData);
      mutate(); // Re-fetch data
      success('Customer updated successfully.');
    } catch (err) {
      toastError('Failed to update customer.');
    }
  };

  const handleSaveMeasurements = async (measurementsData) => {
    try {
      await api.put(`/api/customers/${id}/measurements`, measurementsData);
      mutate();
      success('Measurements saved.');
    } catch (err) {
      toastError('Failed to save measurements.');
    }
  };

  if (customerError) return <div className="p-8 text-red-500">Failed to load customer data. Please try again.</div>;
  if (!customer) return <div className="p-8"><Skeleton className="h-48 w-full" /></div>;

  return (
    <div className="space-y-6 p-4">
      <CustomerHeader customer={customer} onEdit={() => setEditModalOpen(true)} />

      <Tabs defaultValue="appointments" className="w-full">
        <TabsList>
          <TabsTrigger value="appointments"><Calendar className="mr-2 h-4 w-4" />Appointments</TabsTrigger>
          <TabsTrigger value="alterations"><Scissors className="mr-2 h-4 w-4" />Alterations</TabsTrigger>
          <TabsTrigger value="measurements"><Ruler className="mr-2 h-4 w-4" />Measurements</TabsTrigger>
        </TabsList>
        <TabsContent value="appointments" className="mt-4">
          <AppointmentsTab customerId={customer.id} appointments={customer.appointments} />
        </TabsContent>
        <TabsContent value="alterations" className="mt-4">
          <AlterationsTab customerId={customer.id} alterations={customer.alterations} />
        </TabsContent>
        <TabsContent value="measurements" className="mt-4">
          <MeasurementsTab measurements={customer.measurements} customerId={customer.id} onSave={handleSaveMeasurements} />
        </TabsContent>
      </Tabs>
      
      {isEditModalOpen && (
        <EditCustomerModal
          isOpen={isEditModalOpen}
          onClose={() => setEditModalOpen(false)}
          customer={customer}
          onSave={handleSaveCustomer}
        />
      )}
    </div>
  );
}

// Using imported fetcher from apiClient