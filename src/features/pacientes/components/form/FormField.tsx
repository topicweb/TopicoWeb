import React from 'react';

interface FormFieldProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, icon, children, className = '' }: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
