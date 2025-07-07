import { useState, useEffect, memo } from 'react';
import dynamic from 'next/dynamic';
import { useToast } from '../components/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Skeleton } from '../components/ui/Skeleton';
import { Settings, RefreshCw, Mail, MessageCircle, KeyRound, Info } from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../src/AuthContext';
import { apiFetch, getApiUrl } from '../lib/apiClient';
import MonitoringDashboard from '../components/MonitoringDashboard';

// Dynamically import heavy components
const UserSettings = dynamic(() => import('./UserSettings'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false
});

const RolePermissionsDisplay = dynamic(() => import('../components/RolePermissionsDisplay'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false
});

const defaultConfig = {
  podiumApiKey: '',
  sendgridApiKey: '',
  sendgridFrom: '',
  apiBaseUrl: '',
  syncFrequency: 15,
};

function SyncStatusCard() {
  const toast = useToast();
  const [status, setStatus] = useState('ok');
  const [lastSync, setLastSync] = useState('');
  const [errors, setErrors] = useState([]);
  useEffect(() => {
    fetch('/api/webhooks/sync-status', { credentials: 'include' }).then(r => r.json()).then(d => { setStatus(d.status); setLastSync(d.lastSync); });
    fetch('/api/sync/errors', { credentials: 'include' }).then(r => r.json()).then(d => setErrors(d));
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
  const toast = useToast();
  const [intervals, setIntervals] = useState([24, 4]);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    fetch('/api/admin/settings', { credentials: 'include' }).then(r => r.json()).then(s => {
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
      credentials: 'include',
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
    <div className="bg-white dark:bg-gray-900 rounded shadow p-4 mb-6 dark:text-gray-100">
      <h2 className="font-semibold mb-2">Reminder Settings</h2>
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">Reminder Intervals (hours before appointment, comma separated)</label>
          <input type="text" className="border rounded px-2 py-1 w-full bg-white dark:bg-gray-800 text-black dark:text-gray-100" value={intervals.join(', ')} onChange={e => setIntervals(e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n)))} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email Subject Template</label>
          <input type="text" className="border rounded px-2 py-1 w-full bg-white dark:bg-gray-800 text-black dark:text-gray-100" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email Body Template</label>
          <textarea className="border rounded px-2 py-1 w-full bg-white dark:bg-gray-800 text-black dark:text-gray-100" rows={3} value={emailBody} onChange={e => setEmailBody(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">SMS Body Template</label>
          <input type="text" className="border rounded px-2 py-1 w-full bg-white dark:bg-gray-800 text-black dark:text-gray-100" value={smsBody} onChange={e => setSmsBody(e.target.value)} />
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
  const toast = useToast();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', defaultDuration: 60 });
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetch('/api/admin/settings/task-types', { credentials: 'include' }).then(r => r.json()).then(setTypes).catch(() => {}).then(() => setLoading(false));
  }, []);

  const handleEdit = (t: any) => { setEditing(t.id); setForm({ name: t.name, defaultDuration: t.defaultDuration }); };
  const handleCancel = () => { setEditing(null); setForm({ name: '', defaultDuration: 60 }); };
  const handleChange = (e: any) => setForm((f: any) => ({ ...f, [e.target.name]: e.target.value }));
  const handleSave = async (e: any) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/admin/settings/task-types/${editing}` : '/api/admin/settings/task-types';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...form, defaultDuration: Number(form.defaultDuration) }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTypes((ts: any) => editing ? ts.map((t: any) => t.id === updated.id ? updated : t) : [...ts, updated]);
      handleCancel();
    }
  };
  const handleDelete = (id: any) => { setDeleteId(id); setShowConfirm(true); };
  const confirmDelete = async () => {
    await fetch(`/api/admin/settings/task-types/${deleteId}`, { method: 'DELETE', credentials: 'include' });
    setTypes((ts: any) => ts.filter((t: any) => t.id !== deleteId));
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
  const toast = useToast();
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
      fetch('/api/admin/settings/tailor-abilities', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/users', { credentials: 'include' }).then(async r => {
        if (!r.ok) {
          if (r.status === 401) {
            toast.error('You must be logged in to view users.');
            window.location.href = '/login';
            return [];
          } else if (r.status === 404) {
            toast.error('User list is unavailable.');
            return [];
          } else {
            toast.error('Failed to fetch users.');
            return [];
          }
        }
        return r.json();
      }),
      fetch('/api/admin/settings/task-types', { credentials: 'include' }).then(r => r.json()),
    ]).then(([a, u, t]) => {
      setAbilities(a);
      const userArr = Array.isArray(u) ? u : (Array.isArray(u?.lightspeedUsers) ? u.lightspeedUsers : (Array.isArray(u?.users) ? u.users : []));
      setTailors((userArr || []).filter(u => u.role === 'tailor'));
      setTaskTypes(t);
      setLoading(false);
    });
  }, []);
  const handleEdit = (ab: any) => { setEditing(ab.id); setForm({ tailorId: ab.tailorId, taskTypeId: ab.taskTypeId, proficiency: ab.proficiency }); };
  const handleCancel = () => { setEditing(null); setForm({ tailorId: '', taskTypeId: '', proficiency: 3 }); };
  const handleChange = (e: any) => setForm((f: any) => ({ ...f, [e.target.name]: e.target.value }));
  const handleSave = async (e: any) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/admin/settings/tailor-abilities/${editing}` : '/api/admin/settings/tailor-abilities';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...form, tailorId: Number(form.tailorId), taskTypeId: Number(form.taskTypeId), proficiency: Number(form.proficiency) }),
    });
    if (res.ok) {
      const updated = await res.json();
      setAbilities((abs: any) => editing ? abs.map((a: any) => a.id === updated.id ? updated : a) : [...abs, updated]);
      handleCancel();
    }
  };
  const handleDelete = (id: any) => { setDeleteId(id); setShowConfirm(true); };
  const confirmDelete = async () => {
    await fetch(`/api/admin/settings/tailor-abilities/${deleteId}`, { method: 'DELETE', credentials: 'include' });
    setAbilities((abs: any) => abs.filter((a: any) => a.id !== deleteId));
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
  const toast = useToast();
  const [schedules, setSchedules] = useState([]);
  const [tailors, setTailors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ tailorId: '', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' });
  const [editing, setEditing] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings/tailor-schedules', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/users', { credentials: 'include' }).then(async r => {
        if (!r.ok) {
          if (r.status === 401) {
            toast.error('You must be logged in to view users.');
            window.location.href = '/login';
            return [];
          } else if (r.status === 404) {
            toast.error('User list is unavailable.');
            return [];
          } else {
            toast.error('Failed to fetch users.');
            return [];
          }
        }
        return r.json();
      }),
    ]).then(([s, u]) => {
      setSchedules(s);
      const userArr = Array.isArray(u) ? u : (Array.isArray(u?.lightspeedUsers) ? u.lightspeedUsers : (Array.isArray(u?.users) ? u.users : []));
      setTailors((userArr || []).filter(u => u.role === 'tailor'));
      setLoading(false);
    });
  }, []);
  const handleEdit = (s: any) => { setEditing(s.id); setForm({ tailorId: s.tailorId, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime }); };
  const handleCancel = () => { setEditing(null); setForm({ tailorId: '', dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }); };
  const handleChange = (e: any) => setForm((f: any) => ({ ...f, [e.target.name]: e.target.value }));
  const handleSave = async (e: any) => {
    e.preventDefault();
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/admin/settings/tailor-schedules/${editing}` : '/api/admin/settings/tailor-schedules';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...form, tailorId: Number(form.tailorId), dayOfWeek: Number(form.dayOfWeek) }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSchedules((ss: any) => editing ? ss.map((s: any) => s.id === updated.id ? updated : s) : [...ss, updated]);
      handleCancel();
    }
  };
  const handleDelete = (id: any) => { setDeleteId(id); setShowConfirm(true); };
  const confirmDelete = async () => {
    await fetch(`/api/admin/settings/tailor-schedules/${deleteId}`, { method: 'DELETE', credentials: 'include' });
    setSchedules((ss: any) => ss.filter((s: any) => s.id !== deleteId));
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

function UsersAdminCard() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [localUsers, setLocalUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileUserId, setProfileUserId] = useState<number|null>(null);
  const [page, setPage] = useState(1);
  const USERS_PER_PAGE = 20; // Increased for better grid layout
  useEffect(() => {
    apiFetch('/api/users').then(async r => {
      if (!r.ok) {
        if (r.status === 401) {
          toast.error('You must be logged in to view users.');
          window.location.href = '/login';
          return { lightspeedUsers: [], localUsers: [] };
        } else if (r.status === 404) {
          toast.error('User list is unavailable.');
          return { lightspeedUsers: [], localUsers: [] };
        } else {
          toast.error('Failed to fetch users.');
          return { lightspeedUsers: [], localUsers: [] };
        }
      }
      return r.json();
    }).then(data => {
      // Use the combined users array that includes both local and Lightspeed-only users
      const allUsers = data.users || [...(data.localUsers || []), ...(data.lightspeedUsers || [])];
      setUsers(allUsers);
      setLocalUsers(Array.isArray(data.localUsers) ? data.localUsers : []);
      setLoading(false);
    });
  }, []);
  const getLocalUser = (lsUser) => localUsers.find(u => u.lightspeedEmployeeId && String(u.lightspeedEmployeeId) === String(lsUser.id));
  const getUserId = (u) => {
    const local = getLocalUser(u);
    if (local) return local.id;
    if (u.id) return parseInt(u.id, 10);
    return null;
  };
  const getPhone = (u) => {
    const local = getLocalUser(u);
    return local?.phone || u.phone || '-';
  };
  const pagedUsers = users.slice((page-1)*USERS_PER_PAGE, page*USERS_PER_PAGE);
  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);
  const handleSyncUsers = async () => {
    try {
      toast.success('Starting user sync...');
      const response = await apiFetch('/api/users/sync', { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        toast.success(`Sync completed: ${result.created} created, ${result.updated} updated`);

        // Refresh the users list by re-fetching data
        setLoading(true);
        const usersResponse = await apiFetch('/api/users');
        if (usersResponse.ok) {
          const data = await usersResponse.json();
          const allUsers = data.users || [...(data.localUsers || []), ...(data.lightspeedUsers || [])];
          setUsers(allUsers);
          setLocalUsers(Array.isArray(data.localUsers) ? data.localUsers : []);
        }
        setLoading(false);
      } else {
        toast.error('Failed to sync users');
      }
    } catch (error) {
      toast.error('Failed to sync users');
    }
  };

  return (
    <Card title="Users (Staff Directory)" className="mb-8 w-full">
      {loading ? <Skeleton className="h-64 w-full" /> : (
        <>
          {/* Header with sync button */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {users.length} total users ({localUsers.length} with local profiles)
            </div>
            <Button
              onClick={handleSyncUsers}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Sync Users
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 w-full">
            {pagedUsers.map(u => {
              const local = getLocalUser(u) || {};
              const hasLocalProfile = !!getUserId(u);
              return (
                <div
                  key={u.id}
                  className={`
                    bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg
                    transition-all duration-200 ease-in-out transform hover:scale-105
                    flex flex-col items-center border border-gray-200 dark:border-gray-600
                    w-full min-w-0 p-4 sm:p-6 relative overflow-hidden
                    ${hasLocalProfile ? 'ring-2 ring-blue-500/20' : ''}
                  `}
                  style={{ minHeight: '280px' }}
                >
                  {/* Status indicator */}
                  <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${hasLocalProfile ? 'bg-green-500' : 'bg-gray-300'}`} />

                  {/* Profile photo */}
                  <div className="relative mb-3">
                    {u.photoUrl ? (
                      <img
                        src={u.photoUrl}
                        alt={u.name}
                        className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover shadow-md ring-2 ring-white dark:ring-gray-700"
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-md ring-2 ring-white dark:ring-gray-700">
                        <span className="text-white font-bold text-lg sm:text-xl">
                          {u.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* User info */}
                  <div className="flex-1 flex flex-col items-center text-center space-y-1 mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                      {u.name || 'Unknown User'}
                    </h3>

                    {getPhone(u) !== '-' && (
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        {getPhone(u)}
                      </p>
                    )}

                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate w-full px-2">
                      {u.email}
                    </p>

                    <div className={`
                      inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                      ${u.role === 'admin'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                      }
                    `}>
                      {u.role || local.role || 'User'}
                    </div>
                  </div>

                  {/* Action button */}
                  <Button
                    variant={hasLocalProfile ? "default" : "outline"}
                    size="sm"
                    className="w-full text-xs sm:text-sm"
                    onClick={() => setProfileUserId(getUserId(u))}
                    disabled={!hasLocalProfile}
                  >
                    {hasLocalProfile ? 'View Profile' : 'No Local Profile'}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((page-1)*USERS_PER_PAGE)+1}-{Math.min(page*USERS_PER_PAGE, users.length)} of {users.length} users
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page-1)}
                  className="px-3"
                >
                  ← Previous
                </Button>
                <span className="text-sm font-medium px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                  {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page+1)}
                  className="px-3"
                >
                  Next →
                </Button>
              </div>
            </div>
          )}
        </>
      )}
      <Modal open={!!profileUserId} onClose={() => setProfileUserId(null)}>
        {profileUserId && <UserSettings userId={profileUserId} adminView />}
      </Modal>
    </Card>
  );
}

const TABS = [
  { value: 'general', label: 'General' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'users', label: 'Users' },
  { value: 'roles', label: 'Role Permissions' },
  { value: 'tailors', label: 'Tailors' },
  { value: 'availability', label: 'My Availability' },
  { value: 'integrations', label: 'Integrations' },
  { value: 'sync', label: 'Sync & Health' },
  { value: 'health', label: 'Health & Sync' },
];

function SyncStatusPanel() {
  const [syncStatus, setSyncStatus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    async function fetchStatus() {
      setLoading(true);
      try {
        const res = await fetch('/api/sync/status', { credentials: 'include' });
        const data = await res.json();
        setSyncStatus(Array.isArray(data.statuses) ? data.statuses : []);
        setErrors(Array.isArray(data.errors) ? data.errors : []);
      } catch (err) {
        setErrors(['Failed to load sync status']);
      }
      setLoading(false);
    }
    fetchStatus();
  }, []);

  const handleManualSync = async (resource) => {
    await fetch(`/api/sync/${resource}`, { method: 'POST', credentials: 'include' });
    // Optionally refetch status
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-4">Lightspeed API Health & Sync</h2>
      {loading ? <div>Loading...</div> : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left">Resource</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Last Sync</th>
                <th className="px-4 py-2 text-left">Error</th>
                <th className="px-4 py-2 text-left">Manual Sync</th>
              </tr>
            </thead>
            <tbody>
              {syncStatus.map((s) => (
                <tr key={s.resource} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="px-4 py-2">{s.resource}</td>
                  <td className="px-4 py-2">{s.status}</td>
                  <td className="px-4 py-2">{s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-2">{s.errorMessage || '-'}</td>
                  <td className="px-4 py-2"><button className="px-2 py-1 bg-primary text-white rounded" onClick={() => handleManualSync(s.resource)}>Sync Now</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Sync Errors</h3>
        <ul className="list-disc ml-6 text-red-600 dark:text-red-400">
          {errors.length === 0 ? <li>None</li> : errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const { success, error: toastError } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<any>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState('general');
  const [viewMode, setViewMode] = useState<'admin' | 'user'>('admin');

  useEffect(() => {
    setLoading(true);
    fetch('/api/admin/settings', { credentials: 'include' })
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

  const handleChange = (e: any) => {
    setSettings((s: any) => ({ ...s, [e.target.name]: e.target.value }));
    setDirty(true);
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
        credentials: 'include',
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
    <div className="w-full min-h-screen bg-white text-black dark:bg-gray-900 dark:text-gray-100 flex flex-col">
      <div className="w-full flex-1 px-2 md:px-6 xl:px-12 py-6">
        <div className="w-full">
          {user?.role === 'admin' && (
            <div className="flex justify-end mb-4">
              <Button
                variant={viewMode === 'admin' ? 'default' : 'outline'}
                className="mr-2"
                onClick={() => setViewMode('admin')}
              >
                Admin Settings
              </Button>
              <Button
                variant={viewMode === 'user' ? 'default' : 'outline'}
                onClick={() => setViewMode('user')}
              >
                User Settings
              </Button>
            </div>
          )}
          {viewMode === 'user' ? (
            <UserSettings />
          ) : (
            <>
              <h1 className="text-3xl font-bold flex items-center gap-2 mb-6 text-primary">
                <Settings className="inline-block mr-2" size={28} /> Admin Settings
              </h1>
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                  {TABS.map(t => (
                    <button
                      key={t.value}
                      className={
                        `px-5 py-2 rounded-t-md font-semibold transition-all duration-150 ` +
                        (tab === t.value
                          ? 'bg-primary text-white shadow -mb-px border-b-2 border-primary'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-primary/10')
                      }
                      onClick={() => setTab(t.value)}
                      type="button"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <TabsContent value="general">
                  <form onSubmit={handleSave} className="space-y-8">
                    {/* API Keys & Integration */}
                    <Card title="API Keys & Integration">
                      <div className="mb-4">
                        <label className="block font-semibold mb-1 flex items-center gap-1">Podium SMS API Key <Info size={16} className="text-gray-400" /></label>
                        <Input name="podiumApiKey" value={settings?.podiumApiKey || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                      </div>
                      <div className="mb-4">
                        <label className="block font-semibold mb-1 flex items-center gap-1">SendGrid API Key <Info size={16} className="text-gray-400" /></label>
                        <Input name="sendgridApiKey" value={settings?.sendgridApiKey || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" />
                      </div>
                      <div className="mb-4">
                        <label className="block font-semibold mb-1 flex items-center gap-1">SendGrid From Email <Info size={16} className="text-gray-400" /></label>
                        <Input name="sendgridFrom" value={settings?.sendgridFrom || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" type="email" />
                      </div>
                      <div className="mb-4">
                        <label className="block font-semibold mb-1 flex items-center gap-1">API Base URL <Info size={16} className="text-gray-400" /></label>
                        <Input name="apiBaseUrl" value={settings?.apiBaseUrl || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" type="url" />
                      </div>
                      <div className="mb-2">
                        <label className="block font-semibold mb-1 flex items-center gap-1">Sync Frequency (minutes) <Info size={16} className="text-gray-400" /></label>
                        <Input name="syncFrequency" value={settings?.syncFrequency || ''} onChange={handleChange} className="w-full border rounded px-3 py-2" type="number" min={1} max={120} />
                      </div>
                    </Card>
                    <div className="flex items-center gap-4">
                      <Button type="submit" disabled={saving || !dirty || loading} className="px-6 py-2">
                        {saving ? <RefreshCw className="animate-spin mr-2" size={18} /> : null}
                        Save Settings
                      </Button>
                      {saved && <span className="text-green-600 font-medium flex items-center gap-1">Saved! <RefreshCw className="text-green-600 animate-spin" size={16} /></span>}
                      {error && <span className="text-red-600 font-medium">{error}</span>}
                    </div>
                  </form>
                </TabsContent>
                <TabsContent value="notifications">
                  <ReminderSettingsCard />
                </TabsContent>
                <TabsContent value="users">
                  <UsersAdminCard />
                </TabsContent>
                <TabsContent value="roles">
                  <Card title="Role-Based Permissions" className="mb-8">
                    <div className="p-6">
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-2">SuitSync Role Permissions</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Each role has specific permissions for different areas of SuitSync.
                          Roles are initially assigned based on Lightspeed account types but can be updated here.
                        </p>
                      </div>
                      <RolePermissionsDisplay />
                    </div>
                  </Card>
                </TabsContent>
                <TabsContent value="tailors">
                  <TaskTypesAdmin />
                  <TailorAbilitiesAdmin />
                  <TailorSchedulesAdmin />
                </TabsContent>
                <TabsContent value="availability">
                  {/* Availability Admin Card */}
                </TabsContent>
                <TabsContent value="integrations">
                  {/* Integrations Admin Card */}
                </TabsContent>
                <TabsContent value="sync">
                  <SyncStatusPanel />
                </TabsContent>
                <TabsContent value="health">
                  <MonitoringDashboard />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 