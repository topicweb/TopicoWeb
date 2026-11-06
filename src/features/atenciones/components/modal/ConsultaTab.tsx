import { ClipboardList, Stethoscope, Activity, FileText } from "lucide-react";
import { SignosVitalesInput } from "@/features/atenciones/components/SignosVitalesInput";
import { SignosVitales } from "@/features/atenciones/types";

interface ConsultaTabProps {
  form: {
    motivo_consulta: string;
    diagnostico: string;
    observacion: string;
    signos_vitales: SignosVitales;
    fecha_atencion: string;
  };
  updateField: <K extends keyof ConsultaTabProps["form"]>(field: K, value: ConsultaTabProps["form"][K]) => void;
}

export function ConsultaTab({ form, updateField }: ConsultaTabProps) {
  return (
    <div className="space-y-5">
      <FormField label="Fecha de Atención" icon={<ClipboardList size={14} className="text-accent" />}>
        <input
          type="date"
          required
          className="input-premium w-full px-4 py-3 text-sm font-medium"
          value={form.fecha_atencion}
          onChange={(e) => updateField("fecha_atencion", e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField label="Motivo de Consulta" icon={<FileText size={14} className="text-accent" />}>
          <textarea
            required
            rows={3}
            placeholder="Describa el motivo de la consulta..."
            className="input-premium min-h-[96px] w-full resize-none px-4 py-3 text-sm font-medium"
            value={form.motivo_consulta}
            onChange={(e) => updateField("motivo_consulta", e.target.value)}
          />
        </FormField>

        <FormField label="Diagnóstico" icon={<Stethoscope size={14} className="text-accent" />}>
          <textarea
            rows={3}
            placeholder="Resultado o diagnóstico de la consulta..."
            className="input-premium min-h-[96px] w-full resize-none px-4 py-3 text-sm font-medium"
            value={form.diagnostico}
            onChange={(e) => updateField("diagnostico", e.target.value)}
          />
        </FormField>

        <FormField label="Tratamiento / Observación">
          <textarea
            rows={3}
            placeholder="Notas adicionales, tratamiento, recomendaciones..."
            className="input-premium min-h-[96px] w-full resize-none px-4 py-3 text-sm font-medium"
            value={form.observacion}
            onChange={(e) => updateField("observacion", e.target.value)}
          />
        </FormField>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Activity size={14} className="text-accent" />
          Signos Vitales
        </label>
        <div className="rounded-xl border border-border bg-muted p-4">
          <SignosVitalesInput
            value={form.signos_vitales}
            onChange={(sv) => updateField("signos_vitales", sv)}
          />
        </div>
      </div>
    </div>
  );
}

function FormField({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
