interface GenderToggleProps {
  value: 'M' | 'F';
  onChange: (value: 'M' | 'F') => void;
}

export function GenderToggle({ value, onChange }: GenderToggleProps) {
  return (
    <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
      {[
        { key: 'M', label: 'MASCULINO', activeColor: 'text-teal-600 dark:text-teal-400' },
        { key: 'F', label: 'FEMENINO', activeColor: 'text-pink-600 dark:text-pink-400' },
      ].map(({ key, label, activeColor }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key as 'M' | 'F')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
            value === key
              ? `bg-white dark:bg-slate-800 shadow-md ${activeColor} scale-[1.02]`
              : 'text-slate-400'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
