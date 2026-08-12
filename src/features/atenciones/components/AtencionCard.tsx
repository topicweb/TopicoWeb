'use client';

import { Calendar, User, Clock, History, Stethoscope, CheckCircle2, CloudOff, Pill, Activity } from 'lucide-react';
import type { AtencionConDetallesExtendida } from '../types';

interface AtencionCardProps {
  atencion: AtencionConDetallesExtendida;
  index?: number;
  onViewHistorial?: (pacienteId: string, pacienteNombre: string) => void;
}

export function AtencionCard({ atencion, onViewHistorial }: AtencionCardProps) {
  const fecha = new Date(atencion.fecha_atencion);
  const fechaFormateada = fecha.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const diffMs = Date.now() - fecha.getTime();
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

  const isSynced = atencion.sync_status === 'synced';
  const hasMedicamentos = atencion.dispensaciones && atencion.dispensaciones.length > 0;
  const hasObservacion = atencion.observacion && atencion.observacion.trim() !== '';
  const hasSignosVitales = atencion.signos_vitales && (
    atencion.signos_vitales.temp ||
    atencion.signos_vitales.presion ||
    atencion.signos_vitales.saturacion
  );

  return (
    <div className="glass-card group p-5 transition-all hover:border-primary/20 hover:shadow-[var(--card-shadow)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
          <Calendar size={16} className="shrink-0 text-[var(--slate-400)]" />
          <span className="font-medium text-foreground">{fechaFormateada}</span>
          {tiempoTranscurrido && (
            <>
              <span className="text-[var(--slate-200)]">•</span>
              <span className="flex items-center gap-1 text-xs">
                <Clock size={12} />
                {tiempoTranscurrido}
              </span>
            </>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold sm:px-2.5 sm:py-1 ${
            isSynced
              ? 'bg-[var(--accent-soft)] text-accent'
              : 'bg-[var(--warning-soft)] text-warning'
          }`}
          title={isSynced ? 'Sincronizado con el servidor' : 'Pendiente de sincronización'}
        >
          {isSynced ? <CheckCircle2 size={10} className="sm:h-3 sm:w-3" /> : <CloudOff size={10} className="sm:h-3 sm:w-3" />}
          <span className="hidden sm:inline">{isSynced ? 'Sincronizado' : 'Pendiente'}</span>
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)]">
          <User size={20} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <button
            onClick={() => onViewHistorial?.(atencion.paciente_id, atencion.pacienteNombre)}
            className="group/btn flex items-center gap-1.5 text-left text-base font-semibold text-foreground transition-colors hover:text-primary"
            title={`Ver historial de ${atencion.pacienteNombre}`}
          >
            <span className="line-clamp-1">{atencion.pacienteNombre}</span>
            <History size={14} className="shrink-0 text-[var(--slate-400)] opacity-0 transition-opacity group-hover/btn:opacity-100" />
          </button>
          <p className="text-xs text-muted">Toca para ver historial</p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2.5">
        <Stethoscope size={16} className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motivo</p>
          <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-relaxed text-foreground">
            {atencion.motivo_consulta}
          </p>
        </div>
      </div>

      {hasMedicamentos && (
        <div className="mt-4 flex items-start gap-2.5">
          <Pill size={16} className="mt-0.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Medicamentos ({atencion.dispensaciones.length})
            </p>
            <p className="mt-0.5 text-sm text-foreground">
              {atencion.dispensaciones.map((d, i) => (
                <span key={i} className="mr-1 inline-block">
                  {d.medicamento_nombre}{i < atencion.dispensaciones.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          </div>
        </div>
      )}

      {hasObservacion && (
        <div className="mt-4 flex items-start gap-2.5">
          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted">
            <span className="text-xs font-medium text-muted-foreground">O</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observación</p>
            <p className="mt-0.5 line-clamp-2 text-sm text-foreground">{atencion.observacion}</p>
          </div>
        </div>
      )}

      {hasSignosVitales && (
        <div className="mt-4 flex items-start gap-2.5">
          <Activity size={16} className="mt-0.5 shrink-0 text-accent" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Signos Vitales</p>
            <p className="mt-0.5 text-sm text-foreground">
              {atencion.signos_vitales.temp && `T: ${atencion.signos_vitales.temp}°C `}
              {atencion.signos_vitales.presion && `P: ${atencion.signos_vitales.presion} `}
              {atencion.signos_vitales.saturacion && `S: ${atencion.signos_vitales.saturacion}%`}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
          <span className="text-xs font-medium text-muted-foreground">
            {atencion.staffNombre.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="truncate text-xs text-muted">
          Atendió <span className="font-medium text-foreground">{atencion.staffNombre}</span>
        </span>
      </div>
    </div>
  );
}
