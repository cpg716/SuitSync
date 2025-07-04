import { useState, useEffect } from 'react';
import { useAuth } from '../src/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ToastContext';
import { Card } from '../components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { Modal } from '../components/ui/Modal';
import { Bell, Mail, Smartphone, UserCircle, KeyRound, Shield, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';

interface ActivityLog {
  id: number;
  action: string;
  entity: string;
  createdAt: string;
  source?: string;
}

// If User or NotificationPrefs are not defined, define:
type User = { id: string; name: string; lightspeedEmployeeId?: string };
type NotificationPrefs = { sms?: boolean; email?: boolean; push?: boolean };

export default function ProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const [tab, setTab] = useState('info');
  const [form, setForm] = useState({ name: '', email: '' });
  const notificationPrefs = user && 'notificationPrefs' in user ? user.notificationPrefs : { sms: true, email: true, push: true };
  const [saving, setSaving] = useState(false);
  const { success, error: toastError } = useToast();
  const [notifSaving, setNotifSaving] = useState(false);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // PIN management state
  const [pinInfo, setPinInfo] = useState<any>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinForm, setPinForm] = useState({ new: '', confirm: '' });
  const [pinSaving, setPinSaving] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  // Add type guards for notificationPrefs before property access
  const smsChecked = notificationPrefs && typeof notificationPrefs === 'object' && 'sms' in notificationPrefs ? notificationPrefs.sms : false;
  const emailChecked = notificationPrefs && typeof notificationPrefs === 'object' && 'email' in notificationPrefs ? notificationPrefs.email : false;
  const pushChecked = notificationPrefs && typeof notificationPrefs === 'object' && 'push' in notificationPrefs ? notificationPrefs.push : false;

  // Fix checked props to always be boolean (default to false if unknown)
  const smsCheckedBool = typeof smsChecked === 'boolean' ? smsChecked : false;
  const emailCheckedBool = typeof emailChecked === 'boolean' ? emailChecked : false;
  const pushCheckedBool = typeof pushChecked === 'boolean' ? pushChecked : false;

  // Type guard or cast user.lightspeedEmployeeId as string
  const lightspeedEmployeeId = user && typeof user === 'object' && 'lightspeedEmployeeId' in user ? String(user.lightspeedEmployeeId) : '';

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', email: user.email || '' });
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    async function fetchActivity() {
      if (tab === 'activity' && user) {
        setActivityLoading(true);
        try {
          const res = await fetch(`/api/users/${user.id}/activity`, { credentials: 'include' });
          if (!res.ok) throw new Error('Could not fetch activity');
          const data = await res.json();

          // Only update state if component is still mounted
          if (isMounted) {
            setActivity(data);
          }
        } catch (err) {
          if (isMounted) {
            toastError(err.message);
          }
        } finally {
          if (isMounted) {
            setActivityLoading(false);
          }
        }
      }
    }

    fetchActivity();

    return () => {
      isMounted = false;
    };
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
        body: JSON.stringify({ notificationPrefs: notificationPrefs }),
      });
      if (!res.ok) throw new Error('Failed to update preferences');
      success('Notification preferences updated');
    } catch (err) {
      toastError('Could not update notification preferences');
    } finally {
      setNotifSaving(false);
    }
  }

  // PIN management functions
  const fetchPinInfo = async () => {
    setPinLoading(true);
    try {
      const response = await apiFetch('/api/user-switch/pin-info');
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

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pinForm.new !== pinForm.confirm) {
      toastError('PINs do not match');
      return;
    }

    if (!/^\d{4}$/.test(pinForm.new)) {
      toastError('PIN must be exactly 4 digits');
      return;
    }

    setPinSaving(true);
    try {
      const response = await apiFetch('/api/user-switch/set-pin', {
        method: 'POST',
        body: JSON.stringify({ pin: pinForm.new })
      });

      if (response.ok) {
        success('PIN set successfully');
        setPinForm({ current: '', new: '', confirm: '' });
        setShowPinModal(false);
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

  const handleRemovePin = async () => {
    if (!confirm('Are you sure you want to remove your PIN? You will need to re-authenticate to switch users.')) {
      return;
    }

    setPinSaving(true);
    try {
      const response = await apiFetch('/api/user-switch/pin', {
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

  // Fetch PIN info when security tab is selected
  useEffect(() => {
    if (tab === 'security' && user) {
      fetchPinInfo();
    }
  }, [tab, user]);

  if (loading || !user) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-2xl p-8 bg-white dark:bg-gray-800 shadow-lg border border-accent">
        <h1 className="text-2xl font-bold mb-4 text-primary">My Profile</h1>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="info">Profile Info</TabsTrigger>
            <TabsTrigger value="lightspeed">Lightspeed Sync</TabsTrigger>
            <TabsTrigger value="security">PIN & Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>
          <TabsContent value="info">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex flex-col items-center mb-4 gap-2">
                <div className="relative group">
                  {(photoPreview || user.photoUrl) ? (
                    <img src={photoPreview || user.photoUrl} alt="Profile" style={{ width: 96, height: 'auto' }} className="w-24 h-auto rounded-full object-cover mb-2 border-4 border-primary shadow-md" />
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
              <label htmlFor="name">Name</label>
              <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <label htmlFor="email">Email</label>
              <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              <Button type="submit" className="w-full bg-primary text-white" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="lightspeed">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-4">Lightspeed Account Link</h2>
              {user && 'lightspeedEmployeeId' in user && user.lightspeedEmployeeId ? (
                <div className="inline-flex flex-col items-center gap-3 mb-4 p-4 bg-blue-50 dark:bg-gray-700 rounded-lg">
                  <UserCircle size={40} className="text-blue-500" />
                  <div>
                    <div className="font-semibold text-blue-800 dark:text-blue-200">
                      Lightspeed User ID
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
                      {lightspeedEmployeeId}
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
          </TabsContent>
          <TabsContent value="security">
            <div className="space-y-8 max-w-lg mx-auto">
              {/* PIN Management Section */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <KeyRound className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">PIN for User Switching</h3>
                </div>

                {pinLoading ? (
                  <div className="text-center py-4">Loading PIN information...</div>
                ) : (
                  <div className="space-y-4">
                    {pinInfo?.hasPin ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-green-600">
                          <Shield className="h-4 w-4" />
                          <span className="text-sm font-medium">PIN is set and active</span>
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

                        {pinInfo.isExpired && (
                          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-sm">Your PIN has expired. Please set a new one.</span>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowPinModal(true)}
                            className="flex-1"
                          >
                            Change PIN
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleRemovePin}
                            disabled={pinSaving}
                            className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            {pinSaving ? 'Removing...' : 'Remove PIN'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-sm text-gray-600">
                          Set up a 4-digit PIN for quick user switching without re-authentication.
                        </div>
                        <Button
                          type="button"
                          onClick={() => setShowPinModal(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <KeyRound className="h-4 w-4 mr-2" />
                          Set Up PIN
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Lightspeed Authentication Info */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Authentication</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-blue-600">
                    <Shield className="h-5 w-5" />
                    <span className="font-medium">Authenticated via Lightspeed</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Your account is authenticated through Lightspeed X-Series. Password management is handled by Lightspeed.
                  </p>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      To change your password or update account settings, please log into your Lightspeed account directly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="notifications">
            <form className="space-y-4 max-w-sm mx-auto" onSubmit={handleNotifSave}>
              <label className="flex items-center gap-2 cursor-pointer">
                <Smartphone size={18} className="text-primary" />
                <input type="checkbox" checked={smsCheckedBool} onChange={e => setNotifSaving(true)} /> SMS Notifications
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Mail size={18} className="text-primary" />
                <input type="checkbox" checked={emailCheckedBool} onChange={e => setNotifSaving(true)} /> Email Notifications
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Bell size={18} className="text-primary" />
                <input type="checkbox" checked={pushCheckedBool} onChange={e => setNotifSaving(true)} /> Push Notifications
              </label>
              <Button className="w-full bg-primary text-white" type="submit" disabled={notifSaving}>
                {notifSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="activity">
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
          </TabsContent>
        </Tabs>
      </Card>

      {/* PIN Setup/Change Modal */}
      <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)} title={pinInfo?.hasPin ? "Change PIN" : "Set Up PIN"}>
        <form onSubmit={handleSetPin} className="space-y-4">
          <div className="text-sm text-gray-600 mb-4">
            {pinInfo?.hasPin
              ? "Enter a new 4-digit PIN for user switching."
              : "Create a 4-digit PIN for quick user switching without re-authentication."
            }
          </div>

          <div>
            <label htmlFor="new-pin" className="block text-sm font-medium mb-1">
              {pinInfo?.hasPin ? "New PIN" : "PIN"}
            </label>
            <Input
              id="new-pin"
              type="password"
              value={pinForm.new}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPinForm(f => ({ ...f, new: value }));
              }}
              placeholder="••••"
              maxLength={4}
              className="text-center text-2xl tracking-widest"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirm-pin" className="block text-sm font-medium mb-1">
              Confirm PIN
            </label>
            <Input
              id="confirm-pin"
              type="password"
              value={pinForm.confirm}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPinForm(f => ({ ...f, confirm: value }));
              }}
              placeholder="••••"
              maxLength={4}
              className="text-center text-2xl tracking-widest"
              autoComplete="new-password"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPinModal(false);
                setPinForm({ new: '', confirm: '' });
              }}
              className="flex-1"
              disabled={pinSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pinSaving || !pinForm.new || !pinForm.confirm}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {pinSaving ? 'Setting...' : (pinInfo?.hasPin ? 'Change PIN' : 'Set PIN')}
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Security Information</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• PIN is encrypted and stored securely</li>
            <li>• 3 failed attempts will lock your account for 5 minutes</li>
            <li>• PIN expires after 7 days for security</li>
            <li>• Admins can reset your PIN if needed</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}