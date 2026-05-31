import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-black text-gray-700 uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 bg-gray-50 border-2 rounded-xl font-bold text-gray-750 outline-none transition-all text-sm
          ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-[#58cc02]'}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs font-bold text-red-500 mt-0.5">{error}</p>}
      {helperText && !error && <p className="text-xs font-bold text-gray-400 mt-0.5">{helperText}</p>}
    </div>
  );
}
