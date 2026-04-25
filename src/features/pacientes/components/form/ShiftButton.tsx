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
      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${
        selected
          ? 'bg-white dark:bg-slate-800 shadow-md text-teal-600 dark:text-teal-400 scale-[1.02]'
          : 'text-slate-400'
      }`}
    >
      {value.toUpperCase()}
    </button>
  );
}
