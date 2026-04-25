import { ChevronLeft, ChevronRight, Save, Loader2 } from "lucide-react";

interface WizardNavigationProps {
  currentStep: number;
  totalSteps: number;
  canAdvance: boolean;
  loading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit?: (e: React.FormEvent) => void;
}

export function WizardNavigation({
  currentStep,
  totalSteps,
  canAdvance,
  loading,
  onPrevious,
  onNext,
  onSubmit,
}: WizardNavigationProps) {
  return (
    <div className="p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800 shrink-0">
      <div className="flex justify-between items-center max-w-3xl mx-auto">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentStep === 1}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all ${currentStep === 1
            ? "opacity-0 pointer-events-none"
            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
            }`}
        >
          <ChevronLeft size={18} />
          Anterior
        </button>

        {currentStep < totalSteps ? (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onNext();
            }}
            disabled={!canAdvance}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 text-white font-semibold shadow-lg shadow-teal-500/25 hover:bg-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-indigo-600 text-white font-bold shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            {loading ? "Guardando..." : "Guardar"}
          </button>
        )}
      </div>
    </div>
  );
}
