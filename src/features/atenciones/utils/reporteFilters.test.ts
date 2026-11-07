import { describe, it, expect } from 'vitest';
import {
  getPeriodoReporteConGracia,
  filtrarAtencionesPorGrupo,
  getRangoMesEspecifico,
} from './reporteFilters';
import type { AtencionConDetallesExtendida } from '../types';

describe('reporteFilters', () => {
  describe('getPeriodoReporteConGracia', () => {
    it('debe tomar el mes anterior si estamos en los días 1, 2 o 3 (ej: 2 de Noviembre)', () => {
      const fecha = new Date(2026, 10, 2); // 2 de Noviembre de 2026
      const resultado = getPeriodoReporteConGracia(fecha);

      expect(resultado.esMesAnterior).toBe(true);
      expect(resultado.mes).toBe(10); // Octubre
      expect(resultado.año).toBe(2026);
      expect(resultado.display).toBe('Octubre 2026');
      expect(resultado.inicio.getDate()).toBe(1);
      expect(resultado.inicio.getMonth()).toBe(9); // Octubre (0-indexed)
      expect(resultado.fin.getDate()).toBe(31);
      expect(resultado.fin.getMonth()).toBe(9);
      expect(resultado.fin.getHours()).toBe(23);
      expect(resultado.fin.getMinutes()).toBe(59);
    });

    it('debe tomar Diciembre del año anterior si es 1 de Enero', () => {
      const fecha = new Date(2027, 0, 1); // 1 de Enero de 2027
      const resultado = getPeriodoReporteConGracia(fecha);

      expect(resultado.esMesAnterior).toBe(true);
      expect(resultado.mes).toBe(12); // Diciembre
      expect(resultado.año).toBe(2026);
      expect(resultado.display).toBe('Diciembre 2026');
      expect(resultado.inicio.getFullYear()).toBe(2026);
      expect(resultado.inicio.getMonth()).toBe(11);
      expect(resultado.inicio.getDate()).toBe(1);
    });

    it('debe tomar el mes actual si han pasado 3 días (ej: 4 de Noviembre)', () => {
      const fecha = new Date(2026, 10, 4); // 4 de Noviembre de 2026
      const resultado = getPeriodoReporteConGracia(fecha);

      expect(resultado.esMesAnterior).toBe(false);
      expect(resultado.mes).toBe(11); // Noviembre
      expect(resultado.año).toBe(2026);
      expect(resultado.display).toBe('Noviembre 2026');
      expect(resultado.inicio.getDate()).toBe(1);
      expect(resultado.inicio.getMonth()).toBe(10); // Noviembre
    });
  });

  describe('getRangoMesEspecifico', () => {
    it('debe empezar en 00:00:00 del día 01 y terminar en 23:59:59 del último día', () => {
      const { inicio, fin } = getRangoMesEspecifico(10, 2026); // Octubre 2026
      expect(inicio.getDate()).toBe(1);
      expect(inicio.getMonth()).toBe(9);
      expect(inicio.getHours()).toBe(0);
      expect(fin.getDate()).toBe(31);
      expect(fin.getMonth()).toBe(9);
      expect(fin.getHours()).toBe(23);
      expect(fin.getMinutes()).toBe(59);
    });
  });

  describe('filtrarAtencionesPorGrupo', () => {
    const atencionesDemo: AtencionConDetallesExtendida[] = [
      {
        id: '1',
        business_id: 'b1',
        paciente_id: 'p1',
        perfil_id: 'perf1',
        motivo_consulta: 'Gripe',
        diagnostico: '',
        signos_vitales: { temp: '', presion: '', saturacion: '', fr: '', fc: '' },
        activo: 1,
        fecha_atencion: '2026-10-10T10:00:00.000Z',
        creado_at: '2026-10-10T10:00:00.000Z',
        actualizado_at: '2026-10-10T10:00:00.000Z',
        sync_status: 'synced',
        pacienteNombre: 'Juan Alumno Enfermeria',
        pacienteDNI: '11111111',
        pacienteCategoria: 'estudiante',
        programaNombre: 'Enfermería Técnica',
        staffNombre: 'Enfermera Demo',
        dispensaciones: [],
      },
      {
        id: '2',
        business_id: 'b1',
        paciente_id: 'p2',
        perfil_id: 'perf1',
        motivo_consulta: 'Dolor de cabeza',
        diagnostico: '',
        signos_vitales: { temp: '', presion: '', saturacion: '', fr: '', fc: '' },
        activo: 1,
        fecha_atencion: '2026-10-12T10:00:00.000Z',
        creado_at: '2026-10-12T10:00:00.000Z',
        actualizado_at: '2026-10-12T10:00:00.000Z',
        sync_status: 'synced',
        pacienteNombre: 'Pedro Alumno Sistemas',
        pacienteDNI: '22222222',
        pacienteCategoria: 'estudiante',
        programaNombre: 'Desarrollo de Sistemas de Información',
        staffNombre: 'Enfermera Demo',
        dispensaciones: [],
      },
      {
        id: '3',
        business_id: 'b1',
        paciente_id: 'p3',
        perfil_id: 'perf1',
        motivo_consulta: 'Presión alta',
        diagnostico: '',
        signos_vitales: { temp: '', presion: '', saturacion: '', fr: '', fc: '' },
        activo: 1,
        fecha_atencion: '2026-10-15T10:00:00.000Z',
        creado_at: '2026-10-15T10:00:00.000Z',
        actualizado_at: '2026-10-15T10:00:00.000Z',
        sync_status: 'synced',
        pacienteNombre: 'Carlos Docente',
        pacienteDNI: '33333333',
        pacienteCategoria: 'docente',
        staffNombre: 'Enfermera Demo',
        dispensaciones: [],
      },
      {
        id: '4',
        business_id: 'b1',
        paciente_id: 'p4',
        perfil_id: 'perf1',
        motivo_consulta: 'Golpe',
        diagnostico: '',
        signos_vitales: { temp: '', presion: '', saturacion: '', fr: '', fc: '' },
        activo: 1,
        fecha_atencion: '2026-10-18T10:00:00.000Z',
        creado_at: '2026-10-18T10:00:00.000Z',
        actualizado_at: '2026-10-18T10:00:00.000Z',
        sync_status: 'synced',
        pacienteNombre: 'Maria Admin',
        pacienteDNI: '44444444',
        pacienteCategoria: 'administrativo',
        staffNombre: 'Enfermera Demo',
        dispensaciones: [],
      },
      {
        id: '5',
        business_id: 'b1',
        paciente_id: 'p5',
        perfil_id: 'perf1',
        motivo_consulta: 'Corte',
        diagnostico: '',
        signos_vitales: { temp: '', presion: '', saturacion: '', fr: '', fc: '' },
        activo: 1,
        fecha_atencion: '2026-10-20T10:00:00.000Z',
        creado_at: '2026-10-20T10:00:00.000Z',
        actualizado_at: '2026-10-20T10:00:00.000Z',
        sync_status: 'synced',
        pacienteNombre: 'Rosa Limpieza',
        pacienteDNI: '55555555',
        pacienteCategoria: 'limpieza',
        staffNombre: 'Enfermera Demo',
        dispensaciones: [],
      },
    ];

    it('debe filtrar todos los alumnos', () => {
      const res = filtrarAtencionesPorGrupo(atencionesDemo, 'alumno');
      expect(res).toHaveLength(2);
      expect(res.map((a) => a.id)).toEqual(['1', '2']);
    });

    it('debe filtrar solo alumnos de Enfermería', () => {
      const res = filtrarAtencionesPorGrupo(atencionesDemo, 'enfermeria');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('1');
    });

    it('debe filtrar solo alumnos de Desarrollo de Sistemas', () => {
      const res = filtrarAtencionesPorGrupo(atencionesDemo, 'desarrollo_sistemas');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('2');
    });

    it('debe filtrar docentes', () => {
      const res = filtrarAtencionesPorGrupo(atencionesDemo, 'docente');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('3');
    });

    it('debe filtrar administrativos', () => {
      const res = filtrarAtencionesPorGrupo(atencionesDemo, 'administrativo');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('4');
    });

    it('debe filtrar personal de limpieza', () => {
      const res = filtrarAtencionesPorGrupo(atencionesDemo, 'limpieza');
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('5');
    });

    it('debe retornar todos si se pasa "todos"', () => {
      const res = filtrarAtencionesPorGrupo(atencionesDemo, 'todos');
      expect(res).toHaveLength(5);
    });
  });
});
