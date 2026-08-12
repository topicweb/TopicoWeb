interface CycleButtonProps {
  value: string;
  selected: boolean;
  onClick: () => void;
}

export function CycleButton({ value, selected, onClick }: CycleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 w-10 rounded-lg border text-xs font-bold transition-all ${
        selected
          ? 'scale-105 border-[var(--primary)] bg-[var(--primary)] text-white shadow-sm'
          : 'border-[var(--border)] bg-white text-[var(--slate-400)] hover:border-[var(--primary)]/40'
      }`}
    >
      {value}
    </button>
  );
}
