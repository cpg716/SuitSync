// CreateAlterationModal
// Wrapper that loads customers/parties and renders the new AlterationJobModal.
// Ensures the modal fits the viewport (no horizontal scroll) and passes data down.
import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import AlterationJobModal from './AlterationJobModal';
import { api } from '../../lib/apiClient';
import type { Party } from '../../src/types/parties';

export default function CreateAlterationModal({ open, onClose }: { open: boolean; onClose: ()=>void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [customersRes, partiesRes] = await Promise.all([
          api.get('/api/customers'),
          api.get('/api/parties'),
        ]);
        if (!mounted) return;
        const crd: any = customersRes.data as any;
        const customersData = Array.isArray(crd?.customers)
          ? crd.customers
          : Array.isArray(crd)
          ? crd
          : [];
        setCustomers(customersData);
        setParties(Array.isArray(partiesRes.data) ? partiesRes.data : []);
      } catch {
        setCustomers([]);
        setParties([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open]);

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-[95vw] max-w-3xl">
        <AlterationJobModal
          open={open}
          onClose={onClose}
          onSubmit={async (jobData: any) => {
            // Submission handled inside AlterationJobModal; this is a passthrough
          }}
          customers={customers}
          parties={parties}
        />
      </div>
    </Modal>
  );
}


