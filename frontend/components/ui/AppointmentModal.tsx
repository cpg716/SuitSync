import React, { useState, useEffect } from 'react';
import { AppointmentStatus, AppointmentType } from '../../src/types/appointments';
import { Button } from './Button';
import { Modal } from '@/components/ui/Modal';
import { AppointmentForm } from './AppointmentForm';
import { api } from '../../lib/apiClient';
import { format, parseISO } from 'date-fns';

export default function AppointmentModal({ open, onClose, onSubmit, appointment, loading }: any) {
  const [error, setError] = useState('');

  // Reset error when modal opens/closes
  useEffect(() => {
    if (open) {
      setError('');
    }
  }, [open]);

  // Convert appointment data to the format expected by AppointmentForm
  const convertAppointmentToFormData = (appointment: any) => {
    if (!appointment) {
      return {
        individualCustomerId: '',
        partyId: '',
        partyMemberId: '',
        dateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        type: 'fitting',
        status: 'scheduled',
        durationMinutes: 60,
        staffId: undefined,
        notes: '',
        recurrenceRule: ''
      };
    }

    return {
      individualCustomerId: appointment.individualCustomerId || '',
      partyId: appointment.partyId || '',
      partyMemberId: appointment.memberId || '',
      dateTime: appointment.dateTime ? format(parseISO(appointment.dateTime), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      type: appointment.type || 'fitting',
      status: appointment.status || 'scheduled',
      durationMinutes: appointment.durationMinutes || 60,
      staffId: appointment.staffId,
      notes: appointment.notes || '',
      recurrenceRule: appointment.recurrenceRule || ''
    };
  };

  // Convert form data back to the format expected by the API
  const convertFormDataToAppointment = (formData: any) => {
    return {
      id: appointment?.id,
      individualCustomerId: formData.individualCustomerId || undefined,
      partyId: formData.partyId || undefined,
      memberId: formData.partyMemberId || undefined,
      dateTime: formData.dateTime,
      type: formData.type,
      status: formData.status,
      durationMinutes: formData.durationMinutes,
      assignedStaffId: formData.assignedStaffId || undefined,
      notes: formData.notes,
      recurrenceRule: formData.recurrenceRule
    };
  };

  const handleSubmit = async (formData: any) => {
    try {
      setError('');
      const appointmentData = convertFormDataToAppointment(formData);
      await onSubmit(appointmentData);
      // Close modal after successful submission
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving appointment');
    }
  };

  const handleCancel = () => {
    setError('');
    onClose();
  };

  return (
    <Modal 
      open={open} 
      onClose={handleCancel} 
      title={appointment ? 'Edit Appointment' : 'New Appointment'} 
      size="xl"
    >
      <div className="space-y-4">
        {error && (
          <div className="text-red-500 bg-red-100 dark:bg-red-900/20 dark:text-red-300 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <AppointmentForm
          initialData={convertAppointmentToFormData(appointment)}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={loading}
          isEdit={!!appointment}
        />
      </div>
    </Modal>
  );
}