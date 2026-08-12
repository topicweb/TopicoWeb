interface GenderToggleProps {
  value: 'M' | 'F';
  onChange: (value: 'M' | 'F') => void;
}

const options = [
  { key: 'M' as const, label: 'Masculino', active: 'text-primary' },
  { key: 'F' as const, label: 'Femenino', active: 'text-accent' },
];

export function GenderToggle({ value, onChange }: GenderToggleProps) {
  return (
    <div className="flex rounded-xl border border-border bg-muted p-1 shadow-inner">
      {options.map(({ key, label, active }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-all ${
            value === key
              ? `scale-[1.02] bg-white shadow-sm ${active}`
              : 'text-[var(--slate-400)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
