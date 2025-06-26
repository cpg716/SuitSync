import { useState, useEffect } from 'react';
import { useAuth } from '../src/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ToastContext';
import { Card } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import { Bell, Mail, Smartphone, UserCircle } from 'lucide-react';

interface ActivityLog {
  id: number;
  action: string;
  entity: string;
  createdAt: string;
  source?: string;
}

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const [tab, setTab] = useState('info');
  const [form, setForm] = useState({ name: '', email: '' });
  const [notifs, setNotifs] = useState({ sms: true, email: true, push: true });
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', email: user.email || '' });
      setNotifs(user.notificationPrefs || { sms: true, email: true, push: true });
    }
  }, [user]);

  useEffect(() => {
    async function fetchActivity() {
      if (tab === 'activity' && user) {
        setActivityLoading(true);
        try {
          const res = await fetch(`/api/users/${user.id}/activity`);
          if (!res.ok) throw new Error('Could not fetch activity');
          const data = await res.json();
          setActivity(data);
        } catch (err) {
          toastError(err.message);
        } finally {
          setActivityLoading(false);
        }
      }
    }
    fetchActivity();
  }, [tab, user, toastError]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      success('Profile updated');
    } catch (err) {
      toastError('Could not update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwSaving(true);
    // TODO: Implement backend password change
    setTimeout(() => {
      setPwSaving(false);
      success('Password changed (demo)');
    }, 1000);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  }

  async function handlePhotoUpload() {
    if (!photoFile) return;
    const formData = new FormData();
    formData.append('photo', photoFile);
    try {
      const res = await fetch(`/api/users/${user.id}/photo`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload photo');
      const updated = await res.json();
      setPhotoPreview(updated.photoUrl);
      await refreshUser();
      success('Profile photo updated');
    } catch (err) {
      toastError('Could not upload photo');
    }
  }

  async function handleNotifSave(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setNotifSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ notificationPrefs: notifs }),
      });
      if (!res.ok) throw new Error('Failed to update preferences');
      success('Notification preferences updated');
    } catch (err) {
      toastError('Could not update notification preferences');
    } finally {
      setNotifSaving(false);
    }
  }

  if (loading || !user) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-2xl p-8 bg-white dark:bg-gray-800 shadow-lg border border-accent">
        <h1 className="text-2xl font-bold mb-4 text-primary">My Profile</h1>
        <Tabs value={tab} onChange={setTab} tabs={[
          { value: 'info', label: 'Profile Info' },
          { value: 'lightspeed', label: 'Lightspeed Sync' },
          { value: 'security', label: 'Security' },
          { value: 'notifications', label: 'Notifications' },
          { value: 'activity', label: 'Activity Log' },
        ]} />
        <div className="mt-6">
          {tab === 'info' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex flex-col items-center mb-4 gap-2">
                <div className="relative group">
                  {(photoPreview || user.photoUrl) ? (
                    <img src={photoPreview || user.photoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover mb-2 border-4 border-primary shadow-md" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-2">
                      <UserCircle className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <label className="absolute bottom-1 right-1 bg-primary text-white rounded-full p-2 cursor-pointer hover:bg-primary-dark group-hover:scale-110 transition" title="Change photo">
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    <span>📷</span>
                  </label>
                </div>
                {photoFile && (
                  <Button type="button" className="bg-primary text-white mt-2" onClick={handlePhotoUpload}>
                    Upload New Photo
                  </Button>
                )}
              </div>
              <Input
                label="Name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
              />
              <Button type="submit" className="w-full bg-primary text-white" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          )}
          {tab === 'lightspeed' && (
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Lightspeed Account Link</h2>
              {user.lightspeedEmployeeId ? (
                <div className="inline-flex flex-col items-center gap-3 mb-4 p-4 bg-blue-50 dark:bg-gray-700 rounded-lg">
                  <UserCircle size={40} className="text-blue-500" />
                  <div>
                    <div className="font-semibold text-blue-800 dark:text-blue-200">
                      Lightspeed User ID
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                      {user.lightspeedEmployeeId}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Your SuitSync account is linked to this Lightspeed user profile. All actions will be associated with this ID.
                  </div>
                </div>
              ) : (
                <div className="mb-4 text-gray-500">
                  Your account is not directly linked to a Lightspeed Employee ID.
                </div>
              )}
              <Button disabled className="w-full bg-gray-300 text-gray-500 cursor-not-allowed">
                (Re-linking coming soon)
              </Button>
            </div>
          )}
          {tab === 'security' && (
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-sm mx-auto">
              <Input
                label="Current Password"
                type="password"
                value={pwForm.current}
                onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                required
              />
              <Input
                label="New Password"
                type="password"
                value={pwForm.next}
                onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                required
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                required
              />
              <Button type="submit" className="w-full bg-primary text-white" disabled={pwSaving}>
                {pwSaving ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          )}
          {tab === 'notifications' && (
            <form className="space-y-4 max-w-sm mx-auto" onSubmit={handleNotifSave}>
              <label className="flex items-center gap-2 cursor-pointer">
                <Smartphone size={18} className="text-primary" />
                <input type="checkbox" checked={notifs.sms} onChange={e => setNotifs(n => ({ ...n, sms: e.target.checked }))} /> SMS Notifications
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Mail size={18} className="text-primary" />
                <input type="checkbox" checked={notifs.email} onChange={e => setNotifs(n => ({ ...n, email: e.target.checked }))} /> Email Notifications
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Bell size={18} className="text-primary" />
                <input type="checkbox" checked={notifs.push} onChange={e => setNotifs(n => ({ ...n, push: e.target.checked }))} /> Push Notifications
              </label>
              <Button className="w-full bg-primary text-white" type="submit" disabled={notifSaving}>
                {notifSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </form>
          )}
          {tab === 'activity' && (
            <div className="max-w-lg mx-auto">
              {activityLoading ? <p>Loading activity...</p> : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {activity.length > 0 ? activity.map(a => (
                    <li key={a.id} className="py-3 flex justify-between items-center">
                      <div>
                        <span>{a.action} on <span className="font-semibold">{a.entity}</span></span>
                        {a.source && (
                          <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            a.source === 'Lightspeed' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' 
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {a.source}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-4">{new Date(a.createdAt).toLocaleString()}</span>
                    </li>
                  )) : <p>No recent activity found.</p>}
                </ul>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
} 