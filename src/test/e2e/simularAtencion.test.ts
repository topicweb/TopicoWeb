/**
 * Script de Prueba End-to-End: Simulación de Atención Médica
 * 
 * Este script simula un flujo completo de atención médica para probar:
 * - Creación de paciente
 * - Registro de atención con signos vitales
 * - Dispensación de medicamentos
 * - Sincronización de datos
 * - Búsqueda y filtros
 * 
 * Uso: Ejecutar en consola del navegador o como test E2E
 */

import { db } from '@/core/db';
import { atencionRepository } from '@/features/atenciones/data';
import type { AtencionFormData, SignosVitales } from '@/features/atenciones/types';

// ───────────────────────────────────────────────────────────────────────────────
// CONFIGURACIÓN
// ───────────────────────────────────────────────────────────────────────────────

// Generar DNI único para cada ejecución del test (evita conflictos)
const generarDniUnico = () => `TEST${Date.now().toString().slice(-8)}`;

const CONFIG = {
  businessId: '3929400f-8a2b-407a-b48b-aafb1b8ff07a',
  userId: 'e843c563-95c3-4248-90fd-a452d821a597',
  userEmail: 'medico@test.com',
  pacienteNombre: 'Juan Pérez García',
  get pacienteDni() { return generarDniUnico(); }, // DNI único por ejecución
};

// ───────────────────────────────────────────────────────────────────────────────
// UTILIDADES
// ───────────────────────────────────────────────────────────────────────────────

const generarUUID = () => crypto.randomUUID();
const timestamp = () => new Date().toISOString();

// Variable para guardar el DNI usado en esta ejecución (para limpieza posterior)
let DNI_USADO: string | null = null;

const signosVitalesNormales: SignosVitales = {
  temp: '36.5',
  presion: '120/80',
  saturacion: '98',
};

// ───────────────────────────────────────────────────────────────────────────────
// PASO 1: Crear Paciente de Prueba
// ───────────────────────────────────────────────────────────────────────────────

async function crearPacientePrueba() {
  console.log('🏥 PASO 1: Creando paciente de prueba...');

  // Guardar el DNI para limpieza posterior
  DNI_USADO = CONFIG.pacienteDni;

  const paciente = {
    id: generarUUID(),
    business_id: CONFIG.businessId,
    nombres: 'Juan',
    apellidos: 'Pérez García',
    dni: DNI_USADO,
    sexo: 'M' as const,
    categoria: 'administrativo' as const,
    programa_id: null,
    metadata: {},
    activo: 1,
    creado_at: timestamp(),
    actualizado_at: timestamp(),
    sync_status: 'pending' as const,
  };

  await db.pacientes.add(paciente);
  console.log('✅ Paciente creado:', paciente.id, 'con DNI:', DNI_USADO);

  return paciente;
}

// ───────────────────────────────────────────────────────────────────────────────
// PASO 2: Crear Medicamentos de Prueba (si no existen)
// ───────────────────────────────────────────────────────────────────────────────

async function crearMedicamentosPrueba() {
  console.log('💊 PASO 2: Verificando medicamentos...');

  const medicamentosExistentes = await db.medicamentos
    .where('business_id')
    .equals(CONFIG.businessId)
    .count();

  if (medicamentosExistentes > 0) {
    console.log('✅ Medicamentos ya existen:', medicamentosExistentes);
    return await db.medicamentos.where('business_id').equals(CONFIG.businessId).toArray();
  }

  const medicamentos = [
    {
      id: generarUUID(),
      business_id: CONFIG.businessId,
      nombre: 'Paracetamol 500mg',
      descripcion: 'Analgésico y antipirético',
      presentacion: 'Tabletas',
      unidad_medida: 'tableta',
      tipo_medida: 'UNIDAD' as const,
      stock_actual: 100,
      stock_minimo: 20,
      activo: 1,
      creado_at: timestamp(),
      actualizado_at: timestamp(),
      sync_status: 'pending' as const,
    },
    {
      id: generarUUID(),
      business_id: CONFIG.businessId,
      nombre: 'Ibuprofeno 400mg',
      descripcion: 'Antiinflamatorio no esteroideo',
      presentacion: 'Tabletas',
      unidad_medida: 'tableta',
      tipo_medida: 'UNIDAD' as const,
      stock_actual: 50,
      stock_minimo: 10,
      activo: 1,
      creado_at: timestamp(),
      actualizado_at: timestamp(),
      sync_status: 'pending' as const,
    },
    {
      id: generarUUID(),
      business_id: CONFIG.businessId,
      nombre: 'Amoxicilina 500mg',
      descripcion: 'Antibiótico de amplio espectro',
      presentacion: 'Cápsulas',
      unidad_medida: 'capsula',
      tipo_medida: 'UNIDAD' as const,
      stock_actual: 30,
      stock_minimo: 5,
      activo: 1,
      creado_at: timestamp(),
      actualizado_at: timestamp(),
      sync_status: 'pending' as const,
    },
  ];

  for (const med of medicamentos) {
    await db.medicamentos.add(med);
  }

  console.log('✅ Medicamentos creados:', medicamentos.length);
  return medicamentos;
}

// ───────────────────────────────────────────────────────────────────────────────
// PASO 3: Crear Atención Médica
// ───────────────────────────────────────────────────────────────────────────────

async function crearAtencion(pacienteId: string) {
  console.log('📋 PASO 3: Creando atención médica...');

  const atencionData: AtencionFormData = {
    paciente_id: pacienteId,
    fecha_atencion: new Date().toISOString(),
    motivo_consulta: 'Dolor de cabeza persistente y fiebre leve desde hace 2 días',
    observacion: 'Síntomas: Cefalea frontal, fiebre 37.8°C, malestar general. Diagnóstico: Cefalea tensional con cuadro viral. Tratamiento: Analgésicos y reposo. Control de presión arterial.',
    signos_vitales: signosVitalesNormales,
  };

  const resultado = await atencionRepository.crear(
    atencionData,
    [], // Sin dispensaciones por ahora
    {
      businessId: CONFIG.businessId,
      perfilId: CONFIG.userId,
    }
  );

  console.log('✅ Atención creada:', resultado?.atencionId);
  return resultado?.atencionId;
}

// ───────────────────────────────────────────────────────────────────────────────
// PASO 4: Dispensar Medicamentos
// ───────────────────────────────────────────────────────────────────────────────

async function dispensarMedicamentos(atencionId: string, medicamentos: any[]) {
  console.log('💉 PASO 4: Dispensando medicamentos...');

  const dispensaciones = [
    {
      medicamento_id: medicamentos[0].id, // Paracetamol
      cantidad: 10,
      tipo_medida: 'UNIDAD' as const,
    },
    {
      medicamento_id: medicamentos[1].id, // Ibuprofeno
      cantidad: 8,
      tipo_medida: 'UNIDAD' as const,
    },
  ];

  // Crear nueva atención con dispensaciones
  const paciente = await db.pacientes.get({ business_id: CONFIG.businessId });
  if (!paciente) throw new Error('Paciente no encontrado');

  const atencionData: AtencionFormData = {
    paciente_id: paciente.id,
    fecha_atencion: new Date().toISOString(),
    motivo_consulta: 'Control de hipertensión - Consulta de seguimiento',
    observacion: 'Síntomas: Presión arterial elevada en controles previos. Diagnóstico: Hipertensión arterial esencial grado 1. Tratamiento: IECA + Diurético. Control mensual. Se dispensa medicamento para 1 mes. Retorno en 30 días.',
    signos_vitales: {
      ...signosVitalesNormales,
      presion: '140/90',
    },
  };

  const resultado = await atencionRepository.crear(
    atencionData,
    dispensaciones,
    {
      businessId: CONFIG.businessId,
      perfilId: CONFIG.userId,
    }
  );

  console.log('✅ Atención con dispensaciones creada:', resultado?.atencionId);
  console.log('   - Movimientos de stock:', resultado?.movimientosCreados);
  console.log('   - Stock actualizado:', resultado?.stockActualizado.length, 'medicamentos');

  return resultado;
}

// ───────────────────────────────────────────────────────────────────────────────
// PASO 5: Verificar Filtros y Búsqueda
// ───────────────────────────────────────────────────────────────────────────────

async function probarFiltros() {
  console.log('🔍 PASO 5: Probando filtros y búsqueda...');

  // Obtener todas las atenciones
  const atenciones = await atencionRepository.listarConDetalles(CONFIG.businessId, 100);
  console.log('✅ Atenciones encontradas:', atenciones.length);

  // Probar filtro por paciente
  const paciente = await db.pacientes.get({ business_id: CONFIG.businessId });
  if (paciente) {
    const atencionesPaciente = atenciones.filter(a => a.paciente_id === paciente.id);
    console.log('✅ Atenciones del paciente:', atencionesPaciente.length);
  }

  // Probar búsqueda por motivo
  const busquedaCefalea = atenciones.filter(a =>
    a.motivo_consulta.toLowerCase().includes('cefalea') ||
    a.motivo_consulta.toLowerCase().includes('cabeza')
  );
  console.log('✅ Atenciones con "cefalea/cabeza":', busquedaCefalea.length);

  // Probar filtro por fecha
  const hoy = new Date().toISOString().split('T')[0];
  const atencionesHoy = atenciones.filter(a => a.fecha_atencion === hoy);
  console.log('✅ Atenciones de hoy:', atencionesHoy.length);

  return atenciones;
}

// ───────────────────────────────────────────────────────────────────────────────
// PASO 6: Verificar Sincronización
// ───────────────────────────────────────────────────────────────────────────────

async function verificarSync() {
  console.log('☁️ PASO 6: Verificando estado de sincronización...');

  const pendingPacientes = await db.pacientes.where('sync_status').equals('pending').count();
  const pendingMedicamentos = await db.medicamentos.where('sync_status').equals('pending').count();
  const pendingAtenciones = await db.atenciones.where('sync_status').equals('pending').count();
  const pendingMovimientos = await db.movimientos_stock.where('sync_status').equals('pending').count();

  console.log('📊 Datos pendientes de sincronización:');
  console.log('   - Pacientes:', pendingPacientes);
  console.log('   - Medicamentos:', pendingMedicamentos);
  console.log('   - Atenciones:', pendingAtenciones);
  console.log('   - Movimientos:', pendingMovimientos);

  const totalPendientes = pendingPacientes + pendingMedicamentos + pendingAtenciones + pendingMovimientos;

  if (totalPendientes > 0) {
    console.log('✅ Hay', totalPendientes, 'registros pendientes de sync (normal)');
  } else {
    console.log('⚠️ No hay registros pendientes - ¿Ya se sincronizaron?');
  }

  return {
    pacientes: pendingPacientes,
    medicamentos: pendingMedicamentos,
    atenciones: pendingAtenciones,
    movimientos: pendingMovimientos,
    total: totalPendientes,
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// PASO 7: Pruebas de Rendimiento
// ───────────────────────────────────────────────────────────────────────────────

async function pruebasRendimiento() {
  console.log('⚡ PASO 7: Pruebas de rendimiento...');

  // Medir tiempo de filtrado
  const start = performance.now();
  const atenciones = await atencionRepository.listarConDetalles(CONFIG.businessId, 1000);
  const end = performance.now();
  console.log(`✅ Listar atenciones: ${(end - start).toFixed(2)}ms (${atenciones.length} registros)`);

  // Medir tiempo de búsqueda
  const searchStart = performance.now();
  const resultados = atenciones.filter(a =>
    a.pacienteNombre.toLowerCase().includes('juan') ||
    a.motivo_consulta.toLowerCase().includes('dolor')
  );
  const searchEnd = performance.now();
  console.log(`✅ Búsqueda filtrada: ${(searchEnd - searchStart).toFixed(2)}ms (${resultados.length} resultados)`);

  return {
    listarMs: end - start,
    buscarMs: searchEnd - searchStart,
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: Ejecutar Simulación Completa
// ───────────────────────────────────────────────────────────────────────────────

export async function simularAtencionCompleta() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  🏥 SIMULACIÓN DE ATENCIÓN MÉDICA - TEST E2E');
  console.log('═══════════════════════════════════════════════════════════\n');

  const resultados = {
    pasosCompletados: 0,
    errores: [] as string[],
    tiempos: {} as Record<string, number>,
  };

  try {
    const totalStart = performance.now();

    // Paso 1: Crear paciente
    const t1 = performance.now();
    const paciente = await crearPacientePrueba();
    resultados.tiempos.paciente = performance.now() - t1;
    resultados.pasosCompletados++;

    // Paso 2: Crear medicamentos
    const t2 = performance.now();
    const medicamentos = await crearMedicamentosPrueba();
    resultados.tiempos.medicamentos = performance.now() - t2;
    resultados.pasosCompletados++;

    // Paso 3: Crear atención simple
    const t3 = performance.now();
    const atencionId1 = await crearAtencion(paciente.id);
    resultados.tiempos.atencion1 = performance.now() - t3;
    resultados.pasosCompletados++;

    // Paso 4: Crear atención con dispensaciones
    const t4 = performance.now();
    const atencion2 = await dispensarMedicamentos(atencionId1!, medicamentos);
    resultados.tiempos.atencion2 = performance.now() - t4;
    resultados.pasosCompletados++;

    // Paso 5: Probar filtros
    const t5 = performance.now();
    await probarFiltros();
    resultados.tiempos.filtros = performance.now() - t5;
    resultados.pasosCompletados++;

    // Paso 6: Verificar sync
    const t6 = performance.now();
    const syncStatus = await verificarSync();
    resultados.tiempos.sync = performance.now() - t6;
    resultados.pasosCompletados++;

    // Paso 7: Rendimiento
    const t7 = performance.now();
    const perfStats = await pruebasRendimiento();
    resultados.tiempos.rendimiento = performance.now() - t7;
    resultados.pasosCompletados++;

    resultados.tiempos.total = performance.now() - totalStart;

    // Resumen final
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ✅ SIMULACIÓN COMPLETADA EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📊 Pasos completados: ${resultados.pasosCompletados}/7`);
    console.log(`⏱️  Tiempo total: ${resultados.tiempos.total.toFixed(2)}ms`);
    console.log(`☁️  Datos pendientes de sync: ${syncStatus.total}`);
    console.log(`⚡ Listado de atenciones: ${perfStats.listarMs.toFixed(2)}ms`);
    console.log(`🔍 Búsqueda: ${perfStats.buscarMs.toFixed(2)}ms`);
    console.log('═══════════════════════════════════════════════════════════\n');

    return {
      exito: true,
      pacienteId: paciente.id,
      atencionesCreadas: 2,
      syncPendiente: syncStatus.total,
      tiempos: resultados.tiempos,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('\n❌ ERROR EN SIMULACIÓN:', errorMsg);
    resultados.errores.push(errorMsg);

    return {
      exito: false,
      pasosCompletados: resultados.pasosCompletados,
      error: errorMsg,
      tiempos: resultados.tiempos,
    };
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// FUNCIÓN DE LIMPIEZA: Eliminar datos de prueba
// ───────────────────────────────────────────────────────────────────────────────

export async function limpiarDatosPrueba() {
  console.log('🧹 Limpiando datos de prueba...');

  try {
    // Buscar pacientes de prueba por DNI específico o por patrón "TEST"
    let pacientesPrueba = [];

    if (DNI_USADO) {
      // Usar el DNI específico de esta ejecución
      const paciente = await db.pacientes.get({ dni: DNI_USADO });
      if (paciente) pacientesPrueba.push(paciente);
    } else {
      // Buscar todos los pacientes de prueba (DNI que empieza con TEST)
      const todosPacientes = await db.pacientes.toArray();
      pacientesPrueba = todosPacientes.filter(p => p.dni?.startsWith('TEST'));
    }

    // Eliminar cada paciente de prueba y sus atenciones
    for (const paciente of pacientesPrueba) {
      console.log(`🗑️ Eliminando paciente ${paciente.dni}...`);

      // Eliminar atenciones de este paciente
      const atenciones = await db.atenciones
        .where('paciente_id')
        .equals(paciente.id)
        .toArray();

      for (const atencion of atenciones) {
        await db.atenciones.delete(atencion.id);

        // Eliminar movimientos relacionados
        const movimientos = await db.movimientos_stock
          .where('atencion_id')
          .equals(atencion.id)
          .toArray();
        for (const mov of movimientos) {
          await db.movimientos_stock.delete(mov.id);
        }
      }
      console.log(`  - ${atenciones.length} atenciones eliminadas`);

      // Eliminar paciente
      await db.pacientes.delete(paciente.id);
      console.log('✅ Paciente eliminado');
    }

    // También buscar atenciones huérfanas de prueba (sin paciente) por fecha reciente
    const atencionesHuérfanas = await db.atenciones
      .where('business_id')
      .equals(CONFIG.businessId)
      .toArray();

    let atencionesEliminadas = 0;
    for (const atencion of atencionesHuérfanas) {
      const fechaAtencion = new Date(atencion.fecha_atencion);
      const hoy = new Date();
      const diffHoras = Math.abs(hoy.getTime() - fechaAtencion.getTime()) / (1000 * 3600);

      // Si es de las últimas 2 horas y el paciente ya no existe
      if (diffHoras < 2) {
        const pacienteExiste = await db.pacientes.get(atencion.paciente_id);
        if (!pacienteExiste) {
          await db.atenciones.delete(atencion.id);
          atencionesEliminadas++;
        }
      }
    }

    if (atencionesEliminadas > 0) {
      console.log(`✅ ${atencionesEliminadas} atenciones huérfanas eliminadas`);
    }

    console.log(`✅ Limpieza completada (${pacientesPrueba.length} pacientes)`);
    return true;
  } catch (error) {
    console.error('❌ Error limpiando:', error);
    return false;
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// EXPORTAR PARA USO EN CONSOLA
// ───────────────────────────────────────────────────────────────────────────────

// Para usar en consola del navegador:
// import { simularAtencionCompleta, limpiarDatosPrueba } from '@/test/e2e/simularAtencion';
// await simularAtencionCompleta();

if (typeof window !== 'undefined') {
  (window as any).simularAtencion = simularAtencionCompleta;
  (window as any).limpiarPruebas = limpiarDatosPrueba;
  console.log('🧪 Funciones de prueba disponibles en window.simularAtencion() y window.limpiarPruebas()');
}
