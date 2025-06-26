import React from 'react';

const SplashScreen: React.FC = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-200 dark:from-neutral-900 dark:via-neutral-800 dark:to-neutral-900 z-50">
    <img src="/suitsync-logov.png" alt="SuitSync Logo" className="h-32 w-auto mb-8 drop-shadow-xl animate-fade-in" />
    <div className="flex items-center justify-center">
      <span className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  </div>
);

export default SplashScreen; 