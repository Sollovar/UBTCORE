import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm text-(--text-secondary) mb-1.5">{label}</label>
      )}
      <input
        className={`
          w-full bg-(--surface-elevated) border border-(--border) rounded-lg px-4 py-2.5
          text-(--text-primary) placeholder-(--text-dim) focus:outline-none focus:border-[#6366f1]
          transition-colors duration-200
          ${error ? 'border-[#ef4444]' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-sm text-[#ef4444] mt-1">{error}</p>}
    </div>
  );
}
