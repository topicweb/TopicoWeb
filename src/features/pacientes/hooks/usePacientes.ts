/**
 * @module features/pacientes/hooks/usePacientes
 *
 * Hook central del módulo Pacientes.
 * Proporciona todo el CRUD + lógica de negocio para pacientes y programas de estudio.
 *
 * Patrón canónico (plantilla para todos los demás módulos):
 *   useDexieCrud → multi-tenancy + sync_status + soft-delete automáticos.
 */
import { useDexieCrud } from '@/shared/hooks/use-dexie-crud';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/core/providers/AuthProvider';
import { Paciente, PacienteFormData, ProgramaEstudio } from '../types';
import { db } from '@/core/db';

export function usePacientes() {
  const { businessId } = useAuth();
  // ── 1. CRUD genérico → multi-tenancy y sync_status automáticos ──────────
  const {
    data: pacientes,
    create: baseCreate,
    update: actualizarPaciente,
    remove: eliminarPaciente,
    isLoading,
  } = useDexieCrud<Paciente>(db.pacientes);

  // ── 2. Datos relacionados (solo lectura reactiva) ────────────────────────
  // programas_estudio no pasa por useDexieCrud porque no tiene CRUD completo
  const programas = useLiveQuery<ProgramaEstudio[] | undefined>(
    () => {
      if (!businessId) return [];
      return db.programas_estudio
        .where('business_id').equals(businessId)
        .filter((p: ProgramaEstudio) => p.activo === 1)
        .toArray();
    },
    [businessId]
  ) ?? [];

  // ── 3. Lógica de negocio específica ────────────────────────────────────

  /**
   * Crea un nuevo paciente garantizando unicidad de DNI dentro del tenant.
   * El business_id se inyecta automáticamente por `useDexieCrud`.
   */
  const crearPaciente = async (datos: PacienteFormData) => {
    const dniExiste = pacientes.some((p) => p.dni === datos.dni);
    if (dniExiste) {
      throw new Error(`Ya existe un paciente con el DNI ${datos.dni}`);
    }
    return baseCreate(datos);
  };

  /**
   * Busca un paciente por DNI — útil para la búsqueda rápida previa al registro.
   * Busca solo dentro del tenant actual (filtrado por business_id en memoria).
   */
  const buscarPorDni = (dni: string): Paciente | undefined => {
    return pacientes.find((p) => p.dni === dni.trim());
  };

  /**
   * Garantiza que un programa existe en Dexie antes de asignarlo a un paciente.
   * Si ya existe (por id) lo devuelve; si no existe lo crea como 'pending'.
   */
  const asegurarPrograma = async (
    nombrePrograma: string,
    id?: string
  ): Promise<string> => {
    const finalId = id ?? crypto.randomUUID();

    const existe = await db.programas_estudio.get(finalId);
    if (!existe) {
      const programa: ProgramaEstudio = {
        id: finalId,
        nombre: nombrePrograma,
        activo: 1,
        creado_at: new Date().toISOString(),
        actualizado_at: new Date().toISOString(),
        sync_status: 'pending',
      };
      await db.programas_estudio.put(programa);
    }

    return finalId;
  };

  return {
    // Data
    pacientes,
    programas,
    isLoading,

    // Operaciones
    crearPaciente,
    actualizarPaciente,
    eliminarPaciente,
    buscarPorDni,
    asegurarPrograma,
  };
}
