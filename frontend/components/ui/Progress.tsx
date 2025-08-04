import React from 'react';

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  className = '',
  size = 'md',
  variant = 'default'
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };
  
  const variantClasses = {
    default: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600'
  };

  return (
    <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]} ${className}`}>
      <div
        className={`${variantClasses[variant]} h-full rounded-full transition-all duration-300 ease-in-out`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}; 