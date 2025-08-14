import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Button } from './Button';
import { CustomerAvatar } from './CustomerAvatar';
import { Badge } from './Badge';
import { Calendar, Scissors, Users } from 'lucide-react';

interface CustomerProfileModalProps {
  customerId: number | null;
  open: boolean;
  onClose: () => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({ customerId, open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!open || !customerId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/customers/${customerId}`, { credentials: 'include' })
      .then(r => r.json())
      .then((res) => {
        setData(res);
        const displayName = `${res.first_name || ''} ${res.last_name || ''}`.trim() || res.name || '';
        setName(displayName);
        setEmail(res.email || '');
        setPhone(res.phone || '');
        setAddress(res.address || '');
      })
      .catch(() => setError('Failed to load customer'))
      .finally(() => setLoading(false));
  }, [open, customerId]);

  const handleSave = async () => {
    if (!customerId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), email: email.trim() || null, phone: phone.trim() || null, address: address.trim() || null })
      });
      if (!res.ok) throw new Error('Save failed');
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Customer Profile" size="lg">
      {loading ? (
        <div className="p-6">Loading…</div>
      ) : error ? (
        <div className="p-6 text-red-600">{error}</div>
      ) : data ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <CustomerAvatar name={name} phone={phone} email={email} size="lg" />
                <div>
                  <CardTitle className="text-2xl">{name || 'Unnamed Customer'}</CardTitle>
                  <div className="text-sm text-gray-500">Lightspeed ID: {data.lightspeedId || '—'}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="Street, City, State, ZIP" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4" />Appointments</CardTitle></CardHeader>
              <CardContent>
                <Badge variant="outline">{(data.appointments?.length || 0)} total</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Scissors className="w-4 h-4" />Alterations</CardTitle></CardHeader>
              <CardContent>
                <Badge variant="outline">{(data.alterations?.length || 0)} total</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" />Parties</CardTitle></CardHeader>
              <CardContent>
                <Badge variant="outline">{(data.parties?.length || 0)} total</Badge>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
};

export default CustomerProfileModal;


