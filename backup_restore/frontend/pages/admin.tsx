import { useState, useEffect } from 'react';
import { useToast } from '../components/ToastContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Skeleton from '../components/ui/Skeleton';
import { Settings, RefreshCw, Mail, MessageCircle, KeyRound, Info } from 'lucide-react';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useAuth } from '../src/AuthContext';
import Tabs from '../components/ui/Tabs';

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

function SalesStaffAdminCard() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ commissionRate: '', availability: '' });
  useEffect(() => {
    fetch('/api/admin/settings/staff').then(r => r.json()).then(setStaff).finally(() => setLoading(false));
  }, []);
  const handleEdit = s => { setEditing(s.id); setForm({ commissionRate: s.commissionRate || '', availability: s.availability || '' }); };
  const handleCancel = () => { setEditing(null); setForm({ commissionRate: '', availability: '' }); };
  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handleSave = async e => {
    e.preventDefault();
    await fetch(`/api/admin/settings/staff/${editing}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, commissionRate: parseFloat(form.commissionRate) }),
    });
    setEditing(null);
    setLoading(true);
    fetch('/api/admin/settings/staff').then(r => r.json()).then(setStaff).finally(() => setLoading(false));
  };
  return (
    <Card title="Sales Staff (Admin Only)" className="mb-8">
      {loading ? <Skeleton className="h-24 w-full" /> : (
        <div className="overflow-x-auto">
          <table className="w-full mb-4 text-sm">
            <thead><tr><th>Name</th><th>Email</th><th>Commission Rate</th><th>Availability</th><th></th></tr></thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id} className="border-b">
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{editing === s.id ? (
                    <input name="commissionRate" type="number" min={0} max={1} step={0.01} value={form.commissionRate} onChange={handleChange} className="border rounded px-2 py-1 w-20" />
                  ) : (s.commissionRate ?? '-')}
                  </td>
                  <td>{editing === s.id ? (
                    <input name="availability" value={form.availability} onChange={handleChange} className="border rounded px-2 py-1 w-32" />
                  ) : (s.availability ?? '-')}
                  </td>
                  <td>
                    {editing === s.id ? (
                      <>
                        <Button onClick={handleSave} className="mr-2">Save</Button>
                        <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                      </>
                    ) : (
                      <Button variant="outline" onClick={() => handleEdit(s)}>Edit</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function MyAvailabilityCard() {
  const [availability, setAvailability] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch('/api/admin/settings/my-availability').then(r => r.json()).then(setAvailability).finally(() => setLoading(false));
  }, []);
  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/admin/settings/my-availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availability }),
    });
    setSaving(false);
  };
  return (
    <Card title="My Availability" className="mb-8">
      {loading ? <Skeleton className="h-12 w-full" /> : (
        <form onSubmit={handleSave} className="flex flex-col gap-2">
          <label className="font-medium">Availability</label>
          <input value={availability} onChange={e => setAvailability(e.target.value)} className="border rounded px-2 py-2 text-lg" placeholder="e.g. Mon-Fri 9am-5pm" />
          <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </form>
      )}
    </Card>
  );
}

const TABS = [
  { key: 'general', label: 'General' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'salesStaff', label: 'Sales Staff' },
  { key: 'tailors', label: 'Tailors' },
  { key: 'availability', label: 'My Availability' },
  { key: 'integrations', label: 'Integrations' },
];

// General tab content
function GeneralSettingsCard() {
  // Add core app settings here (shop name, logo, etc.)
  return (
    <Card title="General Settings" className="mb-8">
      <div className="text-gray-600">Add your general app settings here.</div>
    </Card>
  );
}

// Notifications tab content
function NotificationsSettingsCard() {
  return <ReminderSettingsCard />;
}

// Integrations tab content
function IntegrationsSettingsCard() {
  // Place API keys, sync frequency, etc. here
  return (
    <Card title="Integrations" className="mb-8">
      <div className="text-gray-600">Add your API keys, sync frequency, and integration settings here.</div>
    </Card>
  );
}

export default function AdminSettings() {
  const { user } = useAuth();
  const [tab, setTab] = useState('general');
  return (
    <div className="w-full max-w-screen-lg mx-auto bg-white text-black dark:bg-gray-dark dark:text-white p-2 sm:p-4 md:p-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2 mb-2 text-primary">
          <Settings className="inline-block mr-2" size={28} /> Settings
        </h1>
        {/* Tab Navigation */}
        <Tabs value={tab} onChange={setTab} className="mb-6" tabs={TABS} />
        {/* Tab Content */}
        {tab === 'general' && <GeneralSettingsCard />}
        {tab === 'notifications' && <NotificationsSettingsCard />}
        {tab === 'salesStaff' && user?.role === 'admin' && <SalesStaffAdminCard />}
        {tab === 'tailors' && user?.role === 'admin' && (
          <>
            <TaskTypesAdmin />
            <TailorAbilitiesAdmin />
            <TailorSchedulesAdmin />
          </>
        )}
        {tab === 'availability' && user?.role !== 'admin' && <MyAvailabilityCard />}
        {tab === 'integrations' && <IntegrationsSettingsCard />}
      </div>
    </div>
  );
} 