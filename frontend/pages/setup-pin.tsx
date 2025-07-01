import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useToast } from '../components/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { KeyRound, Shield, Info } from 'lucide-react';
import { useAuth } from '../src/AuthContext';
import { apiFetch } from '../lib/apiClient';

export default function SetupPinPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ pin?: string; confirmPin?: string }>({});

  // Redirect if user is not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const validatePin = (pinValue: string): string | null => {
    if (!pinValue) {
      return 'PIN is required';
    }
    if (!/^\d{4}$/.test(pinValue)) {
      return 'PIN must be exactly 4 digits';
    }
    return null;
  };

  const handlePinChange = (value: string) => {
    // Only allow digits and limit to 4 characters
    const cleanValue = value.replace(/\D/g, '').slice(0, 4);
    setPin(cleanValue);
    
    // Clear error when user starts typing
    if (errors.pin) {
      setErrors(prev => ({ ...prev, pin: undefined }));
    }
  };

  const handleConfirmPinChange = (value: string) => {
    // Only allow digits and limit to 4 characters
    const cleanValue = value.replace(/\D/g, '').slice(0, 4);
    setConfirmPin(cleanValue);
    
    // Clear error when user starts typing
    if (errors.confirmPin) {
      setErrors(prev => ({ ...prev, confirmPin: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const pinError = validatePin(pin);
    const confirmPinError = pin !== confirmPin ? 'PINs do not match' : null;
    
    if (pinError || confirmPinError) {
      setErrors({
        pin: pinError || undefined,
        confirmPin: confirmPinError || undefined
      });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await apiFetch('/api/user-switch/set-pin', {
        method: 'POST',
        body: JSON.stringify({ pin })
      });

      if (response.ok) {
        const data = await response.json();
        toastSuccess('PIN set successfully! You can now use quick user switching.');
        
        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        const errorData = await response.json();
        toastError(errorData.error || 'Failed to set PIN');
      }
    } catch (error) {
      console.error('Error setting PIN:', error);
      toastError('Failed to set PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Allow user to skip PIN setup and go to dashboard
    router.push('/dashboard');
  };

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <KeyRound className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Set Up Your PIN
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create a 4-digit PIN for quick user switching
          </p>
        </div>

        <Card className="p-8">
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Why set up a PIN?</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Quick switching between user accounts</li>
                  <li>No need to re-authenticate with Lightspeed</li>
                  <li>Secure access with 4-digit PIN protection</li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
                Enter 4-digit PIN
              </label>
              <Input
                id="pin"
                type="password"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value)}
                placeholder="••••"
                maxLength={4}
                className={`text-center text-2xl tracking-widest ${errors.pin ? 'border-red-500' : ''}`}
                autoComplete="new-password"
              />
              {errors.pin && (
                <p className="mt-1 text-sm text-red-600">{errors.pin}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPin" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm PIN
              </label>
              <Input
                id="confirmPin"
                type="password"
                value={confirmPin}
                onChange={(e) => handleConfirmPinChange(e.target.value)}
                placeholder="••••"
                maxLength={4}
                className={`text-center text-2xl tracking-widest ${errors.confirmPin ? 'border-red-500' : ''}`}
                autoComplete="new-password"
              />
              {errors.confirmPin && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPin}</p>
              )}
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                disabled={loading || !pin || !confirmPin}
                className="w-full flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Setting up PIN...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Set PIN
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                className="w-full"
                disabled={loading}
              >
                Skip for now
              </Button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Security Information</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• PIN is encrypted and stored securely</li>
              <li>• 3 failed attempts will lock your account for 5 minutes</li>
              <li>• PIN expires after 7 days for security</li>
              <li>• You can change your PIN anytime in your profile</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
