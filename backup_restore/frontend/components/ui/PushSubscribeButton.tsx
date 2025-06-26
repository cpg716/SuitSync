import React, { useState } from 'react';

const PushSubscribeButton: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const subscribe = async () => {
    setStatus('loading');
    setError('');
    try {
      if (!('serviceWorker' in navigator)) throw new Error('Service worker not supported');
      if (!('PushManager' in window)) throw new Error('Push not supported');
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Permission denied');
      // Get VAPID public key from server
      const vapidRes = await fetch('/api/push/vapidPublicKey');
      const vapidPublicKey = await vapidRes.text();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      // Send subscription to backend
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error('Failed to subscribe');
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Error');
    }
  };

  // Helper to convert VAPID key
  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        className="bg-primary text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-primary-light transition"
        onClick={subscribe}
        disabled={status === 'loading' || status === 'success'}
      >
        {status === 'success' ? 'Subscribed!' : status === 'loading' ? 'Subscribing…' : 'Subscribe to Notifications'}
      </button>
      {status === 'error' && <span className="text-red-600 text-sm">{error}</span>}
      {status === 'success' && <span className="text-green-600 text-sm">You'll receive notifications.</span>}
    </div>
  );
};

export default PushSubscribeButton; 