import { Paciente } from "@/features/pacientes/types";
import { SignosVitales } from "@/features/atenciones/types";
import { User, FileText } from "lucide-react";
import { SignosVitalesInput } from "@/features/atenciones/components/SignosVitalesInput";

interface ConsultaFormStepProps {
  selectedPatient: Paciente | null;
  formData: {
    motivo: string;
    observacion: string;
    signos_vitales: SignosVitales;
  };
  onFormDataChange: (data: ConsultaFormStepProps["formData"]) => void;
}

export function ConsultaFormStep({
  selectedPatient,
  formData,
  onFormDataChange,
}: ConsultaFormStepProps) {
  return (
    <div className="mx-auto flex h-full max-w-6xl flex-col p-4 pb-32 md:p-6">
      <div className="mb-3 flex shrink-0 items-center gap-3 border-b border-border pb-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
          <User size={20} className="text-primary" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-foreground">
            {selectedPatient?.nombres} {selectedPatient?.apellidos}
          </p>
          <p className="text-xs text-muted">{selectedPatient?.categoria} • DNI: {selectedPatient?.dni}</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid shrink-0 gap-2 md:grid-cols-2">
          <div className="glass-card p-3">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText size={14} className="text-accent" />
              Motivo <span className="text-danger">*</span>
            </label>
            <textarea
              required
              rows={2}
              className="input-premium w-full resize-none p-3 text-sm"
              value={formData.motivo}
              onChange={(e) => onFormDataChange({ ...formData, motivo: e.target.value })}
              placeholder="Describa el motivo de consulta..."
              autoFocus
            />
          </div>
          <div className="glass-card flex min-h-0 flex-1 flex-col p-3">
            <label className="mb-2 shrink-0 text-sm font-semibold text-foreground">
              Tratamiento / Observación
            </label>
            <textarea
              className="input-premium min-h-[100px] w-full flex-1 resize-none p-3 text-sm"
              value={formData.observacion}
              onChange={(e) => onFormDataChange({ ...formData, observacion: e.target.value })}
              placeholder="Describa el tratamiento o observaciones adicionales..."
            />
          </div>
        </div>

        <div className="glass-card shrink-0 p-3">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Signos Vitales
          </label>
          <SignosVitalesInput
            value={formData.signos_vitales}
            onChange={(signos) => onFormDataChange({ ...formData, signos_vitales: signos })}
          />
        </div>
      </div>
    </div>
  );
}
