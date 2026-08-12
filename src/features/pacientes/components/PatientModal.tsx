'use client';

import { X } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import type { Paciente, ProgramaEstudio } from '../types';
import { PatientForm } from './form/PatientForm';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Paciente | null;
  programas: ProgramaEstudio[];
  onSave: (data: Partial<Paciente>) => Promise<void>;
  onSuccess?: () => void;
}

const overlayVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

export function PatientModal({ isOpen, onClose, item, programas, onSave, onSuccess }: PatientModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
          className="absolute inset-0 bg-[var(--foreground)]/20 backdrop-blur-sm"
        />

        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="glass-modal relative max-h-[90vh] w-full max-w-[95vw] overflow-y-auto md:max-w-2xl lg:max-w-3xl"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--primary-glow)] blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[var(--accent-soft)] blur-3xl" />
          </div>

          <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/95 px-5 pb-4 pt-6 backdrop-blur-sm md:px-8 md:pt-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[var(--foreground)] md:text-2xl">
                  {item ? 'Actualizar Paciente' : 'Registrar Paciente'}
                </h2>
                <p className="badge-accent mt-1.5">Ficha clínica</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--muted)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] md:h-10 md:w-10"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <PatientForm item={item} programas={programas} onSave={onSave} onSuccess={onSuccess} />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
