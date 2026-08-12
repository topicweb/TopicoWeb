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
}: WizardNavigationProps) {
  return (
    <div className="shrink-0 border-t border-border bg-white/95 p-4 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl items-center justify-between">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentStep === 1}
          className={`flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition-all ${
            currentStep === 1
              ? "pointer-events-none opacity-0"
              : "bg-muted text-foreground hover:bg-[var(--slate-100)]"
          }`}
        >
          <ChevronLeft size={18} />
          Anterior
        </button>

        {currentStep < totalSteps ? (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onNext(); }}
            disabled={!canAdvance}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-sm transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-accent px-8 py-3 font-semibold text-white shadow-sm transition-all hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {loading ? "Guardando..." : "Guardar"}
          </button>
        )}
      </div>
    </div>
  );
}
