import { Save, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalFooterProps {
  error: string | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ModalFooter({ error, saving, onCancel, onSubmit }: ModalFooterProps) {
  return (
    <>
      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors uppercase tracking-widest"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-linear-to-r from-teal-600 to-teal-500 px-8 py-4 text-sm font-bold text-white hover:shadow-xl hover:shadow-teal-500/30 transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
          ) : (
            <Save size={18} />
          )}
          {saving ? "PROCESANDO..." : "GUARDAR ATENCIÓN"}
        </button>
      </div>
    </>
  );
}
