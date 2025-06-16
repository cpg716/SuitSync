import React, { ButtonHTMLAttributes } from 'react';

export default function Button({ children, variant = 'primary', ...props }) {
  const base = "inline-flex items-center justify-center font-medium rounded-md px-4 py-2 transition";
  const styles = {
    primary: "bg-accent text-white hover:bg-accent.hover",
    outline: "border border-primary text-primary hover:bg-primary/10",
  };
  return (
    <button className={`${base} ${styles[variant]}`} {...props}>
      {children}
    </button>
  );
}