import { ClipboardList, Pill } from "lucide-react";

interface ModalTabsProps {
  activeTab: "datos" | "medicamentos";
  onTabChange: (tab: "datos" | "medicamentos") => void;
  dispensacionesCount: number;
}

export function ModalTabs({ activeTab, onTabChange, dispensacionesCount }: ModalTabsProps) {
  return (
    <div className="relative z-10 mt-4 flex gap-2">
      <TabButton
        active={activeTab === "datos"}
        onClick={() => onTabChange("datos")}
        icon={<ClipboardList size={16} />}
        label="Datos Clínicos"
      />
      <TabButton
        active={activeTab === "medicamentos"}
        onClick={() => onTabChange("medicamentos")}
        icon={<Pill size={16} />}
        label="Medicamentos"
        badge={dispensacionesCount > 0 ? dispensacionesCount : undefined}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "border border-primary/20 bg-[var(--primary-soft)] text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="ml-1 rounded-full bg-accent px-2 py-0.5 text-xs text-white">{badge}</span>
      )}
    </button>
  );
}
