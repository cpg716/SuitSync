import { useState } from 'react';

function TagPreview({ job }) {
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

export default function TagPrint() {
  const [jobId, setJobId] = useState('');
  const [job, setJob] = useState(null);
  const [format, setFormat] = useState('html');
  const [preview, setPreview] = useState('');

  const fetchJob = async () => {
    if (!jobId) return;
    const res = await fetch(`/api/alterations/${jobId}`);
    const data = await res.json();
    setJob({
      ...data,
      customerName: data.party?.customer?.name,
      tailorName: data.tailor?.name,
      remarks: data.notes,
    });
    if (format === 'zpl') {
      const zplRes = await fetch('/api/print/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, format: 'zpl' })
      });
      setPreview(await zplRes.text());
    } else {
      setPreview('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="mb-4 flex gap-2 items-end">
          <input className="border p-2 rounded w-32" placeholder="Job ID" value={jobId} onChange={e => setJobId(e.target.value)} />
          <select className="border p-2 rounded" value={format} onChange={e => setFormat(e.target.value)}>
            <option value="html">HTML</option>
            <option value="zpl">ZPL</option>
          </select>
          <button className="px-4 py-2 bg-primary text-white rounded" onClick={fetchJob}>Preview</button>
          {format === 'html' && job && (
            <button className="ml-2 px-4 py-2 bg-accent text-black rounded print:hidden" onClick={() => window.print()}>Print</button>
          )}
        </div>
        {format === 'html' ? (
          <TagPreview job={job} />
        ) : (
          <div className="border p-2 rounded bg-neutral-50 dark:bg-neutral-900 whitespace-pre-wrap min-h-[60px]">{preview}</div>
        )}
      </div>
    </div>
  );
} 