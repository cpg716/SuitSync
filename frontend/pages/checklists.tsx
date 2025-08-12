import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { ChecklistCard } from '../components/ui/ChecklistCard';
import { TaskCard } from '../components/ui/TaskCard';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import { Skeleton } from '../components/ui/Skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { UserAvatar } from '../components/ui/UserAvatar';
import { Users, CheckCircle, ListChecks, ListTodo, PieChart } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Calendar as RBC, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { useAuth } from '../src/AuthContext';

/**
 * Checklist & Task Workspace Page
 * - Aggregates all checklists and tasks for the current user (not alteration-related)
 * - Allows filtering, creation, completion, and tracking
 * - Exports summary data for dashboard
 * - Uses ChecklistCard and TaskCard components
 * - Visually stunning: avatars, charts, summary cards, modern palette
 */



export default function ChecklistWorkspace() {
  const [loading, setLoading] = useState(true);
  const [checklists, setChecklists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tab, setTab] = useState('checklists');
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<{ checklistId: number }|null>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showAssignTemplateModal, setShowAssignTemplateModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();
  const [myView, setMyView] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [calView, setCalView] = useState<View>('month');
  const [calDate, setCalDate] = useState<Date>(new Date());
  const [templates, setTemplates] = useState<any[]>([]);
  const [checklistView, setChecklistView] = useState<'list'|'board'>('list');
  const [taskView, setTaskView] = useState<'list'|'board'>('list');

  const locales = { 'en-US': undefined as any };
  const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const endpoints = myView
        ? [
            fetch('/api/checklists/my-checklists', { credentials: 'include' }).then(r => r.json()).catch(() => []),
            fetch('/api/tasks/my-tasks', { credentials: 'include' }).then(r => r.json()).catch(() => []),
          ]
        : [
            fetch('/api/checklists', { credentials: 'include' }).then(r => r.json()).catch(() => []),
            fetch('/api/tasks', { credentials: 'include' }).then(r => r.json()).catch(() => []),
          ];
      const [cl, tk] = await Promise.all(endpoints);
      setChecklists(Array.isArray(cl) ? cl : []);
      setTasks(Array.isArray(tk) ? tk : []);
      setLoading(false);
    }
    fetchData();
  }, [myView]);

  useEffect(() => {
    fetch('/api/public/users').then(r => r.json()).then(setUsers).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    // Load checklist templates for quick-assign and management
    fetch('/api/checklists/templates', { credentials: 'include' })
      .then(r => r.json()).then(data => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]));
  }, []);

  // Filtering logic (stub, can be expanded)
  const filteredChecklists = filter === 'all' ? checklists : checklists.filter(c => c.status === filter);
  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  async function updateTaskStatus(id: number, status: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status }) });
    if (res.ok) setTasks(ts => ts.map((t: any) => t.id === id ? { ...t, status, completedAt: status === 'COMPLETED' ? new Date().toISOString() : t.completedAt } : t));
  }

  async function updateTaskNotes(id: number, notes: string) {
    const res = await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ notes }) });
    if (res.ok) setTasks(ts => ts.map((t: any) => t.id === id ? { ...t, notes } : t));
  }

  async function deleteTask(id: number) {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) setTasks(ts => ts.filter((t: any) => t.id !== id));
  }

  async function startChecklistExecution(assignmentId: number) {
    const res = await fetch(`/api/checklists/assignments/${assignmentId}/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ scheduledFor: new Date().toISOString() }) });
    if (res.ok) {
      const exec = await res.json();
      // Refresh my view to include execution with items
      if (myView) {
        const cl = await fetch('/api/checklists/my-checklists', { credentials: 'include' }).then(r => r.json()).catch(() => []);
        setChecklists(Array.isArray(cl) ? cl : []);
      }
    }
  }

  async function updateChecklistItem(executionId: number, itemId: number, isCompleted: boolean) {
    const res = await fetch(`/api/checklists/executions/${executionId}/items/${itemId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ isCompleted }) });
    if (res.ok) {
      if (myView) {
        setChecklists((cls: any[]) => cls.map((ex: any) => ex.id === executionId ? { ...ex, itemExecutions: ex.itemExecutions.map((ie: any) => ie.itemId === itemId ? { ...ie, isCompleted, completedAt: isCompleted ? new Date().toISOString() : null } : ie) } : ex));
      }
    }
  }

  const calendarEvents = React.useMemo(() => {
    const evs: any[] = [];
    if (myView) {
      // My tasks
      (Array.isArray(tasks) ? tasks : []).forEach((t: any) => {
        if (t.dueDate) evs.push({ id: `task-${t.id}`, title: `Task: ${t.title}`, start: new Date(t.dueDate), end: new Date(t.dueDate), resource: { kind: 'task', task: t } });
      });
      // My checklist executions
      (Array.isArray(checklists) ? checklists : []).forEach((ex: any) => {
        const when = ex.scheduledFor || ex.assignment?.dueDate;
        if (when) evs.push({ id: `chk-${ex.id}`, title: `Checklist: ${ex.assignment?.checklist?.title || 'Checklist'}`, start: new Date(when), end: new Date(when), resource: { kind: 'checklist', execution: ex } });
      });
    } else {
      // Admin view
      (Array.isArray(tasks) ? tasks : []).forEach((t: any) => {
        if (t.dueDate) {
          if (selectedUserIds.length === 0 || selectedUserIds.includes(String(t.assignedTo?.id))) {
            evs.push({ id: `task-${t.id}`, title: `Task: ${t.title} (${t.assignedTo?.name || ''})`, start: new Date(t.dueDate), end: new Date(t.dueDate), resource: { kind: 'task', task: t } });
          }
        }
      });
      (Array.isArray(checklists) ? checklists : []).forEach((cl: any) => {
        (cl.assignments || []).forEach((as: any) => {
          if (as.dueDate && (selectedUserIds.length === 0 || selectedUserIds.includes(String(as.assignedTo?.id)))) {
            evs.push({ id: `assign-${as.id}`, title: `Checklist: ${cl.title} (${as.assignedTo?.name || ''})`, start: new Date(as.dueDate), end: new Date(as.dueDate), resource: { kind: 'assignment', assignment: as, checklist: cl } });
          }
        });
      });
    }
    return evs;
  }, [myView, tasks, checklists, selectedUserIds]);

  // Summary data for dashboard export
  const summary = {
    totalChecklists: checklists.length,
    completedChecklists: checklists.filter(c => c.status === 'COMPLETED').length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
  };



  return (
    <Layout title="Checklists & Task Management">
      <div className="w-full space-y-8">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 animate-fade-in">
        <div className="flex-1">
          <h1 className="text-4xl font-extrabold text-white mb-2 drop-shadow-lg">Checklists & Task Management</h1>
          <p className="text-lg text-blue-100 mb-4">Track, manage, and complete all your work in one place.</p>
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="lg" showName />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
            <PieChart className="w-12 h-12 text-white" />
          </div>
          <span className="text-white text-sm font-semibold">{summary.completedChecklists + summary.completedTasks} / {summary.totalChecklists + summary.totalTasks} Completed</span>
        </div>
      </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <ListChecks className="w-6 h-6 text-blue-600" />
            <CardTitle>Checklists</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-200 animate-countup">{summary.totalChecklists}</div>
            <div className="text-sm text-blue-500">{summary.completedChecklists} completed</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <ListTodo className="w-6 h-6 text-green-600" />
            <CardTitle>Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700 dark:text-green-200 animate-countup">{summary.totalTasks}</div>
            <div className="text-sm text-green-500">{summary.completedTasks} completed</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <CheckCircle className="w-6 h-6 text-purple-600" />
            <CardTitle>Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-200 animate-countup">
              {summary.totalChecklists + summary.totalTasks === 0 ? '0%' : Math.round(((summary.completedChecklists + summary.completedTasks) / (summary.totalChecklists + summary.totalTasks)) * 100) + '%'}
            </div>
            <div className="text-sm text-purple-500">of all items</div>
          </CardContent>
        </Card>
        <Card className="bg-indigo-50 dark:bg-indigo-900/30 shadow-md hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <CardTitle>Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex -space-x-2">
              {/* Show avatars for all unique staff assigned to checklists/tasks */}
              {[...new Set([
                ...checklists.flatMap(cl => cl.assignedBy ? [cl.assignedBy] : []),
                ...tasks.flatMap(tk => tk.assignedTo ? [tk.assignedTo] : [])
              ].filter(Boolean).map(u => u.id))].slice(0, 5).map((id, idx) => {
                const userObj = [...checklists, ...tasks].map(x => x.assignedBy || x.assignedTo).find(u => u && u.id === id);
                return userObj ? <UserAvatar key={id} user={userObj} size="sm" showName={false} /> : null;
              })}
            </div>
            <div className="text-sm text-indigo-500 mt-2">Assigned staff</div>
          </CardContent>
        </Card>
      </div>

        {/* Tabs and Main Content */}
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="checklists">Checklists</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
          <div className="flex gap-2 my-4 items-center flex-wrap">
          <Button onClick={() => setShowChecklistModal(true)} variant="outline">New Checklist</Button>
          <Button onClick={() => setShowTaskModal(true)} variant="outline">New Task</Button>
          <Button onClick={() => setShowAssignTemplateModal(true)} variant="outline">Assign From Template</Button>
          <Button onClick={() => setShowTemplatesModal(true)} variant="outline">Templates</Button>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={myView} onChange={e => setMyView(e.target.checked)} />
              <span className="text-sm">My items only</span>
            </label>
            <select value={filter} onChange={e => setFilter(e.target.value)} className="ml-auto border rounded px-2 py-1">
              <option value="all">All</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        <TabsContent value="checklists">
          <div className="flex items-center justify-end mb-3 gap-2">
            <span className="text-xs text-gray-500">View:</span>
            <Button size="sm" variant={checklistView==='list'?'default':'outline'} onClick={()=>setChecklistView('list')}>List</Button>
            <Button size="sm" variant={checklistView==='board'?'default':'outline'} onClick={()=>setChecklistView('board')}>Board</Button>
          </div>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : filteredChecklists.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <div className="text-6xl mb-3">✅</div>
              <div className="font-medium">No checklists found</div>
              <div className="text-sm">Create one or assign from a template.</div>
            </div>
          ) : (
            checklistView === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredChecklists.map((execOrCl: any) => {
                  const cl = execOrCl.assignment ? execOrCl.assignment.checklist : execOrCl;
                  return (
                    <div key={cl.id} className="relative">
                      <ChecklistCard
                        {...cl}
                        onDelete={async () => {
                          if (!confirm('Delete this checklist?')) return;
                          await fetch(`/api/checklists/${cl.id}`, { method: 'DELETE', credentials: 'include' });
                          window.location.reload();
                        }}
                        onEdit={() => setShowAssignModal({ checklistId: cl.id })}
                      />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setShowAssignModal({ checklistId: cl.id })}>Assign</Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Board: group by status
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['NOT_STARTED','IN_PROGRESS','COMPLETED','OVERDUE'].map(status => (
                  <div key={status} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-3">
                    <div className="font-semibold text-sm mb-2">{status.replace('_',' ')}</div>
                    <div className="space-y-3">
                      {filteredChecklists.filter((c:any)=> (c.status||'NOT_STARTED')===status).map((execOrCl:any)=>{
                        const cl = execOrCl.assignment ? execOrCl.assignment.checklist : execOrCl;
                        return (
                          <div key={cl.id} className="relative">
                            <ChecklistCard
                              {...cl}
                              onDelete={async () => {
                                if (!confirm('Delete this checklist?')) return;
                                await fetch(`/api/checklists/${cl.id}`, { method: 'DELETE', credentials: 'include' });
                                window.location.reload();
                              }}
                              onEdit={() => setShowAssignModal({ checklistId: cl.id })}
                            />
                            <div className="absolute top-2 right-2 flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setShowAssignModal({ checklistId: cl.id })}>Assign</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </TabsContent>
        <TabsContent value="tasks">
          <div className="flex items-center justify-end mb-3 gap-2">
            <span className="text-xs text-gray-500">View:</span>
            <Button size="sm" variant={taskView==='list'?'default':'outline'} onClick={()=>setTaskView('list')}>List</Button>
            <Button size="sm" variant={taskView==='board'?'default':'outline'} onClick={()=>setTaskView('board')}>Board</Button>
          </div>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : filteredTasks.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              <div className="text-6xl mb-3">📝</div>
              <div className="font-medium">No tasks found</div>
              <div className="text-sm">Create a task to get started.</div>
            </div>
          ) : (
            taskView === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map((tk: any) => (
                  <TaskCard
                    key={tk.id}
                    {...tk}
                    canEdit={true}
                    onUpdateStatus={(s) => updateTaskStatus(tk.id, s)}
                    onUpdateNotes={(n) => updateTaskNotes(tk.id, n)}
                    onDelete={() => deleteTask(tk.id)}
                  />
                ))}
              </div>
            ) : (
              // Board grouped by status columns
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {['PENDING','IN_PROGRESS','COMPLETED','OVERDUE'].map(status => (
                  <div key={status} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-3">
                    <div className="font-semibold text-sm mb-2">{status.replace('_',' ')}</div>
                    <div className="space-y-3">
                      {filteredTasks.filter((t:any)=> t.status===status).map((tk:any)=> (
                        <TaskCard
                          key={tk.id}
                          {...tk}
                          canEdit={true}
                          onUpdateStatus={(s) => updateTaskStatus(tk.id, s)}
                          onUpdateNotes={(n) => updateTaskNotes(tk.id, n)}
                          onDelete={() => deleteTask(tk.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </TabsContent>
        <TabsContent value="calendar">
          <div className="flex items-center gap-2 mb-3">
            {!myView && (
              <>
                <span className="text-sm">Filter users</span>
                <select multiple className="border rounded px-2 py-1" value={selectedUserIds} onChange={(e) => setSelectedUserIds(Array.from(e.target.selectedOptions).map(o => o.value))}>
                  {users.map(u => <option key={u.id} value={String(u.id)}>{u.name} ({u.role})</option>)}
                </select>
                <Button size="sm" variant="outline" onClick={() => setSelectedUserIds([])}>Clear</Button>
              </>
            )}
          </div>
          <div className="h-[650px]">
            <RBC
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              date={calDate}
              onNavigate={setCalDate}
              view={calView}
              onView={v => setCalView(v)}
              popup
            />
          </div>
        </TabsContent>
      </Tabs>
      {/* Checklist Modal */}
  <ChecklistCreateModal open={showChecklistModal} onClose={() => setShowChecklistModal(false)} onCreated={() => window.location.reload()} />
      {/* Task Modal */}
      <TaskCreateModal open={showTaskModal} onClose={() => setShowTaskModal(false)} onCreated={() => window.location.reload()} />
      {/* Assign Checklist Modal */}
      {showAssignModal && (
        <ChecklistAssignModal
          checklistId={showAssignModal.checklistId}
          open={!!showAssignModal}
          onClose={() => setShowAssignModal(null)}
          onAssigned={() => window.location.reload()}
        />
      )}

      {/* Templates Manager */}
      <TemplatesManagerModal
        open={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        templates={templates}
        onChanged={async () => {
          const data = await fetch('/api/checklists/templates', { credentials: 'include' }).then(r => r.json()).catch(() => []);
          setTemplates(Array.isArray(data) ? data : []);
        }}
      />

      {/* Assign from Template */}
      <AssignTemplateModal
        open={showAssignTemplateModal}
        onClose={() => setShowAssignTemplateModal(false)}
        templates={templates}
        users={users}
        onAssigned={() => window.location.reload()}
      />
        </div>
    </Layout>
  );
} 

// Signal to _app that this page already wraps itself with Layout
(ChecklistWorkspace as any).getLayout = (page: React.ReactNode) => page;

function TemplatesManagerModal({ open, onClose, templates, onChanged }: { open: boolean; onClose: () => void; templates: any[]; onChanged: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'DAILY'|'WEEKLY'|'MONTHLY'|'YEARLY'>('DAILY');
  const [isRequired, setIsRequired] = useState(false);
  const [items, setItems] = useState<Array<{ title: string; description?: string; isRequired?: boolean }>>([{ title: '' }]);
  const [saving, setSaving] = useState(false);

  async function saveTemplate() {
    setSaving(true);
    try {
      const res = await fetch('/api/checklists/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, description, frequency, isRequired, items })
      });
      if (!res.ok) throw new Error('Failed');
      setTitle(''); setDescription(''); setItems([{ title: '' }]);
      onChanged();
    } finally { setSaving(false); }
  }

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Checklist Templates" size="lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <h3 className="font-semibold">Create Template</h3>
          <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <select className="border rounded px-2 py-2" value={frequency} onChange={e => setFrequency(e.target.value as any)}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
            <label className="flex items-center gap-2"><input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} /> Required</label>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Items</span>
              <Button size="sm" variant="outline" onClick={() => setItems(arr => [...arr, { title: '' }])}>Add Item</Button>
            </div>
            {items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2">
                <div className="col-span-5"><Input placeholder="Item title" value={it.title} onChange={e => setItems(arr => arr.map((x,i)=> i===idx ? { ...x, title: e.target.value } : x))} /></div>
                <div className="col-span-5"><Input placeholder="Item description" value={it.description || ''} onChange={e => setItems(arr => arr.map((x,i)=> i===idx ? { ...x, description: e.target.value } : x))} /></div>
                <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={!!it.isRequired} onChange={e => setItems(arr => arr.map((x,i)=> i===idx ? { ...x, isRequired: e.target.checked } : x))} /> Required</label>
              </div>
            ))}
          </div>
          <div className="flex justify-end"><Button onClick={saveTemplate} disabled={saving || !title.trim()}>Save Template</Button></div>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">Existing Templates</h3>
          <div className="max-h-80 overflow-auto border rounded">
            {(Array.isArray(templates)? templates: []).map((t:any) => (
              <div key={t.id} className="p-3 border-b">
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-gray-500">{t.frequency}</div>
                <div className="text-sm text-gray-600">{t.description}</div>
                <div className="text-xs text-gray-500 mt-1">{Array.isArray(t.items)? t.items.length: 0} items</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function AssignTemplateModal({ open, onClose, templates, users, onAssigned }:{ open:boolean; onClose:()=>void; templates:any[]; users:any[]; onAssigned:()=>void }) {
  const [templateId, setTemplateId] = useState<string>('');
  const [selected, setSelected] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  if (!open) return null;
  async function handleAssign(){
    setSaving(true);
    try{
      const res = await fetch('/api/checklists/templates/assign', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ templateId: Number(templateId), userIds: selected.map(Number), dueDate: dueDate || undefined })});
      if (!res.ok) throw new Error('Failed');
      onClose(); onAssigned();
    } finally { setSaving(false); }
  }
  return (
    <Modal open={open} onClose={onClose} title="Assign From Template" size="md">
      <div className="space-y-3">
        <div>
          <label className="text-sm">Template</label>
          <select className="w-full border rounded px-2 py-2" value={templateId} onChange={e => setTemplateId(e.target.value)}>
            <option value="">Select template…</option>
            {templates.map((t:any)=> <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm">Assign Users</label>
          <div className="max-h-48 overflow-auto border rounded p-2">
            {users.map((u:any)=> (
              <label key={u.id} className="flex items-center gap-2 py-1">
                <input type="checkbox" checked={selected.includes(String(u.id))} onChange={e=> setSelected(arr => e.target.checked ? [...arr, String(u.id)] : arr.filter(x=> x!== String(u.id)))} />
                <span>{u.name} ({u.role})</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm">Due Date (optional)</label>
          <input type="date" className="w-full border rounded px-2 py-2" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={saving || !templateId || selected.length===0}>Assign</Button>
        </div>
      </div>
    </Modal>
  );
}
function ChecklistCreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'DAILY'|'WEEKLY'|'MONTHLY'|'YEARLY'>('DAILY');
  const [isRequired, setIsRequired] = useState(false);
  const [items, setItems] = useState<Array<{ title: string; description?: string; isRequired?: boolean }>>([
    { title: '' }
  ]);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [assignTo, setAssignTo] = useState<string[]>([]);
  const [assignDue, setAssignDue] = useState('');

  React.useEffect(() => {
    if (!open) return;
    fetch('/api/public/users').then(r => r.json()).then(setUsers).catch(() => setUsers([]));
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, description, frequency, isRequired, items, assignToUserIds: assignTo.map(Number), assignDueDate: assignDue || undefined })
      });
      if (!res.ok) throw new Error('Failed to create checklist');
      onClose();
      onCreated();
    } catch (e) {
      alert('Could not create checklist');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Checklist" size="lg">
      <div className="space-y-3">
        <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Frequency</label>
            <select className="w-full border rounded px-2 py-2" value={frequency} onChange={e => setFrequency(e.target.value as any)}>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
          <label className="flex items-center gap-2 mt-6">
            <input type="checkbox" checked={isRequired} onChange={e => setIsRequired(e.target.checked)} />
            Required for completion
          </label>
        </div>

        {/* Optional Assignment at Creation */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Assign To (optional)</label>
              <div className="max-h-40 overflow-auto border rounded p-2">
                {users.map((u: any) => (
                  <label key={u.id} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={assignTo.includes(String(u.id))}
                      onChange={(e) => setAssignTo(arr => e.target.checked ? [...arr, String(u.id)] : arr.filter(x => x !== String(u.id)))}
                    />
                    <span>{u.name} ({u.role})</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm">Assignment Due Date (optional)</label>
              <input type="date" className="w-full border rounded px-2 py-2" value={assignDue} onChange={e => setAssignDue(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Items</span>
            <Button size="sm" variant="outline" onClick={() => setItems(arr => [...arr, { title: '' }])}>Add Item</Button>
          </div>
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <div className="col-span-5"><Input placeholder="Item title" value={it.title} onChange={e => setItems(arr => arr.map((x, i) => i===idx ? { ...x, title: e.target.value } : x))} /></div>
              <div className="col-span-5"><Input placeholder="Item description" value={it.description || ''} onChange={e => setItems(arr => arr.map((x, i) => i===idx ? { ...x, description: e.target.value } : x))} /></div>
              <label className="col-span-2 flex items-center gap-2"><input type="checkbox" checked={!!it.isRequired} onChange={e => setItems(arr => arr.map((x, i) => i===idx ? { ...x, isRequired: e.target.checked } : x))} /> Required</label>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>Create</Button>
        </div>
      </div>
    </Modal>
  );
}

function TaskCreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'LOW'|'MEDIUM'|'HIGH'|'URGENT'>('MEDIUM');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(60);
  const [users, setUsers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch('/api/public/users').then(r => r.json()).catch(() => []),
      fetch('/api/customers?limit=50').then(r => r.json()).then(d => Array.isArray(d?.customers) ? d.customers : (Array.isArray(d)? d: [])).catch(() => [])
    ]).then(([u, c]) => { setUsers(u); setCustomers(c); });
  }, [open]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title, description, priority, assignedToId: Number(assignedToId), dueDate: dueDate || undefined, estimatedMinutes, customerId: customerId? Number(customerId) : undefined })
      });
      if (!res.ok) throw new Error('Failed to create task');
      onClose();
      onCreated();
    } catch (e) {
      alert('Could not create task');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Task" size="md">
      <div className="space-y-3">
        <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Priority</label>
            <select className="w-full border rounded px-2 py-2" value={priority} onChange={e => setPriority(e.target.value as any)}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className="text-sm">Assigned To</label>
            <select className="w-full border rounded px-2 py-2" value={assignedToId} onChange={e => setAssignedToId(e.target.value)}>
              <option value="">Select user…</option>
              {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-sm">Related Customer (optional)</label>
          <select className="w-full border rounded px-2 py-2" value={customerId} onChange={e => setCustomerId(e.target.value)}>
            <option value="">None</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>{(c.display_name || `${c.last_name || ''}${c.last_name && c.first_name ? ', ' : ''}${c.first_name || ''}`).trim() || `#${c.id}`}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">Due Date</label>
            <input type="date" className="w-full border rounded px-2 py-2" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Estimated Minutes</label>
            <input type="number" min={1} max={480} className="w-full border rounded px-2 py-2" value={estimatedMinutes} onChange={e => setEstimatedMinutes(Number(e.target.value))} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || !assignedToId}>Create</Button>
        </div>
      </div>
    </Modal>
  );
}

function ChecklistAssignModal({ checklistId, open, onClose, onAssigned }: { checklistId: number; open: boolean; onClose: () => void; onAssigned: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    fetch('/api/public/users').then(r => r.json()).then(setUsers).catch(() => setUsers([]));
  }, [open]);

  async function handleAssign() {
    setSaving(true);
    try {
      const res = await fetch(`/api/checklists/${checklistId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userIds: selected.map(Number), dueDate: dueDate || undefined })
      });
      if (!res.ok) throw new Error('Failed to assign');
      onClose();
      onAssigned();
    } catch (e) {
      alert('Could not assign checklist');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Assign Checklist" size="md">
      <div className="space-y-3">
        <div>
          <label className="text-sm">Select Users</label>
          <div className="max-h-64 overflow-auto border rounded p-2">
            {users.map((u: any) => (
              <label key={u.id} className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={selected.includes(String(u.id))}
                  onChange={(e) => setSelected(arr => e.target.checked ? [...arr, String(u.id)] : arr.filter(x => x !== String(u.id)))}
                />
                <span>{u.name} ({u.role})</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm">Due Date (optional)</label>
          <input type="date" className="w-full border rounded px-2 py-2" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAssign} disabled={saving || selected.length === 0}>Assign</Button>
        </div>
      </div>
    </Modal>
  );
}