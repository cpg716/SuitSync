import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { 
  QrCode, 
  Camera, 
  X, 
  CheckCircle, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function QRScanner({ onScan, onClose, isOpen }: QRScannerProps) {
  const [qrCode, setQrCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrCode.trim()) return;
    
    setScanning(true);
    setMessage('Processing QR code...');
    setMessageType('info');
    
    // Simulate processing
    setTimeout(() => {
      onScan(qrCode.trim());
      setScanning(false);
      setMessage('QR code processed successfully!');
      setMessageType('success');
      setQrCode('');
    }, 1000);
  };

  const handleScan = (scannedCode: string) => {
    setScanning(true);
    setMessage('Processing QR code...');
    setMessageType('info');
    
    // Simulate processing
    setTimeout(() => {
      onScan(scannedCode);
      setScanning(false);
      setMessage('QR code processed successfully!');
      setMessageType('success');
    }, 1000);
  };

  const resetScanner = () => {
    setQrCode('');
    setMessage('');
    setScanning(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-6 h-6" />
              Scan QR Code
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual Entry */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter QR Code Manually
            </h3>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                type="text"
                placeholder="Enter QR code..."
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                disabled={scanning}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={scanning || !qrCode.trim()}
                size="sm"
              >
                {scanning ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4" />
                )}
              </Button>
            </form>
          </div>

          {/* Camera Scanner Placeholder */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Camera QR Scanner
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              For mobile devices, use your camera app to scan QR codes
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Then copy and paste the code above
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              How to use:
            </h4>
            <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <li>1. Use your phone's camera to scan the QR code on the alteration tag</li>
              <li>2. Copy the QR code text</li>
              <li>3. Paste it in the input field above</li>
              <li>4. Click the scan button to update the alteration status</li>
            </ol>
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
              <div className="flex items-center gap-2">
                {messageType === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : messageType === 'error' ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                )}
                {message}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={resetScanner}
              className="flex-1"
            >
              Reset
            </Button>
            <Button
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 