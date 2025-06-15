import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function PartyDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [party, setParty] = useState(null);
  const [members, setMembers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm] = useState({ role: '', measurements: '', status: 'Selected', notes: '' });

  const fetchMembers = () => {
    fetch(`/api/parties/${id}/members`)
      .then(res => res.json())
      .then(setMembers);
  };

  useEffect(() => {
    if (!id) return;
    fetch(`/api/parties/${id}`)
      .then(res => res.json())
      .then(setParty);
    fetchMembers();
  }, [id]);

  const handleAdd = async () => {
    await fetch(`/api/parties/${id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setShowAdd(false);
    setForm({ role: '', measurements: '', status: 'Selected', notes: '' });
    fetchMembers();
  };

  const handleEdit = async () => {
    await fetch(`/api/parties/${id}/members/${editMember.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setShowEdit(false);
    setEditMember(null);
    setForm({ role: '', measurements: '', status: 'Selected', notes: '' });
    fetchMembers();
  };

  const handleRemove = async (memberId) => {
    await fetch(`/api/parties/${id}/members/${memberId}`, { method: 'DELETE' });
    fetchMembers();
  };

  if (!party) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">{party.name}</h1>
      <div className="mb-4 text-gray-600">Event Date: {new Date(party.eventDate).toLocaleDateString()}</div>
      <div className="mb-6">Notes: {party.notes || <span className="text-gray-400">None</span>}</div>
      <h2 className="text-2xl font-semibold mb-2">Party Members</h2>
      <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => setShowAdd(true)}>Add Member</button>
      <table className="w-full border rounded">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Role</th>
            <th className="p-2 text-left">Measurements</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Notes</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr key={member.id} className="border-t">
              <td className="p-2">{member.role}</td>
              <td className="p-2">{member.measurements}</td>
              <td className="p-2">{member.status}</td>
              <td className="p-2">{member.notes}</td>
              <td className="p-2">
                <button className="mr-2 px-2 py-1 bg-yellow-400 rounded" onClick={() => { setEditMember(member); setForm(member); setShowEdit(true); }}>Edit</button>
                <button className="px-2 py-1 bg-red-500 text-white rounded" onClick={() => handleRemove(member.id)}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Add Member Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-96">
            <h3 className="text-xl font-bold mb-2">Add Member</h3>
            <input className="border p-2 rounded w-full mb-2" placeholder="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            <input className="border p-2 rounded w-full mb-2" placeholder="Measurements" value={form.measurements} onChange={e => setForm(f => ({ ...f, measurements: e.target.value }))} />
            <input className="border p-2 rounded w-full mb-2" placeholder="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} />
            <textarea className="border p-2 rounded w-full mb-2" placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleAdd}>Add</button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Member Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded shadow-lg w-96">
            <h3 className="text-xl font-bold mb-2">Edit Member</h3>
            <input className="border p-2 rounded w-full mb-2" placeholder="Role" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            <input className="border p-2 rounded w-full mb-2" placeholder="Measurements" value={form.measurements} onChange={e => setForm(f => ({ ...f, measurements: e.target.value }))} />
            <input className="border p-2 rounded w-full mb-2" placeholder="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} />
            <textarea className="border p-2 rounded w-full mb-2" placeholder="Notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowEdit(false)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}