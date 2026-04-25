import { ClipboardList, Pill } from "lucide-react";

interface ModalTabsProps {
  activeTab: "datos" | "medicamentos";
  onTabChange: (tab: "datos" | "medicamentos") => void;
  dispensacionesCount: number;
}

export function ModalTabs({ activeTab, onTabChange, dispensacionesCount }: ModalTabsProps) {
  return (
    <div className="flex gap-2 mt-6 relative z-10">
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

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${active
        ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        }`}
    >
      {icon}
      {label}
      {badge !== undefined && (
        <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-teal-500 text-white">{badge}</span>
      )}
    </button>
  );
}
