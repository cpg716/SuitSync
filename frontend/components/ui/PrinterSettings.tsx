import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Printer, Settings, Save, RefreshCw } from 'lucide-react';

interface PrinterSettingsProps {
  onSave?: (settings: PrinterSettings) => void;
  initialSettings?: PrinterSettings;
}

export interface PrinterSettings {
  alterationsTicketPrinter: string;
  tagPrinter: string;
  receiptPrinter: string;
}

export default function PrinterSettings({ onSave, initialSettings }: PrinterSettingsProps) {
  const [settings, setSettings] = useState<PrinterSettings>({
    alterationsTicketPrinter: '',
    tagPrinter: '',
    receiptPrinter: '',
    ...initialSettings
  });
  
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAvailablePrinters();
    loadSavedSettings();
  }, []);

  const loadAvailablePrinters = async () => {
    setLoading(true);
    try {
      // This would call the system to get available printers
      // For now, we'll simulate with common printer names
      const printers = [
        'HP LaserJet Pro M404n',
        'Canon PIXMA TS8320',
        'Brother HL-L2350DW',
        'Epson WorkForce WF-3720',
        'Zebra ZD420',
        'Star TSP100'
      ];
      setAvailablePrinters(printers);
    } catch (error) {
      console.error('Failed to load printers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedSettings = async () => {
    try {
      const saved = localStorage.getItem('printerSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Failed to load saved settings:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to localStorage for now
      localStorage.setItem('printerSettings', JSON.stringify(settings));
      
      // Also save to backend if API exists
      try {
        await fetch('/api/settings/printers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings)
        });
      } catch (error) {
        console.warn('Failed to save to backend, using localStorage only');
      }
      
      onSave?.(settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = async (printerType: keyof PrinterSettings) => {
    try {
      const response = await fetch('/api/print/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printer: settings[printerType],
          type: printerType
        })
      });
      
      if (response.ok) {
        alert('Test print sent successfully!');
      } else {
        alert('Test print failed. Please check printer connection.');
      }
    } catch (error) {
      alert('Test print failed. Please check printer connection.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Printer Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Alterations Ticket Printer */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Alterations Ticket Printer
          </label>
          <div className="flex gap-2">
            <select
              value={settings.alterationsTicketPrinter}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                alterationsTicketPrinter: e.target.value 
              }))}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select printer...</option>
              {availablePrinters.map((printer) => (
                <option key={printer} value={printer}>
                  {printer}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestPrint('alterationsTicketPrinter')}
              disabled={!settings.alterationsTicketPrinter}
            >
              <Printer className="w-4 h-4" />
              Test
            </Button>
          </div>
        </div>

        {/* Tag Printer */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Tag Printer (ZPL/ESC-P)
          </label>
          <div className="flex gap-2">
            <select
              value={settings.tagPrinter}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                tagPrinter: e.target.value 
              }))}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select printer...</option>
              {availablePrinters.map((printer) => (
                <option key={printer} value={printer}>
                  {printer}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestPrint('tagPrinter')}
              disabled={!settings.tagPrinter}
            >
              <Printer className="w-4 h-4" />
              Test
            </Button>
          </div>
        </div>

        {/* Receipt Printer */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Receipt Printer
          </label>
          <div className="flex gap-2">
            <select
              value={settings.receiptPrinter}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                receiptPrinter: e.target.value 
              }))}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select printer...</option>
              {availablePrinters.map((printer) => (
                <option key={printer} value={printer}>
                  {printer}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestPrint('receiptPrinter')}
              disabled={!settings.receiptPrinter}
            >
              <Printer className="w-4 h-4" />
              Test
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Settings
          </Button>
          <Button
            variant="outline"
            onClick={loadAvailablePrinters}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Printers
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 