import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  label?: string;
}

export const Input: React.FC<InputProps> = ({ className = '', ...props }) => {
  if (props.type === 'file') {
    return (
      <label className="block">
        {props.label && <span className="text-sm">{props.label}</span>}
        <input type="file" {...props} className="mt-1 w-full" />
      </label>
    );
  }
  return (
    <label className="block">
      {props.label && <span className="text-sm">{props.label}</span>}
      <input type={props.type} {...props} className={`border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} />
    </label>
  );
};