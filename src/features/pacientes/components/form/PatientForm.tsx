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
  metadata: { turno?: string; ciclo?: string };
}

interface PatientFormProps {
  item: Paciente | null;
  programas: ProgramaEstudio[];
  onSave: (data: Partial<Paciente>) => Promise<void>;
  onSuccess?: () => void;
}

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
      setForm({ ...DEFAULT_FORM, programa_id: programas[0]?.id ?? null });
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
    setForm((prev) => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, metadata: form.metadata as Record<string, unknown> });
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar paciente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative z-10 space-y-5 px-5 pb-6 pt-4 md:space-y-6 md:px-8">
      <div className="rounded-2xl border border-primary/15 bg-[var(--primary-soft)] p-5 md:p-6">
        <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
          <Fingerprint size={14} />
          DNI
        </label>
        <input
          required
          maxLength={8}
          placeholder="00000000"
          className="w-full bg-transparent text-2xl font-bold tracking-widest text-foreground outline-none placeholder:text-[var(--slate-200)] focus:text-primary md:text-3xl"
          value={form.dni}
          onChange={(e) => updateField('dni', e.target.value.replace(/\D/g, ''))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Nombres">
          <input
            required
            placeholder="Ej. María"
            className="input-premium w-full px-4 py-3 text-sm font-medium"
            value={form.nombres}
            onChange={(e) => updateField('nombres', e.target.value)}
          />
        </FormField>
        <FormField label="Apellidos">
          <input
            required
            placeholder="Ej. García"
            className="input-premium w-full px-4 py-3 text-sm font-medium"
            value={form.apellidos}
            onChange={(e) => updateField('apellidos', e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Categoría" icon={<Users size={14} className="text-accent" />}>
          <select
            className="input-premium w-full cursor-pointer appearance-none px-4 py-3 text-sm font-medium"
            value={form.categoria}
            onChange={(e) => updateField('categoria', e.target.value as CategoriaPaciente)}
          >
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Sexo">
          <GenderToggle value={form.sexo} onChange={(v) => updateField('sexo', v)} />
        </FormField>
      </div>

      {showProgram && (
        <FormField label="Programa" icon={<BookOpen size={14} className="text-accent" />}>
          <select
            className="input-premium w-full px-4 py-3 text-sm font-medium"
            value={form.programa_id ?? ''}
            onChange={(e) => updateField('programa_id', e.target.value || null)}
          >
            {programas.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </FormField>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {showCiclo && (
          <FormField label="Ciclo">
            <div className="flex flex-wrap gap-2">
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
          icon={<Clock size={14} className="text-accent" />}
          className={!showCiclo ? 'sm:col-span-2' : ''}
        >
          <div className="flex rounded-xl border border-border bg-muted p-1 shadow-inner">
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

      <div className="sticky bottom-0 -mx-5 flex justify-end border-t border-border bg-white/95 px-5 py-4 backdrop-blur-sm md:-mx-8 md:px-8">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <Save size={16} />
          )}
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
