import React from 'react';

export default function TagPreview({ job }: { job: any }) {
  if (!job) return <div className="text-neutral-400">Select a job to preview the tag.</div>;
  return (
    <div className="bg-[#f8f4e3] rounded shadow p-6 w-[340px] mx-auto border border-neutral-300 print:w-full print:shadow-none print:border-none">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[22px] font-bold text-red-700 tracking-widest">{job.id?.toString().padStart(5, '0')}</span>
        <span className="text-xs font-bold">ALTERATION TAG</span>
      </div>
      <div className="text-xs mb-1">STATE ALTERATIONS ON BACK</div>
      <div className="text-xs mb-2">Date: {job.scheduledDateTime ? new Date(job.scheduledDateTime).toLocaleDateString() : ''}</div>
      <div className="text-xs mb-1">Name: {job.customerName || ''}</div>
      <div className="text-xs mb-1">Garment: {job.itemType || ''}</div>
      <div className="text-xs mb-1">Task(s): {job.notes || ''}</div>
      <div className="text-xs mb-1">Tailor: {job.tailorName || ''}</div>
      <div className="text-xs mb-1">Due: {job.scheduledDateTime ? new Date(job.scheduledDateTime).toLocaleDateString() : ''}</div>
      <div className="text-xs mb-1">Time Est: {job.estimatedTime || ''} min</div>
      <div className="text-xs mb-1">Remarks: {job.remarks || ''}</div>
      <div className="text-xs mt-4 border-t pt-2">NO GOODS DELIVERED WITHOUT THIS CHECK</div>
    </div>
  );
} 