import { Save, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalFooterProps {
  error: string | null;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ModalFooter({ error, saving, onCancel }: ModalFooterProps) {
  return (
    <>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-start gap-3 rounded-xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-4"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <p className="text-sm text-danger">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancelar
        </button>
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
          {saving ? "Guardando..." : "Guardar atención"}
        </button>
      </div>
    </>
  );
}
