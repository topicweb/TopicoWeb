"use client";

import { useCallback } from "react";
import { Thermometer, Activity, Droplets } from "lucide-react";
import { SignosVitales } from "../types";

interface SignosVitalesInputProps {
  value: SignosVitales;
  onChange: (signos: SignosVitales) => void;
  disabled?: boolean;
}

const INPUT_CONFIG = [
  {
    key: "temp" as const,
    label: "Temp",
    placeholder: "37.0",
    unit: "°C",
    icon: Thermometer,
    pattern: "^\\d{2}(\\.\\d)?$",
    width: "w-24",
  },
  {
    key: "presion" as const,
    label: "PA",
    placeholder: "120/80",
    unit: "mmHg",
    icon: Activity,
    pattern: "^\\d{2,3}/\\d{2,3}$",
    width: "w-28",
  },
  {
    key: "saturacion" as const,
    label: "SpO2",
    placeholder: "98",
    unit: "%",
    icon: Droplets,
    pattern: "^\\d{2,3}$",
    width: "w-20",
  },
];

const inputBaseClass =
  "rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-800 dark:text-white text-center focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none";

export function SignosVitalesInput({ value, onChange, disabled }: SignosVitalesInputProps) {
  const updateField = useCallback(
    (field: keyof SignosVitales, val: string) => {
      onChange({ ...value, [field]: val });
    },
    [value, onChange]
  );

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      {INPUT_CONFIG.map(({ key, label, placeholder, unit, icon: Icon, width }) => (
        <div key={key} className="flex items-center gap-2 bg-slate-100/50 dark:bg-slate-800/30 rounded-lg px-2 py-1.5 md:px-3 md:py-2">
          <Icon size={14} className="text-teal-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider leading-none mb-1">
              {label}
            </span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                disabled={disabled}
                placeholder={placeholder}
                value={value[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className={`${inputBaseClass} ${width}`}
              />
              <span className="text-[10px] text-slate-400 font-medium">{unit}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SignosVitalesInput;
