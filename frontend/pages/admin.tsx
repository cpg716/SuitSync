import { useState, useEffect } from 'react';
import { useToast } from '../components/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';
import { Settings, RefreshCw, Mail, MessageCircle, KeyRound, Info } from 'lucide-react';
import ConfirmModal from '../components/ui/ConfirmModal';

const defaultConfig = {
  podiumApiKey: '',
  sendgridApiKey: '',
  sendgridFrom: '',
  apiBaseUrl: '',
  syncFrequency: 15,
};

function SyncStatusCard() {
  const [status, setStatus] = useState('ok');
  const [lastSync, setLastSync] = useState('');
  const [errors, setErrors] = useState([]);
  useEffect(() => {
    fetch('/api/webhooks/sync-status').then(r => r.json()).then(d => { setStatus(d.status); setLastSync(d.lastSync); });
    fetch('/api/sync/errors').then(r => r.json()).then(d => setErrors(d));
  }, []);
  return (
    <div className="bg-white dark:bg-gray-dark rounded shadow p-4 mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-block w-3 h-3 rounded-full ${status === 'ok' ? 'bg-green-500' : errors.length > 0 ? 'bg-red-500' : 'bg-yellow-400'}`}></span>
        <span className="font-semibold">Sync Status</span>
        <span className="ml-auto text-xs text-gray-500">Last: {lastSync ? new Date(lastSync).toLocaleString() : '—'}</span>
      </div>
      {errors.length > 0 && (
        <ul className="text-xs text-red-600 space-y-1">
          {errors.map(e => <li key={e.id}>{e.createdAt ? new Date(e.createdAt).toLocaleString() : ''}: {e.message}</li>)}
        </ul>
      )}
      {errors.length === 0 && <div className="text-xs text-green-600">No sync errors in last 24h.</div>}
    </div>
  );
}

function ReminderSettingsCard() {
  const [intervals, setIntervals] = useState([24, 4]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.json()).then(s => {
      setIntervals(s.reminderIntervals.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n)));
      setEmailSubject(s.emailSubject);
      setEmailBody(s.emailBody);
      setSmsBody(s.smsBody);
    });
  }, []);
  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reminderIntervals: intervals.join(','),
        emailSubject,
        emailBody,
        smsBody,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  return (
    <div className="bg-white dark:bg-gray-dark rounded shadow p-4 mb-6">
      <h2 className="font-semibold mb-2">Reminder Settings</h2>
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Reminder Intervals (hours before appointment, comma separated)</label>
          <input type="text" className="border rounded px-2 py-1 w-full" value={intervals.join(', ')} onChange={e => setIntervals(e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)))} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email Subject Template</label>
          <input type="text" className="border rounded px-2 py-1 w-full" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email Body Template</label>
          <textarea className="border rounded px-2 py-1 w-full" rows={3} value={emailBody} onChange={e => setEmailBody(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">SMS Body Template</label>
          <input type="text" className="border rounded px-2 py-1 w-full" value={smsBody} onChange={e => setSmsBody(e.target.value)} />
        </div>
        <div className="flex items-center gap-3 mt-2">
          <button type="submit" className="px-4 py-2 rounded bg-primary text-white font-semibold" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          {saved && <span className="text-green-600 font-medium">Saved!</span>}
        </div>
        <div className="text-xs text-gray-500 mt-2">Available variables: {'{customerName}'}, {'{partyName}'}, {'{dateTime}'}, {'{shopName}'}</div>
      </form>
    </div>
  );
}

// --- Alteration Task Types Admin ---
function TaskTypesAdmin() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', defaultDuration: 60 });
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetch('/api/admin/settings/task-types').then(r => r.json()).then(setTypes).finally(() => setLoading(false));
  }, []);

  const handleEdit = t => { setEditing(t.id); setForm({ name: t.name, defaultDuration: t.defaultDuration }); };
  const handleCancel = () => { setEditing(null); setForm({ name: '', defaultDuration: 60 }); };
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleSave = async e => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/admin/settings/task-types/${editing}` : '/api/admin/settings/task-types';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, defaultDuration: Number(form.defaultDuration) }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTypes(ts => editing ? ts.map(t => t.id === updated.id ? updated : t) : [...ts, updated]);
      handleCancel();
    }
  };
  const handleDelete = id => { setDeleteId(id); setShowConfirm(true); };
  const confirmDelete = async () => {
    await fetch(`/api/admin/settings/task-types/${deleteId}`, { method: 'DELETE' });
    setTypes(ts => ts.filter(t => t.id !== deleteId));
    setShowConfirm(false); setDeleteId(null);
  };
  return (
    <Card title="Alteration Task Types" className="mb-8">
      {loading ? <Skeleton className="h-24 w-full" /> : (
        <div>
          <table className="w-full mb-4 text-sm">
            <thead><tr><th>Name</th><th>Default Duration (min)</th><th></th></tr></thead>
            <tbody>
              {types.map(t => (
                <tr key={t.id} className="border-b">
                  <td>{t.name}</td>
                  <td>{t.defaultDuration}</td>
                  <td>
                    <Button variant="outline" onClick={() => handleEdit(t)} className="mr-2">Edit</Button>
                    <Button variant="outline" onClick={() => handleDelete(t.id)} className="text-red-600">Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form onSubmit={handleSave} className="flex flex-wrap gap-2 items-end">
            <Input name="name" value={form.name} onChange={handleChange} placeholder="Task Type Name" required className="flex-1" />
            <Input name="defaultDuration" type="number" value={form.defaultDuration} onChange={handleChange} placeholder="Duration (min)" min={1} className="w-32" />
            <Button type="submit">{editing ? 'Update' : 'Add'}</Button>
            {editing && <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>}
          </form>
        </div>
      )}
      <ConfirmModal open={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={confirmDelete} loading={false} title="Delete Task Type" message="Are you sure you want to delete this task type?" />
    </Card>
  );
}

// --- Tailor Abilities Admin ---
function TailorAbilitiesAdmin() {
  const [abilities, setAbilities] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ tailorId: '', taskTypeId: '', proficiency: 3 });
  const [editing, setEditing] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings/tailor-abilities').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
      fetch('/api/admin/settings/task-types').then(r => r.json()),
    ]).then(([a, u, t]) => {
      setAbilities(a); setTailors(u.filter(u => u.role === 'tailor')); setTaskTypes(t);
      setLoading(false);
    });
  }, []);
  const handleEdit = ab => { setEditing(ab.id); setForm({ tailorId: ab.tailorId, taskTypeId: ab.taskTypeId, proficiency: ab.proficiency }); };
  const handleCancel = () => { setEditing(null); setForm({ tailorId: '', taskTypeId: '', proficiency: 3 }); };
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleSave = async e => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/admin/settings/tailor-abilities/${editing}` : '/api/admin/settings/tailor-abilities';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tailorId: Number(form.tailorId), taskTypeId: Number(form.taskTypeId), proficiency: Number(form.proficiency) }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAbilities(abs => editing ? abs.map(a => a.id === updated.id ? updated : a) : [...abs, updated]);
      handleCancel();
    }
  };
  const handleDelete = id => { setDeleteId(id); setShowConfirm(true); };
  const confirmDelete = async () => {
    await fetch(`/api/admin/settings/tailor-abilities/${deleteId}`, { method: 'DELETE' });
    setAbilities(abs => abs.filter(a => a.id !== deleteId));
    setShowConfirm(false); setDeleteId(null);
  };
  return (
    <Card title="Tailor Abilities" className="mb-8">
      {loading ? <Skeleton className="h-24 w-full" /> : (
        <div>
          <table className="w-full mb-4 text-sm">
            <thead><tr><th>Tailor</th><th>Task Type</th><th>Proficiency</th><th></th></tr></thead>
            <tbody>
              {abilities.map(a => (
                <tr key={a.id} className="border-b">
                  <td>{a.tailor?.name}</td>
                  <td>{a.taskType?.name}</td>
                  <td>{a.proficiency}</td>
                  <td>
                    <Button variant="outline" onClick={() => handleEdit(a)} className="mr-2">Edit</Button>
                    <Button variant="outline" onClick={() => handleDelete(a.id)} className="text-red-600">Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form onSubmit={handleSave} className="flex flex-wrap gap-2 items-end">
            <select name="tailorId" value={form.tailorId} onChange={handleChange} required className="border rounded px-2 py-1">
              <option value="">Select Tailor</option>
              {tailors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select name="taskTypeId" value={form.taskTypeId} onChange={handleChange} required className="border rounded px-2 py-1">
              <option value="">Select Task Type</option>
              {taskTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <Input name="proficiency" type="number" min={1} max={5} value={form.proficiency} onChange={handleChange} className="w-24" />
            <Button type="submit">{editing ? 'Update' : 'Add'}</Button>
            {editing && <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>}
          </form>
        </div>
      )}
      <ConfirmModal open={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={confirmDelete} loading={false} title="Delete Tailor Ability" message="Are you sure you want to delete this ability?" />
    </Card>
  );
}

// --- Tailor Schedules Admin ---
function TailorSchedulesAdmin() {
  const [schedules, setSchedules] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ tailorId: '', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' });
  const [editing, setEditing] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings/tailor-schedules').then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([s, u]) => {
      setSchedules(s); setTailors(u.filter(u => u.role === 'tailor'));
      setLoading(false);
    });
  }, []);
  const handleEdit = s => { setEditing(s.id); setForm({ tailorId: s.tailorId, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime }); };
  const handleCancel = () => { setEditing(null); setForm({ tailorId: '', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }); };
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleSave = async e => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/admin/settings/tailor-schedules/${editing}` : '/api/admin/settings/tailor-schedules';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tailorId: Number(form.tailorId), dayOfWeek: Number(form.dayOfWeek) }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSchedules(ss => editing ? ss.map(s => s.id === updated.id ? updated : s) : [...ss, updated]);
      handleCancel();
    }
  };
  const handleDelete = id => { setDeleteId(id); setShowConfirm(true); };
  const confirmDelete = async () => {
    await fetch(`/api/admin/settings/tailor-schedules/${deleteId}`, { method: 'DELETE' });
    setSchedules(ss => ss.filter(s => s.id !== deleteId));
    setShowConfirm(false); setDeleteId(null);
  };
  return (
    <Card title="Tailor Schedules" className="mb-8">
      {loading ? <Skeleton className="h-24 w-full" /> : (
        <div>
          <table className="w-full mb-4 text-sm">
            <thead><tr><th>Tailor</th><th>Day</th><th>Start</th><th>End</th><th></th></tr></thead>
            <tbody>
              {schedules.map(s => (
                <tr key={s.id} className="border-b">
                  <td>{s.tailor?.name}</td>
                  <td>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.dayOfWeek]}</td>
                  <td>{s.startTime}</td>
                  <td>{s.endTime}</td>
                  <td>
                    <Button variant="outline" onClick={() => handleEdit(s)} className="mr-2">Edit</Button>
                    <Button variant="outline" onClick={() => handleDelete(s.id)} className="text-red-600">Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <form onSubmit={handleSave} className="flex flex-wrap gap-2 items-end">
            <select name="tailorId" value={form.tailorId} onChange={handleChange} required className="border rounded px-2 py-1">
              <option value="">Select Tailor</option>
              {tailors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select name="dayOfWeek" value={form.dayOfWeek} onChange={handleChange} required className="border rounded px-2 py-1">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i) => <option key={i} value={i}>{d}</option>)}
            </select>
            <Input name="startTime" type="time" value={form.startTime} onChange={handleChange} className="w-28" />
            <Input name="endTime" type="time" value={form.endTime} onChange={handleChange} className="w-28" />
            <Button type="submit">{editing ? 'Update' : 'Add'}</Button>
            {editing && <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>}
          </form>
        </div>
      )}
      <ConfirmModal open={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={confirmDelete} loading={false} title="Delete Tailor Schedule" message="Are you sure you want to delete this schedule?" />
    </Card>
  );
}

export default function AdminSettings() {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<any>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(s => {
        setSettings(s);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load settings');
        setLoading(false);
      });
  }, []);

  const handleChange = e => {
    setSettings((s: any) => ({ ...s, [e.target.name]: e.target.value }));
    setDirty(true);
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
      setDirty(false);
      success('Settings saved');
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError('Failed to save settings');
      toastError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-screen-lg mx-auto bg-white text-black dark:bg-gray-dark dark:text-white">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-6 text-primary">
          <Settings className="inline-block mr-2" size={28} /> Admin Settings
        </h1>
        <form onSubmit={handleSave} className="space-y-8">
          {/* Reminder Templates */}
          <Card title={<span className="flex items-center gap-2"><Mail size={20} /> Reminder Templates</span>}>
            {loading ? <Skeleton className="h-32 w-full" /> : (
              <>
                <div className="mb-4">
                  <label className="block font-semibold mb-1 flex items-center gap-1">Reminder Intervals (hours before appointment)
                    <Info size={16} className="text-gray-400" title="Comma separated, e.g. 24,4" />
                  </label>
                  <Input name="reminderIntervals" value={settings?.reminderIntervals || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" placeholder="24,4" />
                </div>
                <div className="mb-4">
                  <label className="block font-semibold mb-1 flex items-center gap-1">Email Subject <Info size={16} className="text-gray-400" title="Subject for reminder emails" /></label>
                  <Input name="emailSubject" value={settings?.emailSubject || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
                <div className="mb-4">
                  <label className="block font-semibold mb-1 flex items-center gap-1">Email Body Template</label>
                  <textarea name="emailBody" value={settings?.emailBody || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" rows={3} />
                  <div className="text-xs text-gray-500 mt-1">Available variables: {'{customerName}'}, {'{partyName}'}, {'{dateTime}'}, {'{shopName}'}</div>
                </div>
                <div className="mb-2">
                  <label className="block font-semibold mb-1 flex items-center gap-1">SMS Body Template</label>
                  <Input name="smsBody" value={settings?.smsBody || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                </div>
              </>
            )}
          </Card>
          {/* API Keys & Integration */}
          <Card title={<span className="flex items-center gap-2"><KeyRound size={20} /> API Keys & Integration</span>}>
            <div className="mb-4">
              <label className="block font-semibold mb-1 flex items-center gap-1">Podium SMS API Key <Info size={16} className="text-gray-400" title="Used for SMS reminders." /></label>
              <Input name="podiumApiKey" value={settings?.podiumApiKey || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div className="mb-4">
              <label className="block font-semibold mb-1 flex items-center gap-1">SendGrid API Key <Info size={16} className="text-gray-400" title="Used for email reminders." /></label>
              <Input name="sendgridApiKey" value={settings?.sendgridApiKey || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
            </div>
            <div className="mb-4">
              <label className="block font-semibold mb-1 flex items-center gap-1">SendGrid From Email <Info size={16} className="text-gray-400" title="Sender email for reminders." /></label>
              <Input name="sendgridFrom" value={settings?.sendgridFrom || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" type="email" />
            </div>
            <div className="mb-4">
              <label className="block font-semibold mb-1 flex items-center gap-1">API Base URL <Info size={16} className="text-gray-400" title="Base URL for API calls." /></label>
              <Input name="apiBaseUrl" value={settings?.apiBaseUrl || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" type="url" />
            </div>
            <div className="mb-2">
              <label className="block font-semibold mb-1 flex items-center gap-1">Sync Frequency (minutes) <Info size={16} className="text-gray-400" title="How often to sync with Lightspeed." /></label>
              <Input name="syncFrequency" value={settings?.syncFrequency || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" type="number" min={1} max={120} />
            </div>
          </Card>
          {/* Save Button */}
          <div className="flex items-center gap-4">
            <Button type="submit" disabled={saving || !dirty || loading} className="px-6 py-2">
              {saving ? <RefreshCw className="animate-spin mr-2" size={18} /> : null}
              Save Settings
            </Button>
            {saved && <span className="text-green-600 font-medium flex items-center gap-1">Saved! <RefreshCw className="text-green-600 animate-spin" size={16} /></span>}
            {error && <span className="text-red-600 font-medium">{error}</span>}
          </div>
        </form>
        <TaskTypesAdmin />
        <TailorAbilitiesAdmin />
        <TailorSchedulesAdmin />
      </div>
    </div>
  );
} 