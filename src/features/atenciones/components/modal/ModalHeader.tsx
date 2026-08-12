import { X, Stethoscope } from "lucide-react";

interface ModalHeaderProps {
  pacienteNombre: string;
  onClose: () => void;
}

export function ModalHeader({ pacienteNombre, onClose }: ModalHeaderProps) {
  return (
    <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-white/95 px-6 pb-4 pt-6 backdrop-blur-sm md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">Nueva Atención</h2>
          <p className="badge-accent mt-1.5">
            <Stethoscope size={12} className="mr-1 inline" />
            Paciente: {pacienteNombre}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors hover:bg-[var(--primary-soft)] hover:text-primary"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
