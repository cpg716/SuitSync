import { createContext, useContext } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const ToastContext = createContext({
  success: (msg: string) => {},
  error: (msg: string) => {},
  info: (msg: string) => {},
});

export function ToastProvider({ children }) {
  return (
    <ToastContext.Provider value={{
      success: (msg: string) => toast.success(msg),
      error: (msg: string) => toast.error(msg),
      info: (msg: string) => toast(msg),
    }}>
      <Toaster position="top-right" toastOptions={{
        style: { fontFamily: 'Inter, sans-serif', fontSize: 15 },
        success: { style: { background: '#0055A5', color: '#fff' } },
        error: { style: { background: '#FFC200', color: '#1F2D3D' } },
      }} />
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}