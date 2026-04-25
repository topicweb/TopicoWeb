import { ClipboardList, Stethoscope } from "lucide-react";
import { SignosVitalesInput } from "@/features/atenciones/components/SignosVitalesInput";
import { SignosVitales } from "@/features/atenciones/types";

interface ConsultaTabProps {
  form: {
    motivo_consulta: string;
    observacion: string;
    signos_vitales: SignosVitales;
    fecha_atencion: string;
  };
  updateField: <K extends keyof ConsultaTabProps["form"]>(field: K, value: ConsultaTabProps["form"][K]) => void;
}

const inputBaseClass =
  "w-full rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 text-base font-medium text-slate-800 dark:text-white shadow-sm focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all outline-none";

const textareaBaseClass = `${inputBaseClass} min-h-[100px] resize-none`;

export function ConsultaTab({ form, updateField }: ConsultaTabProps) {
  return (
    <div className="space-y-5">
      {/* Fecha */}
      <FormField label="Fecha de Atención" icon={<ClipboardList size={14} className="text-teal-500" />}>
        <input
          type="date"
          required
          className={inputBaseClass}
          value={form.fecha_atencion}
          onChange={(e) => updateField("fecha_atencion", e.target.value)}
        />
      </FormField>

      {/* Motivo */}
      <FormField
        label="Motivo de Consulta"
        icon={<Stethoscope size={14} className="text-teal-500" />}
      >
        <textarea
          required
          rows={3}
          placeholder="Describa el motivo de la consulta..."
          className={textareaBaseClass}
          value={form.motivo_consulta}
          onChange={(e) => updateField("motivo_consulta", e.target.value)}
        />
      </FormField>

      {/* Signos Vitales */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <ActivityIcon />
          Signos Vitales
        </label>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
          <SignosVitalesInput
            value={form.signos_vitales}
            onChange={(sv) => updateField("signos_vitales", sv)}
          />
        </div>
      </div>

      {/* Observaciones */}
      <FormField label="Observaciones (Opcional)">
        <textarea
          rows={3}
          placeholder="Notas adicionales, diagnóstico, recomendaciones..."
          className={textareaBaseClass}
          value={form.observacion}
          onChange={(e) => updateField("observacion", e.target.value)}
        />
      </FormField>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function FormField({ label, icon, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function ActivityIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-teal-500"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
