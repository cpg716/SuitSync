import React from 'react';
import Link from 'next/link';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  title?: string;
  value?: string | number | null;
  link?: string;
  iconColor?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, value, link, iconColor, ...props }) => {
  const content = (
    <>
      {title && <span className="text-neutral-700 dark:text-gray-light text-sm mb-1 font-semibold">{title}</span>}
      {value !== undefined && value !== null ? (
        <span className="text-3xl font-bold text-primary dark:text-accent">{value}</span>
      ) : value === null ? (
         <span className="text-3xl font-bold text-primary dark:text-accent animate-pulse">...</span>
      ) : null}
      {children}
    </>
  );

  const cardClasses = `bg-white dark:bg-gray-dark rounded-2xl shadow-card p-3 flex flex-col min-h-[80px] border-2 border-gray-400 dark:border-gray-700 ${className}`;

  if (link) {
    return (
      <Link href={link} className={`${cardClasses} items-center justify-center hover:shadow-lg transition`} {...props}>
        {content}
      </Link>
    );
  }

  return (
    <div className={cardClasses} {...props}>
      {content}
    </div>
  );
};