import React from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Button } from './Button';
import { Badge } from './Badge';
import { UserAvatar } from './UserAvatar';

interface ChecklistWizardModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export const ChecklistWizardModal: React.FC<ChecklistWizardModalProps> = ({ open, onClose, onCreated }) => {
  const [step, setStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [users, setUsers] = React.useState<any[]>([]);

  // Form state
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [frequency, setFrequency] = React.useState<Frequency>('DAILY');
  const [isRequired, setIsRequired] = React.useState(false);
  const [items, setItems] = React.useState<Array<{ title: string; description?: string; isRequired?: boolean }>>([{ title: '' }]);
  const [assignUserIds, setAssignUserIds] = React.useState<string[]>([]);
  const [assignDue, setAssignDue] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    fetch('/api/public/users').then(r => r.json()).then(setUsers).catch(() => setUsers([]));
  }, [open]);

  const canNext = () => {
    if (step === 0) return title.trim().length > 0;
    if (step === 1) return items.some(i => i.title.trim().length > 0);
    return true;
  };

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, description, frequency, isRequired, items, assignToUserIds: assignUserIds.map(Number), assignDueDate: assignDue || undefined })
      });
      if (!res.ok) throw new Error('Failed');
      onClose();
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  const FrequencyPill = ({ value }: { value: Frequency }) => (
    <Badge className={value === 'DAILY' ? 'bg-blue-100 text-blue-800' : value === 'WEEKLY' ? 'bg-green-100 text-green-800' : value === 'MONTHLY' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'}>{value}</Badge>
  );

  return (
    <Modal open={open} onClose={onClose} title="New Checklist" size="lg">
      <div className="space-y-4">
        {/* Stepper */}
        <div className="flex items-center gap-2 text-sm">
          {["Basics","Items","Assign","Review"].map((label, idx) => (
            <div key={label} className={`flex items-center gap-2 ${idx === step ? 'font-semibold' : 'text-gray-500'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${idx <= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{idx+1}</div>
              <span>{label}</span>
              {idx < 3 && <div className="w-8 h-[2px] bg-gray-300" />}
            </div>
          ))}
        </div>

        {/* Steps */}
        {step === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Title *</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Open/Close Procedures" />
            </div>
            <div>
              <label className="text-sm">Frequency</label>
              <select className="w-full border rounded px-2 py-2" value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Description (optional)</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Short description" />
            </div>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} /> Required for completion</label>
            <div className="md:col-span-2"><FrequencyPill value={frequency} /></div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Items</label>
              <Button size="sm" variant="outline" onClick={() => setItems(arr => [...arr, { title: '' }])}>Add Item</Button>
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5"><Input placeholder="Item title" value={it.title} onChange={e => setItems(arr => arr.map((x,i)=> i===idx ? { ...x, title: e.target.value } : x))} /></div>
                <div className="col-span-5"><Input placeholder="Description (optional)" value={it.description || ''} onChange={e => setItems(arr => arr.map((x,i)=> i===idx ? { ...x, description: e.target.value } : x))} /></div>
                <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={!!it.isRequired} onChange={e => setItems(arr => arr.map((x,i)=> i===idx ? { ...x, isRequired: e.target.checked } : x))} /> Required</label>
              </div>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm">Assign Users</label>
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
              <input type="date" className="w-full border rounded px-2 py-2" value={assignDue} onChange={e => setAssignDue(e.target.value)} />
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={() => setAssignDue(new Date().toISOString().slice(0,10))}>Today</Button>
                <Button size="sm" variant="outline" onClick={() => { const d = new Date(); d.setDate(d.getDate()+1); setAssignDue(d.toISOString().slice(0,10)); }}>Tomorrow</Button>
                <Button size="sm" variant="outline" onClick={() => { const d = new Date(); d.setDate(d.getDate()+7); setAssignDue(d.toISOString().slice(0,10)); }}>Next Week</Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Title:</span> {title}</div>
            <div><span className="font-medium">Frequency:</span> {frequency}</div>
            <div><span className="font-medium">Items:</span> {items.filter(i=>i.title.trim()).length}</div>
            <div><span className="font-medium">Assignees:</span> {assignUserIds.length}</div>
            <div><span className="font-medium">Due:</span> {assignDue || '—'}</div>
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
              <Button onClick={handleSave} disabled={saving || !title.trim() || items.every(i=>!i.title.trim())}>{saving ? 'Saving…' : 'Create Checklist'}</Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ChecklistWizardModal;


