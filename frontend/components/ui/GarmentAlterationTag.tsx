import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from './Button';
import { Badge } from './Badge';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Separator } from './separator';
import { Checkbox } from './checkbox';
import { Printer, Download, Eye, Calendar, User, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface AlterationTask {
  id: number;
  taskName: string;
  taskType: string;
  status: string;
  startTime?: string;
  finishTime?: string;
  assignedUser?: {
    name: string;
    initials?: string;
  };
  initials?: string;
  notes?: string;
  measurements?: string;
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
    name: string;
    initials?: string;
  };
  tasks: AlterationTask[];
}

interface WorkflowStep {
  id: number;
  stepName: string;
  stepType: string;
  completed: boolean;
  completedAt?: string;
  completedByUser?: {
    name: string;
  };
  sortOrder: number;
}

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
    name: string;
    phone?: string;
  };
  party?: {
    name: string;
    customer?: {
      name: string;
      phone?: string;
    };
  };
  jobParts: AlterationJobPart[];
  workflowSteps: WorkflowStep[];
}

interface GarmentAlterationTagProps {
  job: AlterationJob;
  part?: AlterationJobPart; // If specified, show only this part
  printMode?: boolean;
  showWorkflow?: boolean;
  onStatusUpdate?: (partId: number, newStatus: string) => void;
  onTaskUpdate?: (taskId: number, updates: any) => void;
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

export function GarmentAlterationTag({
  job,
  part,
  printMode = false,
  showWorkflow = true,
  onStatusUpdate,
  onTaskUpdate
}: GarmentAlterationTagProps) {
  const [selectedTasks, setSelectedTasks] = useState<{ [key: number]: boolean }>({});
  const tagRef = useRef<HTMLDivElement>(null);

  const customerInfo = job.customer || job.party?.customer;
  const partsToShow = part ? [part] : job.jobParts;

  const handlePrint = () => {
    if (tagRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Alteration Tag - ${job.jobNumber}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  margin: 0; 
                  padding: 20px; 
                  background: white;
                  color: black;
                  -webkit-print-color-adjust: exact;
                }
                .tag { 
                  border: 3px solid #333; 
                  padding: 20px; 
                  max-width: 600px; 
                  margin: 0 auto;
                  background: white;
                  page-break-inside: avoid;
                }
                .header { 
                  text-align: center; 
                  border-bottom: 2px solid #333; 
                  padding-bottom: 15px; 
                  margin-bottom: 20px; 
                }
                .qr-section { 
                  display: flex; 
                  justify-content: space-between; 
                  align-items: center; 
                  margin: 15px 0; 
                }
                .info-grid { 
                  display: grid; 
                  grid-template-columns: 1fr 1fr; 
                  gap: 15px; 
                  margin: 20px 0; 
                }
                .checkbox-grid { 
                  display: grid; 
                  grid-template-columns: repeat(3, 1fr); 
                  gap: 10px; 
                  margin: 15px 0; 
                }
                .checkbox-item { 
                  display: flex; 
                  align-items: center; 
                  gap: 8px; 
                }
                .status-badge { 
                  padding: 4px 12px; 
                  border-radius: 12px; 
                  font-size: 12px; 
                  font-weight: bold; 
                }
                .priority-badge { 
                  padding: 2px 8px; 
                  border-radius: 8px; 
                  font-size: 11px; 
                  font-weight: bold; 
                }
                .fold-line { 
                  border-top: 2px dashed #666; 
                  margin: 20px 0; 
                  text-align: center; 
                  padding-top: 10px; 
                }
                @media print {
                  body { margin: 0; padding: 10px; }
                  .tag { border: 2px solid #000; max-width: none; }
                }
              </style>
            </head>
            <body>
              ${tagRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownloadPDF = async () => {
    // This would typically use a library like jsPDF or html2pdf
    // For now, we'll use the browser's print to PDF functionality
    handlePrint();
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  const getStatusBadgeClass = (status: string) => {
    return `status-badge ${STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`;
  };

  const getPriorityBadgeClass = (priority: string) => {
    return `priority-badge ${PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS] || 'bg-gray-100 text-gray-600'}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {!printMode && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Alteration Tag - {job.jobNumber}</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      )}

      <div ref={tagRef} className="tag bg-white border-2 border-gray-800 p-6 rounded-lg">
        {/* Header */}
        <div className="header text-center border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-3xl font-bold">SuitSync</h1>
          <p className="text-lg font-semibold">Garment Alteration Tag</p>
        </div>

        {/* Customer & Job Info */}
        <div className="info-grid grid grid-cols-2 gap-6 mb-6">
          <div>
            <div className="space-y-2">
              <div><strong>Customer:</strong> {customerInfo?.name || 'N/A'}</div>
              {job.party && <div><strong>Party:</strong> {job.party.name}</div>}
              <div><strong>Job #:</strong> {job.jobNumber}</div>
              <div><strong>Phone:</strong> {customerInfo?.phone || 'N/A'}</div>
            </div>
          </div>
          <div>
            <div className="space-y-2">
              <div><strong>Received:</strong> {formatDate(job.receivedDate)}</div>
              {job.dueDate && <div><strong>Due:</strong> {formatDate(job.dueDate)}</div>}
              <div><strong>Order Status:</strong> {ORDER_STATUS_LABELS[job.orderStatus as keyof typeof ORDER_STATUS_LABELS]}</div>
              {job.rushOrder && <div className="text-red-600 font-bold">⚡ RUSH ORDER</div>}
            </div>
          </div>
        </div>

        {/* Main Job QR Code */}
        <div className="qr-section flex justify-between items-center mb-6 p-4 bg-gray-50 rounded">
          <div>
            <div className="font-bold text-lg">Job QR Code</div>
            <div className="text-sm text-gray-600">{job.qrCode}</div>
            <div className={getStatusBadgeClass(job.status)}>{job.status.replace('_', ' ')}</div>
          </div>
          <QRCodeSVG value={job.qrCode} size={80} />
        </div>

        {/* Workflow Steps */}
        {showWorkflow && (
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-3">Workflow Progress</h3>
            <div className="checkbox-grid grid grid-cols-4 gap-3">
              {job.workflowSteps.map((step) => (
                <div key={step.id} className="checkbox-item flex items-center space-x-2">
                  <Checkbox 
                    id={`workflow-${step.id}`}
                    checked={step.completed}
                    disabled={printMode}
                  />
                  <label 
                    htmlFor={`workflow-${step.id}`}
                    className={`text-sm ${step.completed ? 'line-through text-gray-500' : ''}`}
                  >
                    {step.stepName}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator className="my-6" />

        {/* Garment Parts */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold">Garments/Parts</h3>
          
          {partsToShow.map((jobPart) => (
            <Card key={jobPart.id} className="border-2">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      {jobPart.partName}
                      <span className={getPriorityBadgeClass(jobPart.priority)}>
                        {jobPart.priority}
                      </span>
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={getStatusBadgeClass(jobPart.status)}>
                        {jobPart.status.replace('_', ' ')}
                      </span>
                      {jobPart.assignedUser && (
                        <span className="text-sm text-gray-600">
                          <User className="w-4 h-4 inline mr-1" />
                          {jobPart.assignedUser.name}
                        </span>
                      )}
                      {jobPart.estimatedTime && (
                        <span className="text-sm text-gray-600">
                          <Clock className="w-4 h-4 inline mr-1" />
                          {jobPart.estimatedTime} min
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <QRCodeSVG value={jobPart.qrCode} size={60} />
                    <div className="text-xs mt-1 font-mono">{jobPart.qrCode.slice(-8)}</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Tasks */}
                {jobPart.tasks.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Tasks:</h4>
                    <div className="checkbox-grid grid grid-cols-3 gap-2">
                      {jobPart.tasks.map((task) => (
                        <div key={task.id} className="checkbox-item flex items-center space-x-2">
                          <Checkbox 
                            id={`task-${task.id}`}
                            checked={task.status === 'COMPLETE'}
                            disabled={printMode}
                          />
                          <label 
                            htmlFor={`task-${task.id}`}
                            className={`text-sm ${task.status === 'COMPLETE' ? 'line-through text-gray-500' : ''}`}
                          >
                            {task.taskName}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Task Details */}
                {jobPart.tasks.some(task => task.startTime || task.finishTime || task.initials) && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold">Task Log:</h4>
                    {jobPart.tasks.map((task) => (
                      <div key={task.id} className="text-sm space-y-1">
                        {task.startTime && (
                          <div>
                            <strong>{task.taskName}:</strong> Started {formatDateTime(task.startTime)}
                            {task.assignedUser?.initials && ` (${task.assignedUser.initials})`}
                          </div>
                        )}
                        {task.finishTime && (
                          <div>
                            <strong>{task.taskName}:</strong> Finished {formatDateTime(task.finishTime)}
                            {task.initials && ` (${task.initials})`}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {jobPart.notes && (
                  <div className="mt-4">
                    <strong>Notes:</strong> {jobPart.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Job Notes */}
        {job.notes && (
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Job Notes:</h4>
            <p className="text-sm bg-yellow-50 p-3 rounded border">{job.notes}</p>
          </div>
        )}

        {/* Claim Check Section */}
        <div className="fold-line border-t-2 border-dashed border-gray-400 mt-8 pt-4">
          <div className="text-center">
            <h4 className="font-bold mb-2">CLAIM CHECK</h4>
            <div className="flex justify-between items-center">
              <div>
                <div><strong>Job #:</strong> {job.jobNumber}</div>
                <div><strong>Customer:</strong> {customerInfo?.name}</div>
                {job.dueDate && <div><strong>Due:</strong> {formatDate(job.dueDate)}</div>}
              </div>
              <QRCodeSVG value={job.qrCode} size={50} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GarmentAlterationTag; 