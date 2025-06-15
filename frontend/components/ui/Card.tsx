import React, { ReactNode } from 'react';

export default function Card({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 space-y-4 ${className}`}>
      {title && <h2 className="text-xl font-semibold">{title}</h2>}
      {children}
    </div>
  );
}