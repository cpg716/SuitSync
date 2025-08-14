import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Pagination } from '../../components/ui/Pagination';
import { Button } from '../../components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { format, addMonths, differenceInMonths, differenceInDays } from 'date-fns';
import AppointmentModal from '../../components/ui/AppointmentModal';
import TagPreview from '../../components/ui/TagPreview';
import { AlterationModal } from '../../components/ui/AlterationModal';
import { useToast } from '../../components/ToastContext';
import { Modal } from '../../components/ui/Modal';
import { UserAvatar } from '../../components/ui/UserAvatar';
import PartyTimelineRibbon from '../../components/PartyTimelineRibbon';

const PHASES = [
  { name: 'Suit Selection', color: 'bg-blue-500', monthsFrom: 6, monthsTo: 3 },
  { name: 'Measurements', color: 'bg-green-500', monthsFrom: 3, monthsTo: 1 },
  { name: 'Alteration Fitting', color: 'bg-yellow-400', monthsFrom: 1, monthsTo: 0.25 },
  { name: 'Pick-Up Reminder', color: 'bg-orange-400', monthsFrom: 0.25, monthsTo: 0 },
];

function getPhase(eventDate, now) {
  const months = differenceInMonths(new Date(eventDate), now) + (differenceInDays(new Date(eventDate), now) % 30) / 30;
  for (const [i, phase] of PHASES.entries()) {
    if (months <= phase.monthsFrom && months > phase.monthsTo) return i;
  }
  return PHASES.length - 1;
}

function getNextAction(party, now) {
  if (!party) return '';
  const eventDate = new Date(party.eventDate);
  const months = differenceInMonths(eventDate, now) + (differenceInDays(eventDate, now) % 30) / 30;
  for (const phase of PHASES) {
    if (months <= phase.monthsFrom && months > phase.monthsTo) {
      const phaseStart = addMonths(eventDate, -phase.monthsFrom);
      const daysUntil = differenceInDays(phaseStart, now);
      return `Next: ${phase.name} in ${daysUntil} days`;
    }
  }
  return 'No upcoming actions';
}

function ProgressBar({ phase }) {
  return (
    <div className="flex w-full h-3 rounded overflow-hidden mt-2">
      {PHASES.map((p, i) => (
        <div
          key={p.name}
          className={`${p.color} ${i <= phase ? '' : 'bg-gray-200 dark:bg-gray-700'} flex-1 transition-all`}
        />
      ))}
    </div>
  );
}

const STATUS_COLORS = {
  awaiting_measurements: 'bg-red-500 text-white',
  need_to_order: 'bg-orange-500 text-white',
  ordered: 'bg-blue-500 text-white',
  received: 'bg-purple-500 text-white',
  being_altered: 'bg-yellow-500 text-black',
  ready_for_pickup: 'bg-green-500 text-white',
};

const WORKFLOW_STATUSES = ['awaiting_measurements', 'need_to_order', 'ordered', 'received', 'being_altered', 'ready_for_pickup'];

const STATUS_LABELS = {
  awaiting_measurements: 'Awaiting Measurements',
  need_to_order: 'Need to Order',
  ordered: 'Ordered',
  received: 'Received',
  being_altered: 'Being Altered',
  ready_for_pickup: 'Ready for Pickup',
};

function MemberStepper({ status }) {
  const idx = WORKFLOW_STATUSES.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {WORKFLOW_STATUSES.map((s, i) => (
        <div key={s} className={`flex items-center ${i < WORKFLOW_STATUSES.length-1 ? 'mr-1' : ''}`}>
          <div className={`w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold ${i <= idx ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{i+1}</div>
          {i < WORKFLOW_STATUSES.length-1 && <div className={`h-1 w-4 ${i < idx ? 'bg-blue-600' : 'bg-gray-200'}`}></div>}
        </div>
      ))}
    </div>
  );
}

// If Party is not defined, define:
type Party = { id: string; name: string; [key: string]: any };

export default function PartyDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [party, setParty] = useState<Party | null>(null);
  const [members, setMembers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm] = useState({ role: '', measurements: '', status: 'awaiting_measurements', notes: '' });
  const [page, setPage] = useState(1);
  const [showAppt, setShowAppt] = useState(false);
  const [apptInitial, setApptInitial] = useState<any | null>(null);
  const pageSize = 10;
  const paginated = members.slice((page-1)*pageSize, page*pageSize);
  const now = new Date();
  const [memberAlterations, setMemberAlterations] = useState({});
  const [showAlterationModal, setShowAlterationModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusMember, setStatusMember] = useState(null);
  const [alterationMemberId, setAlterationMemberId] = useState(null);
  const [editAlteration, setEditAlteration] = useState(null);
  const [printJob, setPrintJob] = useState(null);
  const [tab, setTab] = useState('members');
  const [timeline, setTimeline] = useState(null);
  const [communications, setCommunications] = useState([]);
  const { success, error, info } = useToast();
  const showToast = (msg, type = 'success') => {
    if (type === 'success') success(msg);
    else if (type === 'error') error(msg);
    else info(msg);
  };

  const fetchMembers = () => {
    fetch(`/api/parties/${id}/members`, { credentials: 'include' })
      .then(res => res.json())
      .then(setMembers);
  };

  useEffect(() => {
    if (!id) return;
    fetch(`/api/parties/${id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(setParty);
    fetchMembers();
    fetch(`/api/parties/${id}/timeline`, { credentials: 'include' }).then(res => res.json()).then(setTimeline);
    fetch(`/api/parties/${id}/communications`, { credentials: 'include' }).then(res => res.json()).then(setCommunications);
  }, [id]);

  useEffect(() => {
    if (!members.length) return;
    members.forEach(member => {
      fetch(`/api/alterations/member/${member.id}`, { credentials: 'include' })
        .then(res => res.json())
        .then(jobs => setMemberAlterations(prev => ({ ...prev, [member.id]: jobs })));
    });
  }, [members]);

  const handleAdd = async () => {
    await fetch(`/api/parties/${id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
      credentials: 'include',
    });
    setShowAdd(false);
    setForm({ role: '', measurements: '', status: 'Selected', notes: '' });
    fetchMembers();
  };

  const handleEdit = async () => {
    await fetch(`/api/parties/${id}/members/${editMember.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
      credentials: 'include',
    });
    setShowEdit(false);
    setEditMember(null);
    setForm({ role: '', measurements: '', status: 'Selected', notes: '' });
    fetchMembers();
  };

  const handleRemove = async (memberId) => {
    await fetch(`/api/parties/${id}/members/${memberId}`, { method: 'DELETE', credentials: 'include' });
    fetchMembers();
  };

  // Timeline action handlers
  const handleStatusUpdate = async (formData) => {
    try {
      const response = await fetch(`/api/parties/members/${statusMember.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        showToast('Status updated successfully');
        fetchMembers();
        setShowStatusModal(false);
        setStatusMember(null);
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Error updating status', 'error');
    }
  };

  const handleAdvanceStatus = async (memberId, newStatus) => {
    try {
      const response = await fetch(`/api/parties/members/${memberId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (response.ok) {
        showToast('Status updated successfully');
        fetchMembers();
      } else {
        showToast('Failed to update status', 'error');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Error updating status', 'error');
    }
  };
  const handleTriggerBulkOrder = async () => {
    await fetch(`/api/parties/${id}/trigger-bulk-order`, { method: 'POST', credentials: 'include' }).then(res => {
      if (res.ok) {
        showToast('Bulk order triggered', 'success');
        fetch(`/api/parties/${id}/timeline`, { credentials: 'include' }).then(res => res.json()).then(setTimeline);
      } else {
        showToast('Failed to trigger bulk order', 'error');
      }
    });
  };
  const handleNotifyPickup = async (memberId) => {
    const pickupDate = prompt('Enter pickup date (YYYY-MM-DD):');
    if (!pickupDate) return;
    await fetch(`/api/parties/${id}/members/${memberId}/notify-pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickupDate }),
      credentials: 'include',
    }).then(res => {
      if (res.ok) {
        showToast('Pickup notification sent', 'success');
      } else {
        showToast('Failed to send notification', 'error');
      }
    });
  };

  // Bulk actions
  const handleAdvanceAll = async () => {
    if (!timeline) return;
    for (const row of timeline.timeline) {
      const idx = WORKFLOW_STATUSES.indexOf(row.status);
      if (idx < WORKFLOW_STATUSES.length-1) {
        await fetch(`/api/parties/${id}/members/${row.memberId}/advance-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newStatus: WORKFLOW_STATUSES[idx+1] }),
          credentials: 'include',
        });
      }
    }
    showToast('Advanced all members to next status', 'success');
    fetch(`/api/parties/${id}/timeline`, { credentials: 'include' }).then(res => res.json()).then(setTimeline);
  };
  const handleRemindAll = async () => {
    if (!timeline) return;
    for (const row of timeline.timeline) {
      await handleNotifyPickup(row.memberId);
    }
    showToast('Sent reminder to all members', 'success');
  };

  function getLatestCommForMember(member) {
    if (!communications.length || !member.lsCustomerId) return null;
    const comms = communications.filter(c => String(c.customerId) === String(member.lsCustomerId));
    if (!comms.length) return null;
    const latest = comms[0];
    return latest;
  }

  if (!party) return <div>Loading...</div>;

  const phase = getPhase(party.eventDate, now);
  const nextAction = getNextAction(party, now);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3">
          <h1 className="text-3xl font-bold mb-2">{party.name}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{party.notes}</p>
          <div className="mb-4">
            <PartyTimelineRibbon
              eventDate={party?.eventDate}
              firstFittingDate={party?.appointments?.find((a:any)=>a.type==='first_fitting')?.dateTime}
              alterationsFittingDate={party?.appointments?.find((a:any)=>a.type==='alterations_fitting')?.dateTime}
              pickupDate={party?.appointments?.find((a:any)=>a.type==='pickup')?.dateTime}
              dueDate={party?.alterationJobs?.[0]?.dueDate}
            />
          </div>
          <Tabs value={tab} onValueChange={setTab} className="mb-4">
            <TabsList>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
            </TabsList>
            <TabsContent value="members">
              <h2 className="text-2xl font-semibold mb-2">Party Members</h2>
              <button className="mb-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => setShowAdd(true)}>Add Member</button>
              <table className="w-full border-2 rounded text-black dark:text-white bg-white dark:bg-gray-dark border-gray-400 dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-100 dark:bg-neutral-800">
                    <th className="p-2 text-left">Role</th>
                    <th className="p-2 text-left">Measurements</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Notes</th>
                    <th className="p-2 text-left">Alterations</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(member => (
                    <tr key={member.id} className="border-t">
                      <td className="p-2">{member.role}</td>
                      <td className="p-2">{member.measurements}</td>
                      <td className="p-2">{member.status}</td>
                      <td className="p-2">{member.notes}</td>
                      <td className="p-2">
                        <div className="flex flex-col gap-2">
                          {(memberAlterations[member.id] || []).map(job => (
                            <ExpandableAlterationCard key={job.id} job={job} />
                          ))}
                          <div className="flex gap-2 mt-2">
                            <Button className="text-xs px-2 py-1 bg-blue-500 text-white" onClick={() => { setAlterationMemberId(member.id); setEditAlteration(null); setShowAlterationModal(true); }}>+ Add Alteration</Button>
                            <Button className="text-xs px-2 py-1 bg-green-600 text-white" onClick={() => { setApptInitial({ partyId: Number(id), partyMemberId: member.id }); setShowAppt(true); }}>+ Add Appointment</Button>
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <button className="mr-2 px-2 py-1 bg-yellow-400 rounded" onClick={() => { setEditMember(member); setForm(member); setShowEdit(true); }}>Edit</button>
                        <button className="px-2 py-1 bg-red-500 text-white rounded" onClick={() => handleRemove(member.id)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={members.length}
                onPageChange={setPage}
                className="my-4 flex justify-center"
              />
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
                      <button className="px-4 py-2 bg-gray-300 rounded dark:bg-gray-800 dark:text-gray-100" onClick={() => setShowAdd(false)}>Cancel</button>
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
                      <button className="px-4 py-2 bg-gray-300 rounded dark:bg-gray-800 dark:text-gray-100" onClick={() => setShowEdit(false)}>Cancel</button>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleEdit}>Save</button>
                    </div>
                  </div>
                </div>
              )}
              {/* Alteration Modal for member */}
              {showAlterationModal && (
                <AlterationModal
                  open={showAlterationModal}
                  onClose={() => setShowAlterationModal(false)}
                  alteration={editAlteration}
                  onSubmit={async (formData) => {
                    // Always tie to this member
                    const res = await fetch('/api/alterations', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ...formData, partyMemberId: alterationMemberId, partyId: party.id }),
                      credentials: 'include',
                    });
                    setShowAlterationModal(false);
                    setEditAlteration(null);
                    // Refresh alterations for this member
                    fetch(`/api/alterations/member/${alterationMemberId}`, { credentials: 'include' })
                      .then(res => res.json())
                      .then(jobs => setMemberAlterations(prev => ({ ...prev, [alterationMemberId]: jobs })));
                  }}
                />
              )}
              {/* Tag Preview/Print Modal */}
              {printJob && (
                <Modal open={!!printJob} onClose={() => setPrintJob(null)}>
                  <div className="flex flex-col items-center">
                    <TagPreview job={printJob} />
                    <Button className="mt-4 bg-blue-600 text-white" onClick={() => window.print()}>Print Tag</Button>
                    <Button className="mt-2" onClick={() => setPrintJob(null)}>Close</Button>
                  </div>
                </Modal>
              )}
            </TabsContent>
            <TabsContent value="timeline">
              <div className="bg-white dark:bg-gray-800 rounded shadow p-4 border border-blue-200">
                <h2 className="text-xl font-bold mb-2 flex items-center">Party Workflow Timeline
                  <button className="ml-auto px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2" onClick={handleTriggerBulkOrder} title="Trigger bulk suit order">
                    <span role="img" aria-label="bulk order">📦</span> Bulk Order
                  </button>
                </h2>
                <div className="flex gap-2 mb-4">
                  <button className="px-3 py-2 bg-green-600 text-white rounded flex items-center gap-2 text-sm" onClick={handleAdvanceAll} title="Advance all members to next status">
                    <span role="img" aria-label="advance">⏩</span> Advance All
                  </button>
                  <button className="px-3 py-2 bg-orange-500 text-white rounded flex items-center gap-2 text-sm" onClick={handleRemindAll} title="Send reminder to all members">
                    <span role="img" aria-label="remind">📲</span> Remind All
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Stepper</th>
                        <th>Appointments</th>
                        <th>Alteration Jobs</th>
                        <th>Latest Comm</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeline.timeline.map(row => (
                        <tr key={row.memberId} className="border-b border-blue-100">
                          <td className="py-2 px-1 font-semibold">{row.name}</td>
                          <td className="py-2 px-1">{row.role}</td>
                          <td className="py-2 px-1">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${STATUS_COLORS[row.status] || 'bg-gray-200 text-gray-800'}`}>{row.status}</span>
                          </td>
                          <td className="py-2 px-1"><MemberStepper status={row.status} /></td>
                          <td className="py-2 px-1">
                            {row.appointments.map(a => (
                              <div key={a.id} className="mb-1">{a.type} - {a.status} <span className="text-xs text-gray-500">({new Date(a.dateTime).toLocaleDateString()})</span></div>
                            ))}
                          </td>
                          <td className="py-2 px-1">
                            {row.alterationJobs.map(j => (
                              <div key={j.id} className="mb-1">Job #{j.id} - {j.status}</div>
                            ))}
                          </td>
                          <td className="py-2 px-1">
                            {(() => {
                              const comm = getLatestCommForMember(row);
                              return comm ? (
                                <div className="text-xs text-gray-700 dark:text-gray-200">
                                  <span className="font-bold">{comm.type}</span> <span className="text-gray-500">{new Date(comm.sentAt).toLocaleDateString()}</span>
                                  <div className="truncate max-w-[180px]" title={comm.content}>{comm.content.slice(0, 60)}{comm.content.length > 60 ? '…' : ''}</div>
                                </div>
                              ) : <span className="text-xs text-gray-400">No comms</span>;
                            })()}
                          </td>
                          <td className="py-2 px-1 flex flex-col gap-1 min-w-[180px]">
                            <div className="flex items-center gap-2 mb-1">
                              <select className="border rounded p-1 text-xs" defaultValue={row.status} onChange={e => handleAdvanceStatus(row.memberId, e.target.value)} title="Change status">
                                {WORKFLOW_STATUSES.map(s => (
                                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                ))}
                              </select>
                              <button className="px-2 py-1 bg-green-600 text-white rounded flex items-center gap-1 text-xs" onClick={() => handleAdvanceStatus(row.memberId, row.status)} title="Advance status">
                                <span role="img" aria-label="advance">⏩</span> Advance
                              </button>
                            </div>
                            <div className="flex gap-1">
                              <button 
                                className="px-2 py-1 bg-blue-600 text-white rounded flex items-center gap-1 text-xs flex-1" 
                                onClick={() => { setStatusMember(row); setShowStatusModal(true); }} 
                                title="Update status details"
                              >
                                <span role="img" aria-label="edit">✏️</span> Details
                              </button>
                              <button className="px-2 py-1 bg-orange-500 text-white rounded flex items-center gap-1 text-xs" onClick={() => handleNotifyPickup(row.memberId)} title="Notify pickup">
                                <span role="img" aria-label="notify">📲</span> Notify
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="orders">
              <div className="bg-white dark:bg-gray-800 rounded shadow p-4 border border-blue-200">
                <h2 className="text-xl font-bold mb-3">Orders</h2>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-sm">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Suit Order ID</th>
                        <th>Accessories Order ID</th>
                        <th>Ordered At</th>
                        <th>Received At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m:any) => (
                        <tr key={m.id} className="border-b">
                          <td className="py-2 px-1">{(m.notes||'').replace(/^Name:\s*/i,'').split(',')[0] || m.role}</td>
                          <td className="py-2 px-1">{m.role}</td>
                          <td className="py-2 px-1">{m.status}</td>
                          <td className="py-2 px-1">
                            <input className="border rounded p-1 text-xs w-32"
                              defaultValue={m.suitOrderId||''}
                              onBlur={async (e)=>{await fetch(`/api/parties/members/${m.id}/status`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({suitOrderId:e.target.value})}); fetchMembers();}}
                              placeholder="e.g. PO123"/>
                          </td>
                          <td className="py-2 px-1">
                            <input className="border rounded p-1 text-xs w-32"
                              defaultValue={m.accessoriesOrderId||''}
                              onBlur={async (e)=>{await fetch(`/api/parties/members/${m.id}/status`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessoriesOrderId:e.target.value})}); fetchMembers();}}
                              placeholder="e.g. AO456"/>
                          </td>
                          <td className="py-2 px-1">{m.orderedAt? new Date(m.orderedAt).toLocaleDateString(): '—'}</td>
                          <td className="py-2 px-1">{m.receivedAt? new Date(m.receivedAt).toLocaleDateString(): '—'}</td>
                          <td className="py-2 px-1">
                            <div className="flex gap-2">
                              <Button className="text-xs px-2 py-1" onClick={async ()=>{await fetch(`/api/parties/${id}/members/${m.id}/advance-status`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({newStatus:'ordered'}),credentials:'include'}); fetchMembers();}}>Mark Ordered</Button>
                              <Button className="text-xs px-2 py-1" onClick={async ()=>{await fetch(`/api/parties/${id}/members/${m.id}/advance-status`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({newStatus:'received'}),credentials:'include'}); fetchMembers();}}>Mark Received</Button>
                              <Button className="text-xs px-2 py-1" onClick={async ()=>{await fetch(`/api/parties/${id}/members/${m.id}/advance-status`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({newStatus:'being_altered'}),credentials:'include'}); fetchMembers();}}>Send to Alterations</Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3">
                  <Button className="bg-blue-600 text-white" onClick={handleTriggerBulkOrder}>Bulk Mark Ordered (Need to Order → Ordered)</Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="communications">
              <div className="bg-white dark:bg-gray-800 rounded shadow p-4">
                <h2 className="text-xl font-bold mb-2">Communication Log</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Direction</th>
                      <th>Content</th>
                      <th>Sent At</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {communications.map(log => (
                      <tr key={log.id}>
                        <td>{log.type}</td>
                        <td>{log.direction}</td>
                        <td className="max-w-xs truncate" title={log.content}>{log.content}</td>
                        <td>{new Date(log.sentAt).toLocaleString()}</td>
                        <td>{log.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Appointment Modal (prefilled for member) */}
      <AppointmentModal
        open={showAppt}
        onClose={() => { setShowAppt(false); setApptInitial(null); }}
        onSubmit={async (data: any) => {
          try {
            await fetch('/api/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(data) });
            setShowAppt(false);
          } catch (e) {
            console.error('Failed to create appointment', e);
          }
        }}
        appointment={apptInitial}
        loading={false}
      />

      {/* Status Update Modal */}
      <StatusUpdateModal
        open={showStatusModal}
        onClose={() => { setShowStatusModal(false); setStatusMember(null); }}
        member={statusMember}
        onSubmit={handleStatusUpdate}
      />
    </div>
  );
}

function StatusUpdateModal({ open, onClose, member, onSubmit }) {
  const [form, setForm] = useState({
    status: member?.status || 'awaiting_measurements',
    suitOrderId: member?.suitOrderId || '',
    accessoriesOrderId: member?.accessoriesOrderId || '',
    notes: member?.notes || ''
  });
  const [saving, setSaving] = useState(false);

  // Update form when member changes
  React.useEffect(() => {
    if (member) {
      setForm({
        status: member.status || 'awaiting_measurements',
        suitOrderId: member.suitOrderId || '',
        accessoriesOrderId: member.accessoriesOrderId || '',
        notes: member.notes || ''
      });
    }
  }, [member]);

  const statusOptions = [
    { value: 'awaiting_measurements', label: 'Awaiting Measurements' },
    { value: 'need_to_order', label: 'Need to Order' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'received', label: 'Received' },
    { value: 'being_altered', label: 'Being Altered' },
    { value: 'ready_for_pickup', label: 'Ready for Pickup' }
  ];

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded shadow-lg w-96 max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Update Member Status</h2>
          
          {member && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <p className="font-medium">{member.name || member.notes || `${member.role} Member`}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{member.role}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select 
                className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Suit Order ID</label>
              <input
                type="text"
                className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
                value={form.suitOrderId}
                onChange={e => setForm(f => ({ ...f, suitOrderId: e.target.value }))}
                placeholder="Enter suit order ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Accessories Order ID</label>
              <input
                type="text"
                className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
                value={form.accessoriesOrderId}
                onChange={e => setForm(f => ({ ...f, accessoriesOrderId: e.target.value }))}
                placeholder="Enter accessories order ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                className="w-full border rounded p-2 dark:bg-gray-800 dark:border-gray-700"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Add any notes..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <Button onClick={onClose} className="bg-gray-300 text-black dark:bg-gray-800 dark:text-gray-100">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Update Status'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ExpandableAlterationCard({ job }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border rounded mb-2">
      <div className="flex items-center justify-between p-2 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <span className="font-semibold text-xs">Job #{job.id} - {job.status}</span>
        <button className="text-xs text-blue-600">{expanded ? 'Hide Details' : 'Show Details'}</button>
      </div>
      {expanded && (
        <div className="p-2 text-xs space-y-2">
          <div>
            <span className="font-bold">Items to Alter:</span>
            <ul className="list-disc ml-5">
              {(job.parts || []).map((part, i) => (
                <li key={i}>
                  <span className="font-semibold">{part.part}:</span> {part.workType || '—'} {part.inches ? `(${part.inches}in)` : ''}
                  {part.notes && <span className="ml-2 italic text-gray-500">{part.notes}</span>}
                </li>
              ))}
            </ul>
          </div>
          {job.measurements && (
            <div>
              <span className="font-bold">Measurements:</span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                {Object.entries(job.measurements).map(([k, v]) => v ? <div key={k}><span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>: <span className="font-mono">{String(v)}{/in|length|waist|chest|hips|shoulder|overarm|neck|inseam|outseam|collar|sleeve/.test(k) ? 'in' : ''}</span></div> : null)}
              </div>
            </div>
          )}
          {job.notes && <div><span className="font-bold">Notes:</span> {job.notes}</div>}
          <div className="flex gap-4 mt-2">
            <span><b>Tailor:</b> {job.tailor ? <span className="inline-flex items-center gap-2"><UserAvatar user={{ id: job.tailor.id, name: job.tailor.name }} size="xs" showName /></span> : '—'}</span>
            <span><b>Status:</b> {job.status}</span>
            <span><b>Time Spent:</b> {job.timeSpentMinutes ? `${job.timeSpentMinutes} min` : '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
}