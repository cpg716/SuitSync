import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => (
  <div className={`rounded-lg shadow bg-white dark:bg-gray-800 p-4 ${className}`} {...props}>
    {children}
  </div>
);

export default Card;