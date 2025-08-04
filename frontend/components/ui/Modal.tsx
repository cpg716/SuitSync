import React, { useEffect } from 'react';

interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  title?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
  open, 
  onClose, 
  children, 
  className = '',
  size = 'md',
  title,
  ...props 
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm sm:max-w-md',
    md: 'max-w-md sm:max-w-lg',
    lg: 'max-w-lg sm:max-w-xl lg:max-w-2xl',
    xl: 'max-w-xl sm:max-w-2xl lg:max-w-4xl',
    full: 'max-w-[95vw] sm:max-w-[90vw]'
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      {...props}
    >
      <div className={`
        bg-white dark:bg-gray-800
        rounded-lg shadow-2xl
        w-full ${sizeClasses[size]}
        max-h-[95vh] sm:max-h-[90vh]
        flex flex-col
        relative
        ${className}
      `}>
        {/* Header with title and close button */}
        {title && (
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl font-bold min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
              aria-label="Close modal"
            >
              ×
            </button>
          </div>
        )}

        {/* Close button - only if no title */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl font-bold z-10 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-manipulation"
            aria-label="Close modal"
          >
            ×
          </button>
        )}

        {/* Scrollable content */}
        <div className={`flex-1 overflow-y-auto ${title ? 'p-4 sm:p-6' : 'p-4 sm:p-6 pt-12 sm:pt-6'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};