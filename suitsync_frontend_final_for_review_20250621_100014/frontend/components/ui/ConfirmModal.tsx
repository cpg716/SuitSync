import React from 'react';
import Card from './Card';
import Button from './Button';

export default function ConfirmModal({ open, onClose, onConfirm, loading, title, message }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <Card className="max-w-md w-full p-6 relative bg-white dark:bg-black text-black dark:text-white">
        <button className="absolute top-2 right-2 text-xl text-black dark:text-white" onClick={onClose}>&times;</button>
        <h2 className="text-lg font-bold mb-4 text-black dark:text-white">{title}</h2>
        <p className="mb-6 text-black dark:text-white">{message}</p>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={loading} className="bg-blue text-white">Cancel</Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-red text-white">{loading ? 'Deleting...' : 'Confirm'}</Button>
        </div>
      </Card>
    </div>
  );
} 