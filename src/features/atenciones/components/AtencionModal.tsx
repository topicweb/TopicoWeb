"use client";

import { motion, AnimatePresence, Variants } from "framer-motion";
import { useAtencionModal } from "@/features/atenciones/hooks/useAtencionModal";
import { ModalHeader } from "@/features/atenciones/components/modal/ModalHeader";
import { ModalTabs } from "@/features/atenciones/components/modal/ModalTabs";
import { ConsultaTab } from "@/features/atenciones/components/modal/ConsultaTab";
import { MedicamentosTab } from "@/features/atenciones/components/modal/MedicamentosTab";
import { ModalFooter } from "@/features/atenciones/components/modal/ModalFooter";
import { AtencionFormData, DispensacionMedicamento } from "@/features/atenciones/types";

interface AtencionModalProps {
  isOpen: boolean;
  onClose: () => void;
  pacienteId: string;
  pacienteNombre: string;
  onSave: (atencion: AtencionFormData, dispensaciones: DispensacionMedicamento[]) => Promise<void>;
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
    transition: { type: "spring", damping: 25, stiffness: 300 },
  },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

export function AtencionModal({ isOpen, onClose, pacienteId, pacienteNombre, onSave }: AtencionModalProps) {
  const {
    form,
    dispensaciones,
    saving,
    error,
    activeTab,
    updateField,
    setDispensaciones,
    setActiveTab,
    handleSubmit,
  } = useAtencionModal(isOpen);

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
          className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 border border-white dark:border-slate-800 shadow-2xl flex flex-col"
        >
          {/* Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-32 bg-linear-to-b from-teal-500/5 to-transparent" />
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl" />
          </div>

          {/* Header */}
          <ModalHeader pacienteNombre={pacienteNombre} onClose={onClose} />

          {/* Tabs */}
          <div className="relative z-10 px-8">
            <ModalTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              dispensacionesCount={dispensaciones.length}
            />
          </div>

          {/* Content */}
          <form onSubmit={(e) => handleSubmit(e, pacienteId, onSave, onClose)} className="flex-1 overflow-y-auto p-8 pt-4 space-y-5 relative z-10">
            <AnimatePresence mode="wait">
              {activeTab === "datos" ? (
                <motion.div
                  key="datos"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <ConsultaTab form={form} updateField={updateField} />
                </motion.div>
              ) : (
                <motion.div
                  key="medicamentos"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <MedicamentosTab
                    dispensaciones={dispensaciones}
                    onDispensacionesChange={setDispensaciones}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <ModalFooter
              error={error}
              saving={saving}
              onCancel={onClose}
              onSubmit={(e) => handleSubmit(e, pacienteId, onSave, onClose)}
            />
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default AtencionModal;
