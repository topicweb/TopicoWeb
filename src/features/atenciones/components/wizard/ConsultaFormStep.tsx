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
    <div className="p-4 md:p-6 pb-32 h-full flex flex-col max-w-6xl mx-auto">
      {/* Header compacto con info del paciente */}
      <div className="flex items-center gap-3 mb-3 pb-2 border-b border-slate-200 dark:border-slate-700 shrink-0">
        <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center shrink-0">
          <User size={20} className="text-teal-600" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-slate-900 dark:text-white truncate">
            {selectedPatient?.nombres} {selectedPatient?.apellidos}
          </p>
          <p className="text-xs text-slate-500">{selectedPatient?.categoria} • DNI: {selectedPatient?.dni}</p>
        </div>
      </div>

      {/* Layout PC: Motivo arriba, Signos vitales en fila, Observación abajo */}
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-2">
          {/* Motivo - ancho completo, altura moderada */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm shrink-0">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              <FileText size={14} className="text-teal-500" />
              Motivo <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              className="w-full rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 text-sm text-slate-800 dark:text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none transition-all resize-none"
              value={formData.motivo}
              onChange={(e) => onFormDataChange({ ...formData, motivo: e.target.value })}
              placeholder="Describa el motivo de consulta..."
              autoFocus
            />
          </div>
          {/* Observación - toma el espacio restante */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm flex-1 flex flex-col min-h-0">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 shrink-0">
              Tratamiento / Observación
            </label>
            <textarea
              className="w-full flex-1 min-h-100px rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 text-sm text-slate-800 dark:text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 outline-none transition-all resize-none"
              value={formData.observacion}
              onChange={(e) => onFormDataChange({ ...formData, observacion: e.target.value })}
              placeholder="Describa el tratamiento o observaciones adicionales..."
            />
          </div>
        </div>

        {/* Signos Vitales - fila horizontal compacta */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-sm shrink-0">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
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
