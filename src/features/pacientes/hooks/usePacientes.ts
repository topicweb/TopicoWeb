import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/core/db';
import { useAuth } from '@/core/providers/AuthProvider';
import { useNetwork } from '@/core/providers/NetworkProvider';
import { syncService } from '@/core/db/sync';
import type { Paciente, PacienteFormData, ProgramaEstudio } from '../types';

// ───────────────────────────────────────────────────────────────────────────────
// GESTIÓN DE PACIENTES
// CRUD de pacientes y programas de estudio con sincronización offline-first
// ───────────────────────────────────────────────────────────────────────────────

interface UsePacientesReturn {
  pacientes: Paciente[];
  programas: ProgramaEstudio[];
  loading: boolean;
  crearPaciente: (datos: PacienteFormData) => Promise<string>;
  actualizarPaciente: (id: string, cambios: Partial<Paciente>) => Promise<void>;
  eliminarPaciente: (id: string) => Promise<void>;
  buscarPorDni: (dni: string) => Paciente | undefined;
  asegurarPrograma: (nombre: string, id?: string) => Promise<string>;
}

export function usePacientes(): UsePacientesReturn {
  const { businessId } = useAuth();
  const { isOnline } = useNetwork();

  const pacientes = useLiveQuery<Paciente[]>(
    async () => {
      if (!businessId) return [];
      return db.pacientes
        .where('business_id')
        .equals(businessId)
        .filter((p) => (p.activo as any))
        .toArray();
    },
    [businessId]
  ) ?? [];

  const programas = useLiveQuery<ProgramaEstudio[]>(
    async () => {
      if (!businessId) return [];
      return db.programas_estudio
        .where('business_id')
        .equals(businessId)
        .filter((p) => (p.activo as any))
        .toArray();
    },
    [businessId]
  ) ?? [];

  const loading = pacientes === undefined;

  const assertBusinessId = (): string => {
    if (!businessId) throw new Error('Usuario no autenticado');
    return businessId;
  };

  const crearPaciente = async (datos: PacienteFormData): Promise<string> => {
    const bid = assertBusinessId();

    if (pacientes.some((p) => p.dni === datos.dni)) {
      throw new Error(`Ya existe un paciente con el DNI ${datos.dni}`);
    }

    const now = new Date().toISOString();
    const paciente: Paciente = {
      ...datos,
      id: crypto.randomUUID(),
      business_id: bid,
      creado_at: now,
      actualizado_at: now,
      activo: 1,
      sync_status: 'pending',
    };

    await db.pacientes.add(paciente);
    if (isOnline) {
      syncService.pushToSupabase().catch(console.error);
    }
    return paciente.id;
  };

  const actualizarPaciente = async (id: string, cambios: Partial<Paciente>): Promise<void> => {
    const paciente = await db.pacientes.get(id);
    if (!paciente || paciente.business_id !== businessId) {
      throw new Error('Paciente no encontrado o sin permisos');
    }

    await db.pacientes.update(id, {
      ...cambios,
      actualizado_at: new Date().toISOString(),
      sync_status: 'pending',
    });
    if (isOnline) {
      syncService.pushToSupabase().catch(console.error);
    }
  };

  const eliminarPaciente = async (id: string): Promise<void> => {
    const paciente = await db.pacientes.get(id);
    if (!paciente || paciente.business_id !== businessId) {
      throw new Error('Paciente no encontrado o sin permisos');
    }

    await db.pacientes.update(id, {
      activo: 0,
      actualizado_at: new Date().toISOString(),
      sync_status: 'pending',
    });
    if (isOnline) {
      syncService.pushToSupabase().catch(console.error);
    }
  };

  const buscarPorDni = (dni: string): Paciente | undefined =>
    pacientes.find((p) => p.dni === dni.trim());

  const asegurarPrograma = async (nombre: string, id?: string): Promise<string> => {
    // Si se proporciona un ID, verificar que exista
    if (id) {
      const programa = await db.programas_estudio.get(id);
      if (programa) return id;
      throw new Error(`Programa de estudio con ID ${id} no encontrado`);
    }

    // Buscar programa por nombre en la base de datos local (debe venir de Supabase)
    const programa = await db.programas_estudio
      .where('nombre')
      .equals(nombre)
      .first();

    if (!programa) {
      throw new Error(`Programa de estudio "${nombre}" no encontrado. Debe seleccionar un programa existente.`);
    }

    return programa.id;
  };

  return {
    pacientes,
    programas,
    loading,
    crearPaciente,
    actualizarPaciente,
    eliminarPaciente,
    buscarPorDni,
    asegurarPrograma,
  };
}
