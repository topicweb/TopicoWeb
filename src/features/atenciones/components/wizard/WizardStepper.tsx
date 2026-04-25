import { ChevronRight } from "lucide-react";

interface WizardStep {
  id: number;
  label: string;
  icon: any;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function WizardStepper({ steps, currentStep, onStepClick }: WizardStepperProps) {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 mb-6 shrink-0 px-2">
      {steps.map((step, idx) => {
        const Icon = step.icon;
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
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${isActive
                ? "bg-teal-600 text-white shadow-lg shadow-teal-500/25"
                : isCompleted
                  ? "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                } ${step.id < currentStep ? "cursor-pointer hover:bg-teal-200" : "cursor-default"}`}
            >
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? "bg-white/20" : isCompleted ? "bg-teal-200 dark:bg-teal-800" : "bg-slate-200 dark:bg-slate-700"
                }`}>
                {isCompleted ? "✓" : step.id}
              </div>
              <span className="hidden md:block text-sm font-semibold">{step.label}</span>
            </button>
            {idx < steps.length - 1 && (
              <ChevronRight size={16} className="text-slate-300 dark:text-slate-700 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
