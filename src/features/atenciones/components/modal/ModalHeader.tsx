import { X, Stethoscope } from "lucide-react";

interface ModalHeaderProps {
  pacienteNombre: string;
  onClose: () => void;
}

export function ModalHeader({ pacienteNombre, onClose }: ModalHeaderProps) {
  return (
    <div className="relative p-8 pb-4 shrink-0">
      <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
        <Stethoscope size={120} className="text-teal-500 transform -rotate-12" />
      </div>
      <div className="flex justify-between items-center relative z-10">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Nueva Atención
          </h2>
          <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mt-1">
            Paciente: {pacienteNombre}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-all text-slate-500"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
