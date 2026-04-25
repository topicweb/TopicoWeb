'use client';

import { X } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import type { Paciente, ProgramaEstudio } from '../types';
import { PatientForm } from './form/PatientForm';

// ───────────────────────────────────────────────────────────────────────────────
// MODAL DE PACIENTE
// Formulario modal para crear y editar pacientes
// ───────────────────────────────────────────────────────────────────────────────

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Paciente | null;
  programas: ProgramaEstudio[];
  onSave: (data: Partial<Paciente>) => Promise<void>;
  onSuccess?: () => void;
}

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 25, stiffness: 300 },
  },
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
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="relative w-full max-w-[95vw] md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl md:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
        >
          {/* Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-40 bg-linear-to-b from-teal-500/5 to-transparent" />
            <div className="absolute -right-24 -top-24 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
            <div className="absolute -left-24 -bottom-24 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
          </div>

          {/* Header */}
          <div className="px-4 md:px-8 pt-4 md:pt-8 pb-3 md:pb-4 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-20 border-b border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {item ? 'Actualizar Paciente' : 'Registrar Paciente'}
                </h2>
                <p className="text-[10px] md:text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mt-0.5">
                  Ficha Médica
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-9 md:h-10 md:w-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-all text-slate-500"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Form */}
          <PatientForm item={item} programas={programas} onSave={onSave} onSuccess={onSuccess} />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
