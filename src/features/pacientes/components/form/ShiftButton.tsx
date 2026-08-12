interface ShiftButtonProps {
  value: string;
  selected: boolean;
  onClick: () => void;
}

export function ShiftButton({ value, selected, onClick }: ShiftButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-all ${
        selected
          ? 'scale-[1.02] bg-white text-accent shadow-sm'
          : 'text-[var(--slate-400)]'
      }`}
    >
      {value}
    </button>
  );
}
