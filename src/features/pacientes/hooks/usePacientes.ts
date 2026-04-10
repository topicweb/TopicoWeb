import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '@/core/providers/AuthProvider';
import { db } from '@/core/db';
import type { Paciente, PacienteFormData, ProgramaEstudio } from '../types';

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

  const pacientes = useLiveQuery<Paciente[]>(
    async () => {
      if (!businessId) return [];
      return db.pacientes
        .where('business_id')
        .equals(businessId)
        .filter((p) => p.activo === 1)
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
        .filter((p) => p.activo === 1)
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
  };

  const buscarPorDni = (dni: string): Paciente | undefined =>
    pacientes.find((p) => p.dni === dni.trim());

  const asegurarPrograma = async (nombre: string, id?: string): Promise<string> => {
    const programaId = id ?? crypto.randomUUID();
    const existe = await db.programas_estudio.get(programaId);

    if (!existe) {
      const now = new Date().toISOString();
      await db.programas_estudio.put({
        id: programaId,
        nombre,
        activo: 1,
        creado_at: now,
        actualizado_at: now,
        sync_status: 'pending',
      });
    }

    return programaId;
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
