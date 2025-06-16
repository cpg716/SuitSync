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
    <div className={`bg-surface.DEFAULT dark:bg-surface.muted shadow-card rounded-2xl p-6 ${className}`}>
      {title && <h2 className="text-xl font-semibold text-black dark:text-white">{title}</h2>}
      {children}
    </div>
  );
}