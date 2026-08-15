"use client";

import {
  Calendar,
  Clock,
  User,
  Phone,
  Fingerprint,
  CheckCircle2,
  CloudOff,
  Pill,
  Activity,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import type { AtencionConDetallesExtendida } from "../types";
import { calculateAge } from "@/features/pacientes/utils/calculateAge";

interface AtencionCardProps {
  atencion: AtencionConDetallesExtendida;
  index?: number;
  onViewHistorial?: (pacienteId: string, pacienteNombre: string) => void;
}

export function AtencionCard({ atencion, onViewHistorial }: AtencionCardProps) {
  // ── CÁLCULOS DE DATOS ───────────────────────────────────────────────────────────
  const fecha = new Date(atencion.fecha_atencion);
  const fechaFormateada = fecha.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
  });
  const horaFormateada = fecha.toLocaleString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const edad = calculateAge(atencion.pacienteFechaNacimiento);
  const isSynced = atencion.sync_status === "synced";
  const hasMedicamentos =
    atencion.dispensaciones && atencion.dispensaciones.length > 0;
  const hasObservacion =
    atencion.observacion && atencion.observacion.trim() !== "";
  const hasSignosVitales =
    atencion.signos_vitales &&
    (atencion.signos_vitales.temp ||
      atencion.signos_vitales.presion ||
      atencion.signos_vitales.saturacion);

  return (
    <div
      className="glass-card group transition-all hover:border-primary/20"
      style={{ boxShadow: "var(--card-shadow)" }}
    >
      {/* ENCABEZADO: Fecha, Hora y Sync Status */}
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <div className="flex items-center gap-1 font-semibold text-foreground">
              <Calendar size={16} className="text-primary" />
              {fechaFormateada}
            </div>
            <div className="flex items-center gap-1 text-muted">
              <Clock size={16} />
              {horaFormateada}
            </div>
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold sm:px-2.5 sm:py-1 ${
              isSynced ? "text-accent" : "text-warning"
            }`}
            style={
              isSynced
                ? { backgroundColor: "var(--accent-soft)" }
                : { backgroundColor: "var(--warning-soft)" }
            }
            title={
              isSynced
                ? "Sincronizado con el servidor"
                : "Pendiente de sincronización"
            }
          >
            {isSynced ? <CheckCircle2 size={12} /> : <CloudOff size={12} />}
            <span className="hidden sm:inline">
              {isSynced ? "Sincronizado" : "Pendiente"}
            </span>
          </span>
        </div>
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="space-y-4 px-4 py-4 sm:px-5">
        {/* SECCIÓN: DATOS DEL PACIENTE */}
        <div className="flex flex-col gap-4 rounded-xl bg-muted/40 p-3.5 sm:flex-row sm:items-center sm:gap-4">
          {/* Avatar del paciente */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <User size={24} className="text-primary" />
          </div>

          {/* Nombre y datos de contacto */}
          <div className="flex-1 min-w-0">
            <button
              onClick={() =>
                onViewHistorial?.(atencion.paciente_id, atencion.pacienteNombre)
              }
              className="group/btn flex items-center gap-1.5 text-left transition-colors hover:text-primary"
              title={`Ver historial de ${atencion.pacienteNombre}`}
            >
              <span className="line-clamp-1 text-base font-bold text-foreground">
                {atencion.pacienteNombre}
              </span>
            </button>
            {/* DNI y Teléfono */}
            <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted">
              {atencion.pacienteDNI && (
                <div className="flex items-center gap-1">
                  <Fingerprint size={12} />
                  <span>{atencion.pacienteDNI}</span>
                </div>
              )}
              {atencion.pacienteTelefono && (
                <div className="flex items-center gap-1">
                  <Phone size={12} />
                  <span>{atencion.pacienteTelefono}</span>
                </div>
              )}
              {edad !== null && (
                <div className="flex items-center gap-1 font-semibold text-primary">
                  <span>📅 {edad} años</span>
                </div>
              )}
            </div>
          </div>

          {/* SIGNOS VITALES: Al lado del paciente (desktop) o abajo (móvil) */}
          {hasSignosVitales && (
            <div className="flex flex-wrap gap-2 sm:flex-col sm:gap-1 sm:text-right">
              <div className="text-xs text-muted">Signos:</div>
              <div className="text-xs font-semibold text-foreground">
                {atencion.signos_vitales.temp && (
                  <div>🌡️ {atencion.signos_vitales.temp}°C</div>
                )}
                {atencion.signos_vitales.presion && (
                  <div>💉 {atencion.signos_vitales.presion}</div>
                )}
                {atencion.signos_vitales.saturacion && (
                  <div>💨 {atencion.signos_vitales.saturacion}%</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECCIÓN: DIAGNÓSTICO */}
        <div className="flex gap-3">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-accent" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Diagnóstico
            </p>
            <p className="mt-1 line-clamp-3 text-sm font-medium leading-relaxed text-foreground">
              {atencion.motivo_consulta}
            </p>
          </div>
        </div>

        {/* SECCIÓN: PROGRAMA DE ESTUDIO (si existe) */}
        {atencion.programaId && (
          <div className="flex gap-3">
            <BookOpen size={18} className="mt-0.5 shrink-0 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Programa
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {atencion.programaNombre || "Programa asignado"}
              </p>
            </div>
          </div>
        )}

        {/* SECCIÓN: TRATAMIENTO (Medicamentos) */}
        {hasMedicamentos && (
          <div className="flex gap-3">
            <Pill size={18} className="mt-0.5 shrink-0 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tratamiento ({atencion.dispensaciones.length})
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {atencion.dispensaciones.map((d, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"
                  >
                    {d.medicamento_nombre}
                    <span className="text-xs">×{d.cantidad}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECCIÓN: OBSERVACIONES */}
        {hasObservacion && (
          <div className="flex gap-3 rounded-lg bg-amber-50/50 p-3">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <span className="text-xs font-bold text-amber-700">!</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                Observaciones
              </p>
              <p className="mt-1 line-clamp-2 text-sm text-amber-900">
                {atencion.observacion}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER: Responsable */}
      <div className="border-t border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-xs text-muted">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
            <span className="text-xs font-bold text-muted-foreground">
              {atencion.staffNombre.charAt(0).toUpperCase()}
            </span>
          </div>
          <span>
            Responsable:{" "}
            <span className="font-semibold text-foreground">
              {atencion.staffNombre}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
