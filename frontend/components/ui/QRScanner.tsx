import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from './Badge';
import { Input } from './Input';
import { Label } from './Label';
import { Textarea } from './Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { Camera, QrCode, CheckCircle, XCircle, Play, Square, User, Clock, MapPin } from 'lucide-react';
import { useToast } from '../ToastContext';
import { format } from 'date-fns';

interface QRScannerProps {
  open: boolean;
  onClose: () => void;
  onScanSuccess: (scanResult: any) => Promise<void>;
}

interface ScanResult {
  success: boolean;
  result: string;
  part: {
    id: number;
    partName: string;
    status: string;
    qrCode: string;
    job: {
      id: number;
      jobNumber: string;
      customer?: {
        name: string;
        phone?: string;
      };
      party?: {
        name: string;
      };
    };
    assignedUser?: {
      name: string;
    };
    tasks: Array<{
      id: number;
      taskName: string;
      status: string;
    }>;
  };
  scanType: string;
  timestamp: string;
}

const SCAN_TYPES = [
  { value: 'START_WORK', label: 'Start Work', icon: Play, color: 'bg-blue-100 text-blue-800' },
  { value: 'FINISH_WORK', label: 'Finish Work', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
  { value: 'PICKUP', label: 'Pickup', icon: User, color: 'bg-purple-100 text-purple-800' },
  { value: 'STATUS_CHECK', label: 'Status Check', icon: QrCode, color: 'bg-gray-100 text-gray-800' },
  { value: 'QUALITY_CHECK', label: 'Quality Check', icon: CheckCircle, color: 'bg-yellow-100 text-yellow-800' },
];

const STATUS_COLORS = {
  NOT_STARTED: 'bg-gray-100 text-gray-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETE: 'bg-green-100 text-green-800',
  PICKED_UP: 'bg-purple-100 text-purple-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
};

export function QRScanner({ open, onClose, onScanSuccess }: QRScannerProps) {
  const { success: toastSuccess, error: toastError } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [manualQR, setManualQR] = useState('');
  const [scanType, setScanType] = useState('STATUS_CHECK');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera when component mounts and scanning is enabled
  useEffect(() => {
    if (open && isScanning) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, isScanning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toastError('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const toggleScanning = () => {
    if (isScanning) {
      stopCamera();
      setIsScanning(false);
    } else {
      setIsScanning(true);
    }
  };

  const handleScan = async (qrCode: string) => {
    if (!qrCode.trim()) {
      toastError('Please enter or scan a QR code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/alterations/scan/${encodeURIComponent(qrCode)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scanType,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Scan failed');
      }

      const result: ScanResult = await response.json();
      setLastScanResult(result);
      
      if (result.success) {
        toastSuccess(`Scan successful: ${result.result}`);
        await onScanSuccess(result);
        
        // Clear form for next scan
        setManualQR('');
        setNotes('');
      } else {
        toastError(result.result || 'Scan failed');
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
      toastError(error instanceof Error ? error.message : 'Failed to process scan');
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = () => {
    handleScan(manualQR);
  };

  const handleClose = () => {
    stopCamera();
    setIsScanning(false);
    setLastScanResult(null);
    setManualQR('');
    setNotes('');
    onClose();
  };

  const getScanTypeInfo = (type: string) => {
    return SCAN_TYPES.find(t => t.value === type) || SCAN_TYPES[0];
  };

  const getStatusBadgeClass = (status: string) => {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QR Code Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Scan Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Scan Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={scanType} onValueChange={setScanType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCAN_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Camera Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Camera Scanner
                <Button
                  onClick={toggleScanning}
                  variant={isScanning ? "destructive" : "default"}
                  size="sm"
                >
                  {isScanning ? (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Start Camera
                    </>
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isScanning ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 bg-black rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg"></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    Position QR code within the frame
                  </p>
                </div>
              ) : (
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-600">Camera not active</p>
                    <p className="text-sm text-gray-500">Click "Start Camera" to begin scanning</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual QR Entry */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Manual QR Code Entry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="manualQR">QR Code</Label>
                <Input
                  id="manualQR"
                  value={manualQR}
                  onChange={(e) => setManualQR(e.target.value)}
                  placeholder="Enter QR code manually"
                  className="font-mono"
                />
              </div>
              <Button
                onClick={handleManualScan}
                disabled={!manualQR.trim() || loading}
                className="w-full"
              >
                {loading ? 'Processing...' : 'Process QR Code'}
              </Button>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Workstation 1, Front Counter"
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes about this scan..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Last Scan Result */}
          {lastScanResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {lastScanResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  Last Scan Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Result:</span>
                    <Badge className={lastScanResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {lastScanResult.result}
                    </Badge>
                  </div>
                  
                  {lastScanResult.part && (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Job #:</span> {lastScanResult.part.job.jobNumber}
                        </div>
                        <div>
                          <span className="font-medium">Part:</span> {lastScanResult.part.partName}
                        </div>
                        <div>
                          <span className="font-medium">Customer:</span> {lastScanResult.part.job.customer?.name || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span>
                          <Badge className={`ml-2 ${getStatusBadgeClass(lastScanResult.part.status)}`}>
                            {lastScanResult.part.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      
                      {lastScanResult.part.assignedUser && (
                        <div className="text-sm">
                          <span className="font-medium">Assigned to:</span> {lastScanResult.part.assignedUser.name}
                        </div>
                      )}
                      
                      {lastScanResult.part.tasks.length > 0 && (
                        <div>
                          <span className="font-medium text-sm">Tasks:</span>
                          <div className="mt-1 space-y-1">
                            {lastScanResult.part.tasks.map(task => (
                              <div key={task.id} className="flex items-center justify-between text-sm">
                                <span>{task.taskName}</span>
                                <Badge className={getStatusBadgeClass(task.status)}>
                                  {task.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {format(new Date(lastScanResult.timestamp), 'MMM d, yyyy h:mm:ss a')}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default QRScanner; 