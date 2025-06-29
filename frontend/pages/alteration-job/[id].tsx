import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { GetServerSideProps } from 'next';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import GarmentAlterationTag from '@/components/ui/GarmentAlterationTag';
import QRScanner from '@/components/ui/QRScanner';
import { useToast } from '@/components/ToastContext';
import { 
  ArrowLeft, 
  Printer, 
  QrCode, 
  Edit, 
  User, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  Square,
  Eye,
  History
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Modal } from '@/components/ui/Modal';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/Select';

interface AlterationJob {
  id: number;
  jobNumber: string;
  qrCode: string;
  status: string;
  orderStatus: string;
  receivedDate: string;
  dueDate?: string;
  rushOrder: boolean;
  notes?: string;
  customer?: {
    id: number;
    name: string;
    phone?: string;
    email?: string;
  };
  party?: {
    id: number;
    name: string;
    eventDate: string;
    customer?: {
      name: string;
      phone?: string;
    };
  };
  partyMember?: {
    id: number;
    role: string;
  };
  tailor?: {
    id: number;
    name: string;
  };
  jobParts: AlterationJobPart[];
  workflowSteps: WorkflowStep[];
}

interface AlterationJobPart {
  id: number;
  partName: string;
  partType: string;
  status: string;
  qrCode: string;
  notes?: string;
  priority: string;
  estimatedTime?: number;
  assignedUser?: {
    id: number;
    name: string;
    initials?: string;
  };
  tasks: AlterationTask[];
  scanLogs: QRScanLog[];
}

interface AlterationTask {
  id: number;
  taskName: string;
  taskType: string;
  status: string;
  startTime?: string;
  finishTime?: string;
  assignedUser?: {
    id: number;
    name: string;
    initials?: string;
  };
  initials?: string;
  notes?: string;
  measurements?: string;
  taskLogs: TaskLog[];
}

interface WorkflowStep {
  id: number;
  stepName: string;
  stepType: string;
  completed: boolean;
  completedAt?: string;
  completedByUser?: {
    id: number;
    name: string;
  };
  sortOrder: number;
  notes?: string;
}

interface QRScanLog {
  id: number;
  qrCode: string;
  scanType: string;
  timestamp: string;
  result?: string;
  location?: string;
  user: {
    id: number;
    name: string;
  };
  metadata?: any;
}

interface TaskLog {
  id: number;
  action: string;
  timestamp: string;
  notes?: string;
  user: {
    id: number;
    name: string;
  };
}

interface AlterationJobDetailProps {
  job: AlterationJob;
}

const STATUS_COLORS = {
  NOT_STARTED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETE: 'bg-green-100 text-green-800',
  PICKED_UP: 'bg-purple-100 text-purple-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
};

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-600',
  NORMAL: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-600',
  RUSH: 'bg-red-100 text-red-600',
};

const ORDER_STATUS_LABELS = {
  ORDERED: 'Ordered',
  IN_STOCK: 'In-Stock',
  ALTERATION_ONLY: 'Alteration Only',
};

export default function AlterationJobDetail({ job: initialJob }: AlterationJobDetailProps) {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [job, setJob] = useState<AlterationJob>(initialJob);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [showAutoAssignModal, setShowAutoAssignModal] = useState(false);
  const [autoAssignPreview, setAutoAssignPreview] = useState<any[]>([]);
  const [autoAssignOverrides, setAutoAssignOverrides] = useState<Record<number, string | null>>({});
  const [autoAssignLoading, setAutoAssignLoading] = useState(false);
  const [autoAssignError, setAutoAssignError] = useState('');

  const customerInfo = job.customer || job.party?.customer;

  const refreshJob = async () => {
    try {
      const response = await fetch(`/api/alterations/jobs/${job.id}`);
      if (response.ok) {
        const updatedJob = await response.json();
        setJob(updatedJob);
      }
    } catch (error) {
      console.error('Error refreshing job:', error);
    }
  };

  const handleWorkflowStepToggle = async (stepId: number, completed: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/alterations/jobs/${job.id}/workflow/${stepId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed }),
      });

      if (!response.ok) {
        throw new Error('Failed to update workflow step');
      }

      await refreshJob();
      toastSuccess(`Workflow step ${completed ? 'completed' : 'unchecked'}`);
    } catch (error) {
      console.error('Error updating workflow step:', error);
      toastError('Failed to update workflow step');
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = async (scanResult: any) => {
    await refreshJob();
    toastSuccess('Job updated from QR scan');
  };

  const getStatusBadgeClass = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadgeClass = (priority: string) => {
    return PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || 'bg-gray-100 text-gray-600';
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const isOverdue = job.dueDate && new Date(job.dueDate) < new Date() && !['COMPLETE', 'PICKED_UP'].includes(job.status);

  const handleAutoAssign = async () => {
    setAutoAssignLoading(true);
    setAutoAssignError('');
    try {
      const response = await fetch(`/api/alterations/jobs/${job.id}/auto-assign`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to auto-assign tailors');
      const data = await response.json();
      if (data.success && Array.isArray(data.assignments)) {
        setAutoAssignPreview(data.assignments);
        setShowAutoAssignModal(true);
      } else {
        setAutoAssignError('Auto-assignment failed');
      }
    } catch (err) {
      setAutoAssignError('Auto-assignment failed');
    } finally {
      setAutoAssignLoading(false);
    }
  };

  const handleOverrideChange = (partId: number, tailorId: string | null) => {
    setAutoAssignOverrides(prev => ({ ...prev, [partId]: tailorId }));
    setAutoAssignPreview(prev => prev.map(a => a.partId === partId ? { ...a, assignedTailorId: tailorId } : a));
  };

  const handleConfirmAutoAssign = async () => {
    setAutoAssigning(true);
    setAutoAssignError('');
    try {
      // Send the chosen assignments to the backend
      const assignments = autoAssignPreview.map(a => ({ partId: a.partId, assignedTailorId: a.assignedTailorId }));
      const response = await fetch(`/api/alterations/jobs/${job.id}/auto-assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });
      if (!response.ok) throw new Error('Failed to apply assignments');
      await refreshJob();
      setShowAutoAssignModal(false);
      toastSuccess('Auto-assignment applied!');
    } catch (err) {
      setAutoAssignError('Failed to apply assignments');
    } finally {
      setAutoAssigning(false);
    }
  };

  return (
    <Layout title="Alteration Job">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3">
                Job #{job.jobNumber}
                <Badge className={getStatusBadgeClass(job.status)}>
                  {job.status.replace('_', ' ')}
                </Badge>
                {job.rushOrder && (
                  <Badge className="bg-red-100 text-red-800">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    RUSH
                  </Badge>
                )}
                {isOverdue && (
                  <Badge className="bg-red-100 text-red-800">
                    OVERDUE
                  </Badge>
                )}
              </h1>
              <p className="text-gray-600">
                {customerInfo?.name} {job.party && `• ${job.party.name}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setScannerOpen(true)}
            >
              <QrCode className="w-4 h-4 mr-2" />
              Scan QR
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/alteration-job/${job.id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              onClick={handleAutoAssign}
              disabled={autoAssigning || autoAssignLoading}
            >
              <Play className="w-4 h-4 mr-2" />
              {autoAssigning || autoAssignLoading ? 'Auto-Assigning...' : 'Auto-Assign Tailors'}
            </Button>
          </div>
        </div>

        {/* Job Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Name:</span> {customerInfo?.name || 'N/A'}
              </div>
              {customerInfo?.phone && (
                <div>
                  <span className="font-medium">Phone:</span> {customerInfo.phone}
                </div>
              )}
              {customerInfo && typeof customerInfo === 'object' && 'email' in customerInfo && typeof customerInfo.email === 'string' && (
                <div>
                  <span className="font-medium">Email:</span> {customerInfo.email}
                </div>
              )}
              {job.party && (
                <>
                  <Separator className="my-2" />
                  <div>
                    <span className="font-medium">Party:</span> {job.party.name}
                  </div>
                  <div>
                    <span className="font-medium">Event:</span> {formatDate(job.party.eventDate)}
                  </div>
                  {job.partyMember && (
                    <div>
                      <span className="font-medium">Role:</span> {job.partyMember.role}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Received:</span> {formatDate(job.receivedDate)}
              </div>
              {job.dueDate && (
                <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
                  <span className="font-medium">Due:</span> {formatDate(job.dueDate)}
                  {isOverdue && ' (OVERDUE)'}
                </div>
              )}
              <div>
                <span className="font-medium">Order Status:</span> {ORDER_STATUS_LABELS[job.orderStatus as keyof typeof ORDER_STATUS_LABELS]}
              </div>
              {job.tailor && (
                <div>
                  <span className="font-medium">Assigned Tailor:</span> {job.tailor.name}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Progress Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="font-medium">Total Parts:</span> {job.jobParts.length}
              </div>
              <div>
                <span className="font-medium">In Progress:</span> {job.jobParts.filter(p => p.status === 'IN_PROGRESS').length}
              </div>
              <div>
                <span className="font-medium">Complete:</span> {job.jobParts.filter(p => p.status === 'COMPLETE').length}
              </div>
              <div>
                <span className="font-medium">Picked Up:</span> {job.jobParts.filter(p => p.status === 'PICKED_UP').length}
              </div>
              <div>
                <span className="font-medium">Workflow:</span> {job.workflowSteps.filter(s => s.completed).length}/{job.workflowSteps.length} steps
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Job Notes */}
              {job.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Job Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm bg-yellow-50 p-3 rounded border">{job.notes}</p>
                  </CardContent>
                </Card>
              )}
              {/* Parts Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Garment Parts Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {job.jobParts.map(part => (
                      <Card key={part.id} className="border-2">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{part.partName}</CardTitle>
                            <Badge className={getPriorityBadgeClass(part.priority)}>
                              {part.priority}
                            </Badge>
                          </div>
                          <Badge className={getStatusBadgeClass(part.status)}>
                            {part.status.replace('_', ' ')}
                          </Badge>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {part.assignedUser && (
                            <div className="text-sm">
                              <User className="w-3 h-3 inline mr-1" />
                              {part.assignedUser.name}
                            </div>
                          )}
                          {part.estimatedTime && (
                            <div className="text-sm">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {part.estimatedTime} min
                            </div>
                          )}
                          <div className="text-sm">
                            <span className="font-medium">Tasks:</span> {part.tasks.length}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Complete:</span> {part.tasks.filter(t => t.status === 'COMPLETE').length}/{part.tasks.length}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
          {/* Parts & Tasks Card */}
          <Card>
            <CardHeader>
              <CardTitle>Parts & Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {job.jobParts.map(part => (
                <Card key={part.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-3">
                          {part.partName}
                          <Badge className={getPriorityBadgeClass(part.priority)}>
                            {part.priority}
                          </Badge>
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge className={getStatusBadgeClass(part.status)}>
                            {part.status.replace('_', ' ')}
                          </Badge>
                          {part.assignedUser && (
                            <span className="text-sm text-gray-600">
                              <User className="w-4 h-4 inline mr-1" />
                              {part.assignedUser.name}
                            </span>
                          )}
                          {part.estimatedTime && (
                            <span className="text-sm text-gray-600">
                              <Clock className="w-4 h-4 inline mr-1" />
                              {part.estimatedTime} min
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                          {part.qrCode.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Tasks */}
                    {part.tasks.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold">Tasks:</h4>
                        {part.tasks.map(task => (
                          <div key={task.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{task.taskName}</span>
                                <Badge className={getStatusBadgeClass(task.status)}>
                                  {task.status.replace('_', ' ')}
                                </Badge>
                              </div>
                              {task.assignedUser && (
                                <span className="text-sm text-gray-600">
                                  {task.assignedUser.name}
                                </span>
                              )}
                            </div>
                            
                            {task.measurements && (
                              <div className="text-sm mb-1">
                                <span className="font-medium">Measurements:</span> {task.measurements}
                              </div>
                            )}
                            
                            {task.notes && (
                              <div className="text-sm mb-2">
                                <span className="font-medium">Notes:</span> {task.notes}
                              </div>
                            )}
                            
                            {(task.startTime || task.finishTime) && (
                              <div className="text-xs text-gray-500 space-y-1">
                                {task.startTime && (
                                  <div>Started: {formatDateTime(task.startTime)}</div>
                                )}
                                {task.finishTime && (
                                  <div>Finished: {formatDateTime(task.finishTime)}</div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {part.notes && (
                      <div className="mt-4">
                        <span className="font-medium">Part Notes:</span>
                        <p className="text-sm bg-gray-50 p-2 rounded mt-1">{part.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
          {/* Workflow Card */}
          <Card>
            <CardHeader>
              <CardTitle>Workflow</CardTitle>
            </CardHeader>
            <CardContent>
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Steps</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {job.workflowSteps.map(step => (
                      <div key={step.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={step.completed}
                            onCheckedChange={(checked) => handleWorkflowStepToggle(step.id, checked as boolean)}
                            disabled={loading}
                          />
                          <div>
                            <div className={`font-medium ${step.completed ? 'line-through text-gray-500' : ''}`}>
                              {step.stepName}
                            </div>
                            {step.completed && step.completedAt && (
                              <div className="text-xs text-gray-500">
                                Completed {formatDistanceToNow(new Date(step.completedAt))} ago
                                {step.completedByUser && ` by ${step.completedByUser.name}`}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className={step.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {step.completed ? 'Complete' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
          {/* History Card */}
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <Card>
                <CardHeader>
                  <CardTitle>QR Scan History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {job.jobParts.flatMap(part => 
                      part.scanLogs.map(log => ({ ...log, partName: part.partName }))
                    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(log => (
                      <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            {log.scanType.replace('_', ' ')} - {(log as any).partName}
                          </div>
                          <div className="text-sm text-gray-600">
                            by {log.user.name} • {formatDateTime(log.timestamp)}
                          </div>
                          {log.location && (
                            <div className="text-xs text-gray-500">
                              Location: {log.location}
                            </div>
                          )}
                        </div>
                        <Badge className="bg-blue-100 text-blue-800">
                          {log.result || 'Success'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
          {/* Tag Card */}
          <Card>
            <CardHeader>
              <CardTitle>Tag</CardTitle>
            </CardHeader>
            <CardContent>
              <GarmentAlterationTag job={job} showWorkflow={true} />
            </CardContent>
          </Card>
        </div>

        {/* QR Scanner Modal */}
        <QRScanner
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />

        {/* Auto-Assign Preview Modal */}
        <Modal open={showAutoAssignModal} onClose={() => setShowAutoAssignModal(false)} size="lg">
          <div className="p-2">
            <h2 className="text-xl font-bold mb-4">Auto-Assignment Preview</h2>
            {autoAssignError && <div className="text-red-600 mb-2">{autoAssignError}</div>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Part</th>
                    <th className="border px-2 py-1">Assigned Tailor</th>
                    <th className="border px-2 py-1">Reason</th>
                    <th className="border px-2 py-1">Candidates</th>
                  </tr>
                </thead>
                <tbody>
                  {autoAssignPreview.map(a => (
                    <tr key={a.partId}>
                      <td className="border px-2 py-1">{a.partId}</td>
                      <td className="border px-2 py-1">
                        <Select
                          value={a.assignedTailorId || ''}
                          onValueChange={val => handleOverrideChange(a.partId, val || null)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select tailor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Unassigned</SelectItem>
                            {a.candidates && a.candidates.filter(c => c.reason === 'Available').map(c => (
                              <SelectItem key={c.tailorId} value={c.tailorId}>{c.name} (Workload: {c.workload || 0} min, Prof: {c.proficiency})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {a.candidates && a.candidates.length > 0 && (
                          <div className="text-xs text-gray-500">{a.candidates.find(c => c.tailorId === a.assignedTailorId)?.name || ''}</div>
                        )}
                      </td>
                      <td className="border px-2 py-1">{a.reason}</td>
                      <td className="border px-2 py-1">
                        {a.candidates && a.candidates.length > 0 ? (
                          <ul className="list-disc pl-4">
                            {a.candidates.map(c => (
                              <li key={c.tailorId}>
                                {c.name} (Workload: {c.workload || 0} min, Prof: {c.proficiency}, {c.reason})
                              </li>
                            ))}
                          </ul>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-4 mt-6 justify-end">
              <Button variant="outline" onClick={() => setShowAutoAssignModal(false)} disabled={autoAssigning}>Cancel</Button>
              <Button onClick={handleConfirmAutoAssign} disabled={autoAssigning}>
                {autoAssigning ? 'Applying...' : 'Confirm Assignment'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params!;
  
  try {
    const response = await fetch(`/api/alterations/jobs/${id}`);
    
    if (!response.ok) {
      return {
        notFound: true,
      };
    }
    
    const job = await response.json();
    
    return {
      props: {
        job,
      },
    };
  } catch (error) {
    console.error('Error fetching job:', error);
    return {
      notFound: true,
    };
  }
}; 