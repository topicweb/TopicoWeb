'use client';

import { useState, useEffect } from 'react';
import { usePacientes } from '@/features/pacientes/hooks/usePacientes';
import { usePatientSearch } from '@/features/pacientes/hooks/usePatientSearch';
import { useAuth } from '@/core/providers/AuthProvider';
import { PatientModal } from '@/features/pacientes/components/PatientModal';
import { PatientsHeader } from '@/features/pacientes/components/PatientsHeader';
import { PatientSearch } from '@/features/pacientes/components/PatientSearch';
import { PatientsGrid } from '@/features/pacientes/components/PatientsGrid';
import { PacienteSchema } from '@/shared/schemas/validation';
import { toast } from 'sonner';
import { Paciente } from '@/features/pacientes/types';

export default function PatientsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Paciente | null>(null);
  const { searchTerm, debouncedTerm, isSearching, setSearchTerm } = usePatientSearch();
  const { pacientes, crearPaciente, actualizarPaciente, eliminarPaciente, asegurarPrograma, programas } = usePacientes();
  const { role } = useAuth();

  const canDelete = role === 'admin';

  // Filtrado local optimizado
  const filteredPacientes = pacientes.filter((p: Paciente) => {
    if (!debouncedTerm) return true;
    const term = debouncedTerm.toLowerCase();
    return (
      p.nombres.toLowerCase().includes(term) ||
      p.apellidos.toLowerCase().includes(term) ||
      p.dni.includes(term)
    );
  });

  const handleEdit = (item: Paciente) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (patient: Paciente) => {
    try {
      await eliminarPaciente(patient.id);
      toast.success('Paciente eliminado correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar paciente');
    }
  };

  const handleSave = async (data: Partial<Paciente>) => {
    const dataToValidate = editingItem ? { ...editingItem, ...data } : data;
    const result = PacienteSchema.safeParse(dataToValidate);

    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    const isAcademic = data.categoria === 'estudiante' || data.categoria === 'docente';
    let progId = data.programa_id;
    if (isAcademic && !progId) {
      progId = programas[0]?.id || '';
    }

    if (editingItem) {
      await actualizarPaciente(editingItem.id, {
        ...data,
        programa_id: progId,
      });
    } else {
      await crearPaciente({
        ...(data as any),
        programa_id: progId,
      });
    }
  };

  const handleSuccess = () => {
    toast.success(editingItem ? 'Paciente actualizado correctamente' : 'Paciente registrado correctamente');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PatientsHeader onAddNew={handleAddNew} />
      <PatientSearch searchTerm={searchTerm} onChange={setSearchTerm} />
      <PatientsGrid
        pacientes={filteredPacientes}
        isSearching={isSearching}
        searchTerm={searchTerm}
        onEdit={handleEdit}
        onDelete={handleDelete}
        canDelete={canDelete}
      />
      {isModalOpen && (
        <PatientModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          item={editingItem}
          programas={programas}
          onSave={handleSave}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
