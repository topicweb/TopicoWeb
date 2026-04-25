import { useState, useEffect, useMemo, useCallback } from 'react';
import { Save, Fingerprint, BookOpen, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { Paciente, CategoriaPaciente, ProgramaEstudio } from '../../types';
import { FormField } from './FormField';
import { GenderToggle } from './GenderToggle';
import { CycleButton } from './CycleButton';
import { ShiftButton } from './ShiftButton';
import { CATEGORIAS, CICLOS, TURNOS, DEFAULT_FORM } from '../../config/constants';

interface FormState {
  dni: string;
  nombres: string;
  apellidos: string;
  categoria: CategoriaPaciente;
  programa_id: string | null;
  sexo: 'M' | 'F';
  metadata: {
    turno?: string;
    ciclo?: string;
  };
}

interface PatientFormProps {
  item: Paciente | null;
  programas: ProgramaEstudio[];
  onSave: (data: Partial<Paciente>) => Promise<void>;
  onSuccess?: () => void;
}

const inputBaseClass =
  'w-full rounded-2xl bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 text-base font-medium text-slate-800 dark:text-white shadow-sm focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/5 transition-all outline-none';

export function PatientForm({ item, programas, onSave, onSuccess }: PatientFormProps) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      const metadata = item.metadata as FormState['metadata'];
      setForm({
        dni: item.dni,
        nombres: item.nombres,
        apellidos: item.apellidos,
        categoria: item.categoria,
        programa_id: item.programa_id ?? null,
        sexo: item.sexo,
        metadata: { turno: metadata?.turno ?? 'Mañana', ciclo: metadata?.ciclo },
      });
    } else {
      setForm({
        ...DEFAULT_FORM,
        programa_id: programas[0]?.id ?? null,
      });
    }
  }, [item, programas]);

  const showProgram = useMemo(
    () => form.categoria === 'estudiante' || form.categoria === 'docente',
    [form.categoria]
  );

  const showCiclo = useMemo(() => form.categoria === 'estudiante', [form.categoria]);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'categoria') {
        const cat = value as CategoriaPaciente;
        if (cat !== 'estudiante' && cat !== 'docente') {
          next.programa_id = null;
        } else if (!prev.programa_id && programas.length > 0) {
          next.programa_id = programas[0].id;
        }
        next.metadata = {
          turno: prev.metadata.turno ?? 'Mañana',
          ...(cat === 'estudiante' && { ciclo: prev.metadata.ciclo ?? 'I' }),
        };
      }

      return next;
    });
  }, [programas]);

  const updateMetadata = useCallback((key: keyof FormState['metadata'], value: string) => {
    setForm((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        metadata: form.metadata as Record<string, unknown>,
      });
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar paciente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="px-4 md:px-8 pt-4 pb-4 md:pb-6 space-y-4 md:space-y-6 relative z-10">
      {/* DNI */}
      <div className="bg-linear-to-b from-teal-50/50 to-white dark:from-teal-900/10 dark:to-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-teal-100 dark:border-teal-900/30 shadow-sm">
        <label className="flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-2 md:mb-3">
          <Fingerprint size={14} />
          DNI
        </label>
        <input
          required
          maxLength={8}
          placeholder="00000000"
          className="w-full bg-transparent text-2xl md:text-3xl font-bold text-slate-900 dark:text-white placeholder-slate-200 dark:placeholder-slate-800 outline-none tracking-[0.15em] focus:text-teal-600 transition-colors"
          value={form.dni}
          onChange={(e) => updateField('dni', e.target.value.replace(/\D/g, ''))}
        />
      </div>

      {/* Nombres / Apellidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <FormField label="Nombres">
          <input
            required
            placeholder="Ej. María"
            className={`${inputBaseClass} py-3 md:p-4 text-sm md:text-base`}
            value={form.nombres}
            onChange={(e) => updateField('nombres', e.target.value)}
          />
        </FormField>
        <FormField label="Apellidos">
          <input
            required
            placeholder="Ej. García"
            className={`${inputBaseClass} py-3 md:p-4 text-sm md:text-base`}
            value={form.apellidos}
            onChange={(e) => updateField('apellidos', e.target.value)}
          />
        </FormField>
      </div>

      {/* Categoría / Sexo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <FormField label="Categoría" icon={<Users size={14} className="text-teal-500" />}>
          <select
            className={`${inputBaseClass} appearance-none cursor-pointer py-3 md:p-4 text-sm md:text-base`}
            value={form.categoria}
            onChange={(e) => updateField('categoria', e.target.value as CategoriaPaciente)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Sexo">
          <GenderToggle value={form.sexo} onChange={(v) => updateField('sexo', v)} />
        </FormField>
      </div>

      {/* Programa */}
      {showProgram && (
        <FormField label="Programa" icon={<BookOpen size={14} className="text-teal-500" />}>
          <select
            className={`${inputBaseClass} py-3 md:p-4 text-sm md:text-base`}
            value={form.programa_id ?? ''}
            onChange={(e) => updateField('programa_id', e.target.value || null)}
          >
            {programas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </FormField>
      )}

      {/* Ciclo / Turno */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {showCiclo && (
          <FormField label="Ciclo">
            <div className="flex flex-wrap gap-1.5 md:gap-2">
              {CICLOS.map((c) => (
                <CycleButton
                  key={c}
                  value={c}
                  selected={form.metadata.ciclo === c}
                  onClick={() => updateMetadata('ciclo', c)}
                />
              ))}
            </div>
          </FormField>
        )}
        <FormField
          label="Turno"
          icon={<Clock size={14} className="text-teal-500" />}
          className={!showCiclo ? 'sm:col-span-2' : ''}
        >
          <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl md:rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
            {TURNOS.map((t) => (
              <ShiftButton
                key={t}
                value={t}
                selected={form.metadata.turno === t}
                onClick={() => updateMetadata('turno', t)}
              />
            ))}
          </div>
        </FormField>
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-100 dark:border-slate-800 p-3 md:p-0 md:pt-4 -mx-4 md:mx-0 px-4 md:px-0 mt-4 md:mt-6 flex justify-end gap-2 md:gap-3 z-20">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-1.5 md:gap-2 rounded-xl md:rounded-2xl bg-linear-to-r from-teal-600 to-teal-500 px-5 md:px-10 py-2.5 md:py-4 text-xs md:text-sm font-bold text-white hover:shadow-lg hover:shadow-teal-500/30 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? (
            <div className="h-3.5 w-3.5 md:h-4 md:w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
          ) : (
            <Save size={16} className="md:w-18px md:h-18px" />
          )}
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
