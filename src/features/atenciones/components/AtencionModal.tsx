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

const overlayVariants: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 300 } },
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
          className="absolute inset-0 bg-[var(--foreground)]/20 backdrop-blur-sm"
        />

        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="glass-modal relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[var(--primary-glow)] blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[var(--accent-soft)] blur-3xl" />
          </div>

          <ModalHeader pacienteNombre={pacienteNombre} onClose={onClose} />

          <div className="relative z-10 px-6 md:px-8">
            <ModalTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              dispensacionesCount={dispensaciones.length}
            />
          </div>

          <form
            onSubmit={(e) => handleSubmit(e, pacienteId, onSave, onClose)}
            className="relative z-10 flex-1 space-y-5 overflow-y-auto p-6 pt-4 md:p-8"
          >
            <AnimatePresence mode="wait">
              {activeTab === "datos" ? (
                <motion.div key="datos" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <ConsultaTab form={form} updateField={updateField} />
                </motion.div>
              ) : (
                <motion.div key="medicamentos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <MedicamentosTab dispensaciones={dispensaciones} onDispensacionesChange={setDispensaciones} />
                </motion.div>
              )}
            </AnimatePresence>

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
