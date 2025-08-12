import React from 'react';
import CreatePartyPage from '../../pages/create-party';
import { Modal } from './Modal';

export default function CreatePartyModal({ open, onClose }: { open: boolean; onClose: ()=>void }) {
  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} size="full" className="md:max-w-[1000px] lg:max-w-[1200px]">
      <div className="w-[95vw] md:w-[900px] lg:w-[1100px]">
        <CreatePartyPage />
      </div>
    </Modal>
  );
}


