'use client';

import { Calendar, User, Clock, History, Stethoscope, CheckCircle2, CloudOff, Pill, Activity } from 'lucide-react';
import type { AtencionConDetallesExtendida } from '../types';

// ───────────────────────────────────────────────────────────────────────────────
// ATENCION CARD
// Card individual para atención médica con diseño consistente
// ───────────────────────────────────────────────────────────────────────────────

interface AtencionCardProps {
  atencion: AtencionConDetallesExtendida;
  index?: number;
  onViewHistorial?: (pacienteId: string, pacienteNombre: string) => void;
}

export function AtencionCard({ atencion, index = 0, onViewHistorial }: AtencionCardProps) {
  const fecha = new Date(atencion.fecha_atencion);

  // Formato de fecha y tiempo relativo
  const fechaFormateada = fecha.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const ahora = new Date();
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDias = Math.floor(diffHoras / 24);

  let tiempoTranscurrido = '';
  if (diffDias === 0 && diffHoras < 24) {
    tiempoTranscurrido = diffHoras < 1 ? 'Hace minutos' : `Hace ${diffHoras}h`;
  } else if (diffDias === 1) {
    tiempoTranscurrido = 'Ayer';
  } else if (diffDias < 7) {
    tiempoTranscurrido = `Hace ${diffDias} días`;
  }

  const handleHistorialClick = () => {
    if (onViewHistorial) {
      onViewHistorial(atencion.paciente_id, atencion.pacienteNombre);
    }
  };

  const isSynced = atencion.sync_status === 'synced';
  const hasMedicamentos = atencion.dispensaciones && atencion.dispensaciones.length > 0;
  const hasObservacion = atencion.observacion && atencion.observacion.trim() !== '';
  const hasSignosVitales = atencion.signos_vitales && (
    atencion.signos_vitales.temp ||
    atencion.signos_vitales.presion ||
    atencion.signos_vitales.saturacion
  );

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-teal-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-800">
      {/* Header: Fecha y Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Calendar size={16} className="shrink-0 text-slate-400" />
          <span className="font-medium">{fechaFormateada}</span>
          {tiempoTranscurrido && (
            <>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-xs">
                <Clock size={12} />
                {tiempoTranscurrido}
              </span>
            </>
          )}
        </div>

        {/* Badge de sync status - Compacto en móvil */}
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold sm:px-2.5 sm:py-1 ${isSynced
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}
          title={isSynced ? 'Sincronizado con el servidor' : 'Pendiente de sincronización'}
        >
          {isSynced ? <CheckCircle2 size={10} className="sm:h-3 sm:w-3" /> : <CloudOff size={10} className="sm:h-3 sm:w-3" />}
          <span className="hidden sm:inline">{isSynced ? 'Sincronizado' : 'Pendiente'}</span>
        </span>
      </div>

      {/* Paciente - Destacado */}
      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900/30">
          <User size={20} className="text-teal-600 dark:text-teal-400" />
        </div>
        <div className="min-w-0 flex-1">
          <button
            onClick={handleHistorialClick}
            className="group/btn flex items-center gap-1.5 text-left text-base font-semibold text-slate-900 transition-colors hover:text-teal-600 sm:text-base dark:text-slate-100 dark:hover:text-teal-400"
            title={`Ver historial de ${atencion.pacienteNombre}`}
          >
            <span className="line-clamp-1">{atencion.pacienteNombre}</span>
            <History
              size={14}
              className="shrink-0 text-slate-400 opacity-0 transition-opacity group-hover/btn:opacity-100"
            />
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Toca para ver historial
          </p>
        </div>
      </div>

      {/* Motivo de consulta */}
      <div className="mt-4 flex items-start gap-2.5">
        <Stethoscope size={16} className="mt-0.5 shrink-0 text-slate-400" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Motivo
          </p>
          <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-300">
            {atencion.motivo_consulta}
          </p>
        </div>
      </div>

      {/* Medicamentos dispensados */}
      {hasMedicamentos && (
        <div className="mt-4 flex items-start gap-2.5">
          <Pill size={16} className="mt-0.5 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Medicamentos ({atencion.dispensaciones.length})
            </p>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
              {atencion.dispensaciones.map((d, i) => (
                <span key={i} className="inline-block mr-1">
                  {d.medicamento_nombre}{i < atencion.dispensaciones.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {/* Observación */}
      {hasObservacion && (
        <div className="mt-4 flex items-start gap-2.5">
          <div className="mt-0.5 shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">O</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Observación
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm text-slate-700 dark:text-slate-300">
              {atencion.observacion}
            </p>
          </div>
        </div>
      )}

      {/* Signos vitales */}
      {hasSignosVitales && (
        <div className="mt-4 flex items-start gap-2.5">
          <Activity size={16} className="mt-0.5 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Signos Vitales
            </p>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
              {atencion.signos_vitales.temp && `T: ${atencion.signos_vitales.temp}°C `}
              {atencion.signos_vitales.presion && `P: ${atencion.signos_vitales.presion} `}
              {atencion.signos_vitales.saturacion && `S: ${atencion.signos_vitales.saturacion}%`}
            </p>
          </div>
        </div>
      )}

      {/* Footer: Staff */}
      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {atencion.staffNombre.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="truncate text-xs text-slate-500 dark:text-slate-400">
          Atendió{' '}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {atencion.staffNombre}
          </span>
        </span>
      </div>
    </div>
  );
}
