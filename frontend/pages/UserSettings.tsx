import { useState, useEffect } from 'react';
import { useAuth } from '../src/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ToastContext';
import { Card } from '../components/ui/Card';
import { Bell, Mail, Smartphone, UserCircle, KeyRound, Shield, AlertTriangle } from 'lucide-react';
import ScheduleEditor from '../components/ui/ScheduleEditor';
import { apiFetch } from '../lib/apiClient';

export default function UserSettings({ userId, adminView }: { userId?: number, adminView?: boolean }) {
  const { user: currentUser, loading: authLoading, refreshUser } = useAuth();
  const { success, error: toastError } = useToast();
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({ name: '', email: '' });
  const [notifs, setNotifs] = useState({ sms: true, email: true, push: true });
  const [availability, setAvailability] = useState('');
  const [commissionRate, setCommissionRate] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [availSaving, setAvailSaving] = useState(false);
  const [commSaving, setCommSaving] = useState(false);
  const [skillsSaving, setSkillsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<any>(null);
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [isDefault, setIsDefault] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // PIN management state (for admin view)
  const [pinInfo, setPinInfo] = useState<any>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinSaving, setPinSaving] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      setLoading(true);
      setError(null);
      const id = adminView && userId ? userId : currentUser?.id;
      if (!id) {
        setError('No user selected');
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/users/${id}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setForm({ name: data.name || '', email: data.email || '' });
        setNotifs(data.notificationPrefs || { sms: true, email: true, push: true });
        setAvailability(data.availability || '');
        setCommissionRate(data.commissionRate || '');
        setSkills(data.skills || []);
      } else {
        const errorText = await res.text();
        console.error('Failed to fetch user:', res.status, errorText);
        setError(`User not found (${res.status})`);
        setUser(null);
      }
      setLoading(false);
    }
    fetchUser();
    // Fetch all possible skills/task types for tailors or admins
    if ((currentUser?.role === 'tailor' || currentUser?.role === 'admin') || adminView) {
      fetch('/api/task-types', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(r => r.json()).then(setAllSkills);
    }
  }, [userId, adminView, currentUser]);

  // Fetch schedule
  useEffect(() => {
    if (!user) return;
    async function fetchSchedule() {
      setScheduleLoading(true);
      const id = user.id;
      let url = `/api/users/${id}/schedule`;
      if (!isDefault && weekStart) url += `?week=${weekStart.toISOString().slice(0,10)}`;
      const res = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSchedule(data ? JSON.parse(data.days) : Array(7).fill({ isOff: true, blocks: [] }));
      }
      // Fetch conflicts (stub)
      setConflicts([]);
      setScheduleLoading(false);
    }
    fetchSchedule();
  }, [user, weekStart, isDefault]);

  async function handleProfileSave(e: React.FormEvent) {
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
      await refreshUser();
    } catch (err) {
      toastError('Could not update profile');
    } finally {
      setSaving(false);
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
      await refreshUser();
    } catch (err) {
      toastError('Could not update notification preferences');
    } finally {
      setNotifSaving(false);
    }
  }

  async function handleAvailSave(e: React.FormEvent) {
    e.preventDefault();
    setAvailSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ availability }),
      });
      if (!res.ok) throw new Error('Failed to update availability');
      success('Availability updated');
      await refreshUser();
    } catch (err) {
      toastError('Could not update availability');
    } finally {
      setAvailSaving(false);
    }
  }

  async function handleCommSave(e: React.FormEvent) {
    e.preventDefault();
    setCommSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ commissionRate }),
      });
      if (!res.ok) throw new Error('Failed to update commission rate');
      success('Commission rate updated');
      await refreshUser();
    } catch (err) {
      toastError('Could not update commission rate');
    } finally {
      setCommSaving(false);
    }
  }

  async function handleSkillsSave(e: React.FormEvent) {
    e.preventDefault();
    setSkillsSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ skills }),
      });
      if (!res.ok) throw new Error('Failed to update skills');
      success('Skills updated');
      await refreshUser();
    } catch (err) {
      toastError('Could not update skills');
    } finally {
      setSkillsSaving(false);
    }
  }

  async function handleScheduleChange(days: any) {
    if (!user) return;
    setSchedule(days);
    const id = user.id;
    const body = { weekStart: isDefault ? null : weekStart, days };
    await fetch(`/api/users/${id}/schedule`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
  }

  function handleWeekChange(date: Date) {
    setWeekStart(date);
    setIsDefault(false);
  }

  function handleDefaultClick() {
    setIsDefault(true);
  }

  async function handleConfirmWeek() {
    if (!user || isDefault) return;
    await fetch(`/api/users/${user.id}/schedule/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ weekStart }),
    });
    success('Week confirmed!');
  }

  // PIN management functions (for admin view)
  const fetchPinInfo = async () => {
    if (!adminView || !userId) return;

    setPinLoading(true);
    try {
      // For admin view, we need to fetch PIN info for the specific user
      const response = await apiFetch(`/api/users/${userId}/pin-info`);
      if (response.ok) {
        const data = await response.json();
        setPinInfo(data.pinInfo);
      }
    } catch (error) {
      console.error('Error fetching PIN info:', error);
    } finally {
      setPinLoading(false);
    }
  };

  const handleAdminSetPin = async () => {
    if (!adminView || !userId || !newPin) return;

    if (!/^\d{4}$/.test(newPin)) {
      toastError('PIN must be exactly 4 digits');
      return;
    }

    setPinSaving(true);
    try {
      const response = await apiFetch(`/api/users/${userId}/admin-set-pin`, {
        method: 'POST',
        body: JSON.stringify({ pin: newPin })
      });

      if (response.ok) {
        success('PIN set successfully');
        setNewPin('');
        fetchPinInfo();
      } else {
        const errorData = await response.json();
        toastError(errorData.error || 'Failed to set PIN');
      }
    } catch (error) {
      toastError('Failed to set PIN');
    } finally {
      setPinSaving(false);
    }
  };

  const handleAdminRemovePin = async () => {
    if (!adminView || !userId) return;

    if (!confirm('Are you sure you want to remove this user\'s PIN?')) {
      return;
    }

    setPinSaving(true);
    try {
      const response = await apiFetch(`/api/users/${userId}/admin-remove-pin`, {
        method: 'DELETE'
      });

      if (response.ok) {
        success('PIN removed successfully');
        fetchPinInfo();
      } else {
        const errorData = await response.json();
        toastError(errorData.error || 'Failed to remove PIN');
      }
    } catch (error) {
      toastError('Failed to remove PIN');
    } finally {
      setPinSaving(false);
    }
  };

  // Fetch PIN info when component loads (admin view only)
  useEffect(() => {
    if (adminView && userId && user) {
      fetchPinInfo();
    }
  }, [adminView, userId, user]);

  if (loading || authLoading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!user) return <div className="p-8 text-red-600">User not found.</div>;

  return (
    <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-2xl p-8 bg-white dark:bg-gray-800 shadow-lg border border-accent mb-8">
        <div className="flex items-center gap-4 mb-6">
          {user.photoUrl ? (
            <img src={user.photoUrl} alt={user.name} style={{ height: 64, width: 'auto' }} className="h-16 w-auto rounded-full object-cover" />
          ) : (
            <UserCircle className="h-16 w-16 text-gray-400" />
          )}
          <div>
            <div className="text-2xl font-bold">{user.name}</div>
            <div className="text-gray-500 text-base">{user.email}</div>
            <div className="text-gray-400 text-sm capitalize">{user.role}</div>
          </div>
        </div>
        {/* Profile Info */}
        <form onSubmit={handleProfileSave} className="space-y-4 mb-8">
          <label htmlFor="name">Name</label>
          <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          <label htmlFor="email">Email</label>
          <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
          <Button type="submit" className="w-full bg-primary text-white" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </form>
        {/* Notification Preferences */}
        <form className="space-y-4 mb-8" onSubmit={handleNotifSave}>
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
          <Button className="w-full bg-primary text-white" type="submit" disabled={notifSaving}>{notifSaving ? 'Saving...' : 'Save Preferences'}</Button>
        </form>
        {/* Schedule/Availability (for sales, manager, tailor, admin) */}
        {(user.role === 'sales' || user.role === 'manager' || user.role === 'tailor' || user.role === 'admin') && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="block text-sm font-medium">Schedule / Availability</span>
              <Button variant={isDefault ? 'default' : 'outline'} size="sm" onClick={handleDefaultClick}>Default</Button>
              <Input type="date" value={weekStart ? weekStart.toISOString().slice(0,10) : ''} onChange={e => handleWeekChange(new Date(e.target.value))} className="w-36" />
              {!isDefault && <Button size="sm" onClick={handleConfirmWeek}>Confirm Week</Button>}
            </div>
            <ScheduleEditor
              value={schedule || Array(7).fill({ isOff: true, blocks: [] })}
              onChange={handleScheduleChange}
              weekStart={weekStart || undefined}
              isDefault={isDefault}
              conflicts={conflicts}
            />
          </div>
        )}
        {/* Commission (for sales/manager/admin) */}
        {(user.role === 'sales' || user.role === 'manager' || user.role === 'admin') && (
          <form className="mb-8" onSubmit={handleCommSave}>
            <label className="block text-sm font-medium mb-1">Commission Rate</label>
            <Input type="number" min={0} max={1} step={0.01} value={commissionRate} onChange={e => setCommissionRate(e.target.value)} />
            <Button className="mt-2 bg-primary text-white" type="submit" disabled={commSaving}>{commSaving ? 'Saving...' : 'Save Commission Rate'}</Button>
          </form>
        )}
        {/* Skills/Abilities (for tailor/admin) */}
        {(user.role === 'tailor' || user.role === 'admin') && (
          <form className="mb-8" onSubmit={handleSkillsSave}>
            <label className="block text-sm font-medium mb-1">Skills / Alteration Types</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {allSkills.map(skill => (
                <label key={skill} className="flex items-center gap-1 cursor-pointer bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  <input type="checkbox" checked={skills.includes(skill)} onChange={e => setSkills(skills => e.target.checked ? [...skills, skill] : skills.filter(s => s !== skill))} />
                  {skill}
                </label>
              ))}
            </div>
            <Button className="mt-2 bg-primary text-white" type="submit" disabled={skillsSaving}>{skillsSaving ? 'Saving...' : 'Save Skills'}</Button>
          </form>
        )}

        {/* PIN Management (admin view only) */}
        {adminView && (
          <div className="mb-8 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <KeyRound className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">PIN Management</h3>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Admin Only</span>
            </div>

            {pinLoading ? (
              <div className="text-center py-4">Loading PIN information...</div>
            ) : (
              <div className="space-y-4">
                {pinInfo?.hasPin ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm font-medium">User has PIN set</span>
                    </div>

                    {pinInfo.setAt && (
                      <div className="text-sm text-gray-600">
                        Set on: {new Date(pinInfo.setAt).toLocaleDateString()}
                      </div>
                    )}

                    {pinInfo.lastUsed && (
                      <div className="text-sm text-gray-600">
                        Last used: {new Date(pinInfo.lastUsed).toLocaleDateString()}
                      </div>
                    )}

                    {pinInfo.attempts > 0 && (
                      <div className="text-sm text-amber-600">
                        Failed attempts: {pinInfo.attempts}
                      </div>
                    )}

                    {pinInfo.lockedUntil && new Date(pinInfo.lockedUntil) > new Date() && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">
                          Account locked until: {new Date(pinInfo.lockedUntil).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {pinInfo.isExpired && (
                      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">PIN has expired</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAdminRemovePin}
                        disabled={pinSaving}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        {pinSaving ? 'Removing...' : 'Remove PIN'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 mb-4">
                    User has no PIN set. Set a PIN to enable quick user switching.
                  </div>
                )}

                {/* Admin PIN Set/Reset */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">
                    {pinInfo?.hasPin ? 'Reset PIN' : 'Set PIN'}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={newPin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setNewPin(value);
                      }}
                      placeholder="••••"
                      maxLength={4}
                      className="w-24 text-center text-xl tracking-widest"
                    />
                    <Button
                      type="button"
                      onClick={handleAdminSetPin}
                      disabled={pinSaving || !newPin || newPin.length !== 4}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {pinSaving ? 'Setting...' : (pinInfo?.hasPin ? 'Reset PIN' : 'Set PIN')}
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Enter a 4-digit PIN for this user
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}