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
  { key: "temp" as const, label: "Temp", placeholder: "37.0", unit: "°C", icon: Thermometer, width: "w-24" },
  { key: "presion" as const, label: "PA", placeholder: "120/80", unit: "mmHg", icon: Activity, width: "w-28" },
  { key: "saturacion" as const, label: "SpO2", placeholder: "98", unit: "%", icon: Droplets, width: "w-20" },
];

export function SignosVitalesInput({ value, onChange, disabled }: SignosVitalesInputProps) {
  const updateField = useCallback(
    (field: keyof SignosVitales, val: string) => onChange({ ...value, [field]: val }),
    [value, onChange]
  );

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      {INPUT_CONFIG.map(({ key, label, placeholder, unit, icon: Icon, width }) => (
        <div key={key} className="flex items-center gap-2 rounded-lg border border-border bg-muted px-2 py-1.5 md:px-3 md:py-2">
          <Icon size={14} className="shrink-0 text-accent" />
          <div className="flex flex-col">
            <span className="mb-1 text-[10px] font-semibold uppercase leading-none tracking-wide text-muted-foreground">
              {label}
            </span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                disabled={disabled}
                placeholder={placeholder}
                value={value[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className={`input-premium ${width} px-2 py-1.5 text-center text-sm font-medium`}
              />
              <span className="text-[10px] font-medium text-muted">{unit}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default SignosVitalesInput;
