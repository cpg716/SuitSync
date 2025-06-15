import { useState, useEffect } from 'react';
import { useToast } from '../components/ToastContext';

const defaultConfig = {
  podiumApiKey: '',
  sendgridApiKey: '',
  sendgridFrom: '',
  apiBaseUrl: '',
  syncFrequency: 15,
};

export default function AdminSettings() {
  const [config, setConfig] = useState(defaultConfig);
  const [sync, setSync] = useState({ status: 'syncing', last: null });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const { success, error: toastError } = useToast();

  useEffect(() => {
    // Fetch config and sync status from backend (stubbed for now)
    fetch('/api/webhooks/sync-status').then(r => r.json()).then(setSync);
    // Optionally fetch config from backend
    // setConfig(...)
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setConfig(c => ({ ...c, [name]: value }));
  };

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    if (!config.podiumApiKey || !config.sendgridApiKey || !config.sendgridFrom || !config.apiBaseUrl || !config.syncFrequency) {
      setError('All fields are required');
      toastError('All fields are required');
      setSaving(false);
      return;
    }
    // TODO: Save config to backend
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      success('Settings saved');
      setTimeout(() => setSaved(false), 2000);
    }, 1000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Settings</h1>
      <form onSubmit={handleSave} className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card p-6 flex flex-col gap-4">
        <div>
          <label className="block font-semibold mb-1">Podium SMS API Key</label>
          <input name="podiumApiKey" value={config.podiumApiKey} onChange={handleChange} className="border p-2 rounded w-full" required />
        </div>
        <div>
          <label className="block font-semibold mb-1">SendGrid API Key</label>
          <input name="sendgridApiKey" value={config.sendgridApiKey} onChange={handleChange} className="border p-2 rounded w-full" required />
        </div>
        <div>
          <label className="block font-semibold mb-1">SendGrid From Email</label>
          <input name="sendgridFrom" value={config.sendgridFrom} onChange={handleChange} className="border p-2 rounded w-full" required type="email" />
        </div>
        <div>
          <label className="block font-semibold mb-1">API Base URL</label>
          <input name="apiBaseUrl" value={config.apiBaseUrl} onChange={handleChange} className="border p-2 rounded w-full" required type="url" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Sync Frequency (minutes)</label>
          <input name="syncFrequency" value={config.syncFrequency} onChange={handleChange} className="border p-2 rounded w-full" required type="number" min={1} max={120} />
        </div>
        <div className="flex items-center gap-4 mt-2">
          <button type="submit" className="px-4 py-2 rounded bg-primary text-white font-semibold hover:bg-primary-light transition" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          {saved && <span className="text-green-600 font-medium">Saved!</span>}
          {error && <span className="text-red-600 font-medium">{error}</span>}
        </div>
        <div className="mt-6 p-4 rounded bg-neutral-100 dark:bg-neutral-800 flex items-center gap-3">
          <span className="font-semibold">Sync Status:</span>
          <span className={`font-medium ${sync.status === 'success' ? 'text-green-600' : sync.status === 'error' ? 'text-red-600' : 'text-yellow-500'}`}>{sync.status}</span>
          {sync.last && <span className="ml-2 text-xs text-gray-500">Last: {new Date(sync.last).toLocaleString()}</span>}
        </div>
      </form>
    </div>
  );
} 