import { ChevronRight } from "lucide-react";

interface WizardStep {
  id: number;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function WizardStepper({ steps, currentStep, onStepClick }: WizardStepperProps) {
  return (
    <div className="mb-6 flex shrink-0 items-center justify-center gap-2 px-2 md:gap-4">
      {steps.map((step, idx) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;

        return (
          <div key={step.id} className="flex items-center gap-2 md:gap-4">
            <button
              type="button"
              onClick={() => {
                if (step.id < currentStep) {
                  onStepClick(step.id);
                }
              }}
              disabled={step.id > currentStep}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-all ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : isCompleted
                    ? "bg-[var(--accent-soft)] text-accent"
                    : "bg-muted text-[var(--slate-400)]"
              } ${step.id < currentStep ? "cursor-pointer hover:bg-[var(--accent-muted)]" : "cursor-default"}`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  isActive ? "bg-white/20" : isCompleted ? "bg-[var(--accent-muted)]" : "bg-[var(--slate-200)]"
                }`}
              >
                {isCompleted ? "✓" : step.id}
              </div>
              <span className="hidden text-sm font-semibold md:block">{step.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <ChevronRight size={16} className="shrink-0 text-[var(--slate-200)]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
