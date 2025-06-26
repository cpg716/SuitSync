import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl px-6 py-4 flex flex-col sm:flex-row items-center gap-3 animate-fade-in">
      <span className="text-base font-medium text-gray-900 dark:text-gray-100">Install SuitSync for a better experience!</span>
      <div className="flex gap-2 mt-2 sm:mt-0">
        <Button onClick={handleInstall} className="bg-primary text-white px-4 py-2 rounded-lg font-semibold">Install</Button>
        <Button onClick={() => setVisible(false)} className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-semibold">Dismiss</Button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt; 