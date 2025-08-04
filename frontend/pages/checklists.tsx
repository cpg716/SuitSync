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
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../src/AuthContext';

/**
 * Checklist & Task Workspace Page
 * - Aggregates all checklists and tasks for the current user (not alteration-related)
 * - Allows filtering, creation, completion, and tracking
 * - Exports summary data for dashboard
 * - Uses ChecklistCard and TaskCard components
 * - Visually stunning: avatars, charts, summary cards, modern palette
 */

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function ChecklistWorkspace() {
  const [loading, setLoading] = useState(true);
  const [checklists, setChecklists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tab, setTab] = useState('checklists');
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      // Fetch checklists and tasks from backend (non-alteration)
      const [cl, tk] = await Promise.all([
        fetch('/api/checklists').then(r => r.json()).catch(() => []),
        fetch('/api/tasks').then(r => r.json()).catch(() => []),
      ]);
      setChecklists(Array.isArray(cl.checklists) ? cl.checklists : []);
      setTasks(Array.isArray(tk.tasks) ? tk.tasks : []);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Filtering logic (stub, can be expanded)
  const filteredChecklists = filter === 'all' ? checklists : checklists.filter(c => c.status === filter);
  const filteredTasks = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  // Summary data for dashboard export
  const summary = {
    totalChecklists: checklists.length,
    completedChecklists: checklists.filter(c => c.status === 'COMPLETED').length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
  };

  // Pie chart data
  const pieData = [
    { name: 'Completed', value: summary.completedChecklists + summary.completedTasks },
    { name: 'Open', value: (summary.totalChecklists + summary.totalTasks) - (summary.completedChecklists + summary.completedTasks) },
  ];

  return (
    <Layout title="Checklist & Task Workspace">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-xl shadow-lg mb-8 p-8 flex flex-col md:flex-row items-center gap-6 animate-fade-in">
        <div className="flex-1">
          <h1 className="text-4xl font-extrabold text-white mb-2 drop-shadow-lg">Checklist & Task Workspace</h1>
          <p className="text-lg text-blue-100 mb-4">Track, manage, and complete all your work in one place.</p>
          <div className="flex items-center gap-3">
            <UserAvatar user={user} size="lg" showName />
            <span className="text-white font-medium">{user?.name}</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <RePieChart width={120} height={120}>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={50} innerRadius={30} label>
              {pieData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </RePieChart>
          <span className="text-white text-sm font-semibold">{summary.completedChecklists + summary.completedTasks} / {summary.totalChecklists + summary.totalTasks} Completed</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        </TabsList>
        <div className="flex gap-2 my-4">
          <Button onClick={() => setShowChecklistModal(true)} variant="outline">New Checklist</Button>
          <Button onClick={() => setShowTaskModal(true)} variant="outline">New Task</Button>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="ml-auto border rounded px-2 py-1">
            <option value="all">All</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
        <TabsContent value="checklists">
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : filteredChecklists.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No checklists found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 space-y-6">
              {filteredChecklists.map(cl => (
                <ChecklistCard key={cl.id} {...cl} />
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="tasks">
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : filteredTasks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No tasks found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 space-y-6">
              {filteredTasks.map(tk => (
                <TaskCard key={tk.id} {...tk} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      {/* Checklist Modal (stub) */}
      <Modal open={showChecklistModal} onClose={() => setShowChecklistModal(false)}>
        <div className="p-4">
          <h2 className="text-lg font-bold mb-2">New Checklist</h2>
          <Input placeholder="Checklist Title" className="mb-2" />
          <Button className="w-full">Create</Button>
        </div>
      </Modal>
      {/* Task Modal (stub) */}
      <Modal open={showTaskModal} onClose={() => setShowTaskModal(false)}>
        <div className="p-4">
          <h2 className="text-lg font-bold mb-2">New Task</h2>
          <Input placeholder="Task Title" className="mb-2" />
          <Button className="w-full">Create</Button>
        </div>
      </Modal>
    </Layout>
  );
} 