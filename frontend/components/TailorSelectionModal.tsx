import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api } from '../lib/apiClient';
import { useToast } from './ToastContext';

interface Tailor {
  id: number;
  name: string;
  email: string;
  photoUrl?: string;
  role: string;
}

interface TailorSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTailorSelected: (tailor: Tailor) => void;
  sessionId: string;
}

export const TailorSelectionModal: React.FC<TailorSelectionModalProps> = ({
  isOpen,
  onClose,
  onTailorSelected,
  sessionId
}) => {
  const [tailors, setTailors] = useState<Tailor[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTailor, setSelectedTailor] = useState<Tailor | null>(null);
  const [lastSelectedTailor, setLastSelectedTailor] = useState<Tailor | null>(null);
  const { error: toastError, success } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadTailors();
      loadLastSelectedTailor();
    }
  }, [isOpen, sessionId]);

  const loadTailors = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/tailor-selection/available');
      const data = (response.data ?? []) as unknown;
      if (Array.isArray(data)) {
        setTailors(data as Tailor[]);
      } else {
        setTailors([]);
      }
    } catch (err) {
      toastError('Failed to load available tailors');
      console.error('Error loading tailors:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLastSelectedTailor = async () => {
    try {
      const response = await api.get(`/api/tailor-selection/last/${sessionId}`);
      const payload = response.data as unknown;
      if (
        payload &&
        typeof payload === 'object' &&
        'tailor' in payload &&
        (payload as any).tailor &&
        typeof (payload as any).tailor === 'object'
      ) {
        const t = (payload as any).tailor as Tailor;
        setLastSelectedTailor(t);
        setSelectedTailor(t);
      }
    } catch (err) {
      // No last selection found, which is fine
      console.log('No previous tailor selection found');
    }
  };

  const handleTailorSelect = async (tailor: Tailor) => {
    setSelectedTailor(tailor);
    
    try {
      await api.post('/api/tailor-selection/save', {
        sessionId,
        selectedTailorId: tailor.id,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        }
      });
      
      success(`Selected ${tailor.name} as your tailor`);
      onTailorSelected(tailor);
      onClose();
    } catch (err) {
      toastError('Failed to save tailor selection');
      console.error('Error saving tailor selection:', err);
    }
  };

  const handleClearSelection = async () => {
    try {
      await api.delete(`/api/tailor-selection/clear/${sessionId}`);
      setLastSelectedTailor(null);
      setSelectedTailor(null);
      success('Tailor selection cleared');
    } catch (err) {
      toastError('Failed to clear tailor selection');
      console.error('Error clearing tailor selection:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6 bg-white shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Select Your Tailor</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {lastSelectedTailor && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Last selected:</strong> {lastSelectedTailor.name}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              This tailor will be pre-selected for you
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {tailors.map((tailor) => (
              <button
                key={tailor.id}
                onClick={() => handleTailorSelect(tailor)}
                className={`w-full p-3 border rounded-lg text-left transition-colors ${
                  selectedTailor?.id === tailor.id
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {tailor.photoUrl ? (
                    <img
                      src={tailor.photoUrl}
                      alt={tailor.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 font-medium">
                        {tailor.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{tailor.name}</p>
                    <p className="text-sm text-gray-500">{tailor.email}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {lastSelectedTailor && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              onClick={handleClearSelection}
              variant="outline"
              className="w-full text-sm"
            >
              Clear Previous Selection
            </Button>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>Your selection will be remembered for future QR code scans</p>
        </div>
      </Card>
    </div>
  );
}; 