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
      className={`h-10 w-10 text-xs font-bold rounded-xl transition-all border ${
        selected
          ? 'bg-teal-600 border-teal-600 text-white shadow-lg shadow-teal-500/30 scale-110'
          : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-teal-500/30'
      }`}
    >
      {value}
    </button>
  );
}
