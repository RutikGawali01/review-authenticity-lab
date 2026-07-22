import React from 'react';

/**
 * Reusable action button component with Tailwind CSS styling variants.
 */
export default function Button({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  className = '',
  fullWidth = true,
  type = 'button',
}) {
  const baseStyles = 'py-2.5 px-4 font-medium text-sm rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 cursor-pointer flex items-center justify-center space-x-2';

  const variants = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-indigo-500/20 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900 border border-indigo-500/40',
    secondary: 'bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-200 border border-slate-700/80 focus:ring-slate-500',
    outline: 'bg-transparent hover:bg-slate-800/60 text-slate-300 border border-slate-700 focus:ring-indigo-500',
  };

  const disabledStyles = 'opacity-50 cursor-not-allowed pointer-events-none shadow-none';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? disabledStyles : ''}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
