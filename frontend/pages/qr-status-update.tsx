import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  QrCode, 
  User, 
  Phone, 
  Scissors, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/router';

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

export default function QRStatusUpdatePage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState('');
  const [currentJob, setCurrentJob] = useState<AlterationJob | null>(null);
  const [currentPart, setCurrentPart] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  // Get QR code from URL parameter
  useEffect(() => {
    const { qr } = router.query;
    if (qr && typeof qr === 'string') {
      setQrCode(qr);
      handleQRScan(qr);
    }
  }, [router.query]);

  const handleQRScan = async (code: string) => {
    setLoading(true);
    setMessage('');

    try {
      // Find the job by QR code
      const response = await fetch(`/api/alterations/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          qrCode: code,
          action: 'status_check'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentJob(data.job);
        
        // Find the specific part that was scanned
        const scannedPart = data.job.jobParts.find((part: any) => part.qrCode === code);
        setCurrentPart(scannedPart);
        
        setMessage(`Found: ${data.job.jobNumber} - ${scannedPart.partName}`);
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
    }
  };

  const handleStartWork = async () => {
    if (!currentPart) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/alterations/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          qrCode: currentPart.qrCode,
          action: 'start'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentJob(data.job);
        setCurrentPart(data.job.jobParts.find((part: any) => part.qrCode === currentPart.qrCode));
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

  const handleFinishWork = async () => {
    if (!currentPart) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/alterations/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          qrCode: currentPart.qrCode,
          action: 'finish'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentJob(data.job);
        setCurrentPart(data.job.jobParts.find((part: any) => part.qrCode === currentPart.qrCode));
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETE':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'NOT_STARTED':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
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

  if (loading && !currentJob) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Alteration Status
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Update work progress
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded-lg ${
            messageType === 'success' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
              : messageType === 'error'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
          }`}>
            {message}
          </div>
        )}

        {/* Job Details */}
        {currentJob && currentPart && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job: {currentJob.jobNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-gray-100">
                    {currentJob.customer?.name || currentJob.partyMember?.notes}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    {currentJob.customer?.phone || currentJob.party?.customer.phone}
                  </span>
                </div>
                {currentJob.party && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {currentJob.party.name} - {currentJob.partyMember?.role}
                  </div>
                )}
              </div>

              {/* Current Part */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-gray-400" />
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {currentPart.partName}
                    </h3>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(currentPart.status)}`}>
                    {getStatusIcon(currentPart.status)}
                    {currentPart.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Tasks */}
                <div className="space-y-2 mb-4">
                  {currentPart.tasks.map((task: any) => (
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

                {/* Action Buttons */}
                <div className="space-y-2">
                  {currentPart.status === 'NOT_STARTED' && (
                    <Button
                      onClick={handleStartWork}
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Clock className="w-4 h-4 mr-2" />
                      )}
                      Start Work
                    </Button>
                  )}
                  
                  {currentPart.status === 'IN_PROGRESS' && (
                    <Button
                      onClick={handleFinishWork}
                      disabled={loading}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Finish Work
                    </Button>
                  )}
                  
                  {currentPart.status === 'COMPLETE' && (
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                      <p className="text-green-700 dark:text-green-400 font-medium">
                        Part Completed
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual QR Entry */}
        {!currentJob && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Manual QR Entry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter QR code manually..."
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <Button
                  onClick={() => handleQRScan(qrCode)}
                  disabled={loading || !qrCode.trim()}
                  className="w-full"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <QrCode className="w-4 h-4 mr-2" />
                  )}
                  Check Status
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="w-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
} 