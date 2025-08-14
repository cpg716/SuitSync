import React from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Button } from './Button';
import { UserAvatar } from './UserAvatar';
import { CustomerSearch } from './CustomerSearchSimple';
import { useToast } from '../ToastContext';

interface TaskWizardModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const TaskWizardModal: React.FC<TaskWizardModalProps> = ({ open, onClose, onCreated }) => {
  const [step, setStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [users, setUsers] = React.useState<any[]>([]);
  const toast = useToast();

  // Form state
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [priority, setPriority] = React.useState<Priority>('MEDIUM');
  const [estimatedMinutes, setEstimatedMinutes] = React.useState<number>(60);
  const [assignUserIds, setAssignUserIds] = React.useState<string[]>([]);
  const [dueDate, setDueDate] = React.useState('');
  const [customerId, setCustomerId] = React.useState<string>('');

  React.useEffect(() => {
    if (!open) return;
    fetch('/api/public/users').then(r => r.json()).then(setUsers).catch(() => setUsers([]));
  }, [open]);

  const canNext = () => {
    if (step === 0) return title.trim().length > 0;
    if (step === 1) return assignUserIds.length > 0; // must pick at least one assignee
    return true;
  };

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
        title,
        description,
        priority,
        assignedToId: Number(assignUserIds[0]),
        dueDate: dueDate || undefined,
        estimatedMinutes: estimatedMinutes || undefined,
        customerId: customerId ? Number(customerId) : undefined
      };
      
      console.log('Creating task with payload:', payload);
      
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      
      const task = await res.json();
      console.log('Task created successfully:', task);
      
      toast.success('Task created successfully');
      
      onClose();
      onCreated();
    } catch (error: any) {
      console.error('Failed to create task:', error);
      toast.error(error.message || "Failed to create task. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Task" size="lg">
      <div className="space-y-4">
        {/* Stepper */}
        <div className="flex items-center gap-2 text-sm">
          {["Basics","Assign","Customer","Review"].map((label, idx) => (
            <div key={label} className={`flex items-center gap-2 ${idx === step ? 'font-semibold' : 'text-gray-500'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${idx <= step ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{idx+1}</div>
              <span>{label}</span>
              {idx < 3 && <div className="w-8 h-[2px] bg-gray-300" />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm">Title *</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Call customer for pickup" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Description (optional)</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Notes or context" />
            </div>
            <div>
              <label className="text-sm">Priority</label>
              <select className="w-full border rounded px-2 py-2" value={priority} onChange={e => setPriority(e.target.value as Priority)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-sm">Estimated Minutes</label>
              <Input type="number" min={1} max={480} value={estimatedMinutes} onChange={e => setEstimatedMinutes(Number(e.target.value))} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm">Assign Users *</label>
              <div className="max-h-48 overflow-auto border rounded p-2">
                {users.map((u:any)=> (
                  <label key={u.id} className="flex items-center gap-2 py-1">
                    <input type="checkbox" checked={assignUserIds.includes(String(u.id))} onChange={e=> setAssignUserIds(arr => e.target.checked ? [...arr, String(u.id)] : arr.filter(x => x !== String(u.id)))} />
                    <span className="flex items-center gap-2"><UserAvatar user={{ id:u.id, name:u.name, photoUrl:u.photoUrl, email:u.email }} size="xs" showName={false} />{u.name} ({u.role})</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm">Due Date (optional)</label>
              <input type="date" className="w-full border rounded px-2 py-2" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => setDueDate(new Date().toISOString().slice(0,10))}>Today</Button>
                <Button size="sm" variant="outline" onClick={() => { const d = new Date(); d.setDate(d.getDate()+1); setDueDate(d.toISOString().slice(0,10)); }}>Tomorrow</Button>
                <Button size="sm" variant="outline" onClick={() => { const d = new Date(); d.setDate(d.getDate()+7); setDueDate(d.toISOString().slice(0,10)); }}>Next Week</Button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <label className="text-sm">Related Customer (optional)</label>
            <CustomerSearch
              onCustomerSelect={(c:any)=> setCustomerId(String(c.id))}
              onPartyMemberSelect={() => {}}
              placeholder="Search by name or phone (any format)…"
              showProgressIndicators={false}
              mode="individual"
            />
            <div className="mt-2 text-sm text-gray-500">Selected: {customerId || 'None'}</div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Title:</span> {title}</div>
            <div><span className="font-medium">Priority:</span> {priority}</div>
            <div><span className="font-medium">Assignees:</span> {assignUserIds.length}</div>
            <div><span className="font-medium">Estimated:</span> {estimatedMinutes} min</div>
            <div><span className="font-medium">Due:</span> {dueDate || '—'}</div>
            <div><span className="font-medium">Customer:</span> {customerId || '—'}</div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between pt-2">
          <div>
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step-1)} disabled={saving}>Back</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step+1)} disabled={!canNext()}>Next</Button>
            ) : (
              <Button onClick={handleSave} disabled={saving || !title.trim() || assignUserIds.length===0}>{saving ? 'Saving…' : 'Create Task'}</Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TaskWizardModal;


