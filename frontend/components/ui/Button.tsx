import React, { ButtonHTMLAttributes } from 'react';

export default function Button(
  props: ButtonHTMLAttributes<HTMLButtonElement>
) {
  return (
    <button
      {...props}
      className={`
        inline-flex items-center justify-center px-6 py-2 rounded-md
        font-semibold shadow-sm transition duration-150 ease-in-out
        bg-primary text-white hover:bg-primary-dark disabled:opacity-50
        ${props.className || ''}
      `}
    />
  );
}