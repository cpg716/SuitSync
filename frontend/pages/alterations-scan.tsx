import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TailorSelectionModal } from '../components/TailorSelectionModal';
import { 
  QrCode, 
  User, 
  Phone, 
  Scissors, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Printer,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/router';
import { Skeleton } from '@/components/ui/Skeleton';

interface Tailor {
  id: number;
  name: string;
  email: string;
  photoUrl?: string;
  role: string;
}

interface AlterationJob {
  id: number;
  jobNumber: string;
  status: string;
  notes: string;
  party?: {
    name: string;
    customer: {
      name: string;
      phone: string;
    };
  };
  partyMember?: {
    role: string;
    notes: string;
  };
  customer?: {
    name: string;
    phone: string;
  };
  jobParts: Array<{
    id: number;
    partName: string;
    status: string;
    qrCode: string;
    tasks: Array<{
      id: number;
      taskName: string;
      status: string;
    }>;
  }>;
}

export default function AlterationsScanPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [currentJob, setCurrentJob] = useState<AlterationJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  
  // Tailor selection state
  const [selectedTailor, setSelectedTailor] = useState<Tailor | null>(null);
  const [showTailorSelection, setShowTailorSelection] = useState(false);
  const [sessionId, setSessionId] = useState('');

  // Generate a unique session ID for this device/browser session
  useEffect(() => {
    const storedSessionId = localStorage.getItem('tailorSessionId');
    if (storedSessionId) {
      setSessionId(storedSessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('tailorSessionId', newSessionId);
      setSessionId(newSessionId);
    }
  }, []);

  // Auto-focus QR input on page load
  useEffect(() => {
    const qrInput = document.getElementById('qr-input') as HTMLInputElement;
    if (qrInput) {
      qrInput.focus();
    }
  }, []);

  const handleTailorSelected = (tailor: Tailor) => {
    setSelectedTailor(tailor);
    // Remember tailor for this device
    try {
      localStorage.setItem('tailorSelected', JSON.stringify({ id: tailor.id, name: tailor.name, email: tailor.email, photoUrl: tailor.photoUrl }));
    } catch {}
    setShowTailorSelection(false);
  };

  // Load remembered tailor on first load
  useEffect(() => {
    try {
      const raw = localStorage.getItem('tailorSelected');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.name) {
          setSelectedTailor(parsed);
        }
      }
    } catch {}
  }, []);

  const handleQRSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCode.trim()) return;

    // Check if tailor is selected
    if (!selectedTailor) {
      setShowTailorSelection(true);
      return;
    }

    setScanning(true);
    setLoading(true);
    setMessage('');

    try {
      // First, try to find the job by QR code
      const response = await fetch(`/api/alterations/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          qrCode: qrCode.trim(),
          action: 'status_check',
          tailorId: selectedTailor.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentJob(data.job);
        setMessage(`Found job: ${data.job.jobNumber}`);
        setMessageType('success');
      } else {
        const error = await response.json();
        setMessage(error.error || 'QR code not found');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const handleStartWork = async (partId: number) => {
    if (!selectedTailor) {
      setShowTailorSelection(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/alterations/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          qrCode: qrCode.trim(),
          action: 'start',
          tailorId: selectedTailor.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentJob(data.job);
        setMessage('Work started successfully!');
        setMessageType('success');
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to start work');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishWork = async (partId: number) => {
    if (!selectedTailor) {
      setShowTailorSelection(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/alterations/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          qrCode: qrCode.trim(),
          action: 'finish',
          tailorId: selectedTailor.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentJob(data.job);
        setMessage('Work completed successfully!');
        setMessageType('success');
        
        if (data.allComplete) {
          setMessage('All parts completed! Job is ready for pickup.');
          setMessageType('success');
        }
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to complete work');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintTicket = async () => {
    if (!currentJob) return;
    
    try {
      const response = await fetch(`/api/alterations/jobs/${currentJob.id}/ticket`);
      if (response.ok) {
        const ticketData = await response.json();
        
        // Send to Lightspeed receipt printer
        const printResponse = await fetch('/api/print/alterations-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ticketData.ticketData)
        });
        
        if (printResponse.ok) {
          setMessage('Ticket sent to printer!');
          setMessageType('success');
        } else {
          setMessage('Print failed. Please try again.');
          setMessageType('error');
        }
      }
    } catch (error) {
      setMessage('Print error. Please try again.');
      setMessageType('error');
    }
  };

  const resetForm = () => {
    setQrCode('');
    setCurrentJob(null);
    setMessage('');
    setScanning(false);
    const qrInput = document.getElementById('qr-input') as HTMLInputElement;
    if (qrInput) {
      qrInput.focus();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'NOT_STARTED':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'NOT_STARTED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Alterations Scanner
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Scan QR codes to track alteration progress
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/alterations')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Alterations
          </Button>
        </div>

        {/* QR Code Scanner */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-6 h-6" />
              Scan QR Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Tailor Selection */}
            <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Selected Tailor
                  </h3>
                  {selectedTailor ? (
                    <div className="flex items-center gap-2">
                      {selectedTailor.photoUrl ? (
                        <img
                          src={selectedTailor.photoUrl}
                          alt={selectedTailor.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-gray-600 dark:text-gray-400 font-medium text-sm">
                            {selectedTailor.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <span className="text-gray-700 dark:text-gray-300">
                        {selectedTailor.name}
                      </span>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No tailor selected
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTailorSelection(true)}
                >
                  {selectedTailor ? 'Change Tailor' : 'Select Tailor'}
                </Button>
              </div>
            </div>

            <form onSubmit={handleQRSubmit} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  id="qr-input"
                  type="text"
                  placeholder="Enter or scan QR code..."
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  className="flex-1"
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !qrCode.trim()}>
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <QrCode className="w-4 h-4" />
                  )}
                  Scan
                </Button>
              </div>
            </form>

            {/* Message */}
            {message && (
              <div className={`mt-4 p-3 rounded-lg ${
                messageType === 'success' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : messageType === 'error'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
              }`}>
                {message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Details */}
        {currentJob && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Job: {currentJob.jobNumber}</span>
                <Button
                  onClick={handlePrintTicket}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Print Ticket
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {currentJob.customer?.name || currentJob.partyMember?.notes}
                    </p>
                    {currentJob.party && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {currentJob.party.name} - {currentJob.partyMember?.role}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-gray-100">
                    {currentJob.customer?.phone || currentJob.party?.customer.phone}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {currentJob.notes && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Notes
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {currentJob.notes}
                  </p>
                </div>
              )}

              {/* Parts and Tasks */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Parts & Alterations
                </h3>
                <div className="space-y-4">
                  {currentJob.jobParts.map((part) => (
                    <div key={part.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Scissors className="w-5 h-5 text-gray-400" />
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                            {part.partName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(part.status)}`}>
                            {getStatusIcon(part.status)}
                            {part.status.replace('_', ' ')}
                          </span>
                          {part.status === 'NOT_STARTED' && (
                            <Button
                              size="sm"
                              onClick={() => handleStartWork(part.id)}
                              disabled={loading}
                            >
                              Start Work
                            </Button>
                          )}
                          {part.status === 'IN_PROGRESS' && (
                            <Button
                              size="sm"
                              onClick={() => handleFinishWork(part.id)}
                              disabled={loading}
                            >
                              Finish Work
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {part.tasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-2 text-sm">
                            <span className={`w-2 h-2 rounded-full ${
                              task.status === 'COMPLETE' 
                                ? 'bg-green-500'
                                : task.status === 'IN_PROGRESS'
                                ? 'bg-blue-500'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`} />
                            <span className="text-gray-700 dark:text-gray-300">
                              {task.taskName}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* QR Codes */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-4">
                  QR Codes for Each Part
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentJob.jobParts.map((part) => (
                    <div key={part.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 capitalize">
                        {part.partName}
                      </div>
                      <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                        {part.qrCode}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Scan to update status
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium mt-0.5">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Select Your Tailor</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Choose which tailor you are from the dropdown above. Your selection will be remembered for future scans.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium mt-0.5">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Scan QR Code</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Scan or enter the QR code from the garment tag to view job details and update status.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium mt-0.5">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">Update Status</h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Click "Start Work" when you begin alterations and "Finish Work" when complete.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tailor Selection Modal */}
        <TailorSelectionModal
          isOpen={showTailorSelection}
          onClose={() => setShowTailorSelection(false)}
          onTailorSelected={handleTailorSelected}
          sessionId={sessionId}
        />
      </div>
    </div>
  );
} 