import { useState, useEffect } from 'react';
import { useAuth } from '../src/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ToastContext';
import { User } from 'lucide-react';

// If User is not defined, define:
type User = { id: string; name: string; lightspeedEmployee?: any };

export default function LightspeedAccountPage() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (modalOpen) {
      fetch('/api/users/lightspeed/employees', { credentials: 'include' })
        .then(res => res.json())
        .then(setEmployees);
    }
  }, [modalOpen]);

  async function handleLink() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lightspeedEmployeeId: selected.id }),
      });
      if (!res.ok) throw new Error('Failed to update Lightspeed link');
      success('Lightspeed employee linked');
      setModalOpen(false);
    } catch (err) {
      toastError('Could not link Lightspeed employee');
    } finally {
      setSaving(false);
    }
  }

  const linked = user && typeof user === 'object' && 'lightspeedEmployee' in user ? user.lightspeedEmployee : undefined;

  // Add type guards for linked before property access
  const hasPhotoUrl = linked && typeof linked === 'object' && 'photoUrl' in linked;
  const hasName = linked && typeof linked === 'object' && 'name' in linked;
  const hasEmail = linked && typeof linked === 'object' && 'email' in linked;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md p-8 bg-white dark:bg-gray-800 shadow-lg border border-accent">
        <h1 className="text-2xl font-bold mb-4 text-primary">Lightspeed Account Sync</h1>
        {linked ? (
          <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded">
            {hasPhotoUrl ? (
              <img src={String(linked.photoUrl)} alt="LS avatar" style={{ width: 48, height: 'auto' }} className="w-12 h-auto rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                <User className="w-8 h-8" />
              </div>
            )}
            {hasName && <div className="font-semibold text-blue-700 dark:text-blue-200">{String(linked.name)}</div>}
            {hasEmail && <div className="text-xs text-blue-400">{String(linked.email)}</div>}
          </div>
        ) : (
          <div className="mb-4 text-gray-500">No Lightspeed employee linked.</div>
        )}
        <Button className="w-full bg-primary text-white mb-2" onClick={() => setModalOpen(true)}>
          {linked ? 'Change Linked Lightspeed Employee' : 'Link Lightspeed Employee'}
        </Button>
      </Card>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-96">
          <h2 className="text-xl font-bold mb-4">Select Lightspeed Employee</h2>
          <Input
            className="mb-2 w-full"
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="max-h-64 overflow-y-auto divide-y">
            {employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase())).map(e => (
              <div
                key={e.id}
                className={`flex items-center gap-2 p-2 cursor-pointer rounded ${selected?.id === e.id ? 'bg-blue-100 dark:bg-blue-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                onClick={() => setSelected(e)}
              >
                {e.photoUrl ? (
                  <img src={e.photoUrl} alt="LS avatar" style={{ width: 32, height: 'auto' }} className="w-8 h-auto rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center">
                    <span className="text-blue-500">LS</span>
                  </div>
                )}
                <div>
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-gray-500">{e.email}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <Button onClick={() => setModalOpen(false)} className="bg-gray-300 text-black dark:bg-gray-800 dark:text-gray-100">Cancel</Button>
            <Button onClick={handleLink} disabled={!selected || saving} className="bg-primary text-white">
              {saving ? 'Linking...' : 'Link Employee'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 