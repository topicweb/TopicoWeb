import { db, generateUUID } from '@/core/db/dexie/db';
import { supabase } from '@/core/db/supabase/client';
import { Atencion } from '@/features/atenciones/types';
import { MovimientoStock } from '@/features/inventario/types';

// ───────────────────────────────────────────────────────────────────────────────
// SEED DE DATOS INICIAL
// Crea datos demo para primer uso del sistema
// ───────────────────────────────────────────────────────────────────────────────

export async function seedDatabase(userEmail: string, userId: string) {
    if (!userEmail || !userId) return;

    console.log('🌱 Inicializando datos demo...');

    // Institución (tenant raíz del sistema)
    const existingInst = await db.table('instituciones' as any).toCollection().first();
    let currentBusinessId = existingInst?.id;

    if (!existingInst) {
        // Buscar institución existente en Supabase para evitar conflictos RLS
        const { data: remoteInst } = await supabase.from('instituciones').select('id').limit(1).single();

        if (remoteInst) {
            currentBusinessId = remoteInst.id;
            console.log('✅ Institución encontrada en Supabase:', currentBusinessId);
        } else {
            currentBusinessId = generateUUID();
            console.log('🏫 Creando nueva institución:', currentBusinessId);
        }

        await db.table('instituciones' as any).add({
            id: currentBusinessId,
            nombre: 'Institución Educativa Demo',
            activo: 1,
            creado_at: new Date().toISOString(),
            sync_status: remoteInst ? 'synced' : 'pending'
        } as any);
    }

    // Perfil de usuario administrador
    const existingProfile = await db.perfiles.get(userId);

    if (!existingProfile) {
        await db.perfiles.add({
            id: userId,
            email: userEmail,
            nombre: 'Admin Demo',
            rol: 'admin',
            activo: 1,
            business_id: currentBusinessId,
            creado_at: new Date().toISOString(),
            actualizado_at: new Date().toISOString(),
            sync_status: 'pending'
        });
        console.log('👤 Perfil admin creado');
    } else {
        await db.perfiles.update(userId, { business_id: currentBusinessId });
        console.log('🔄 Perfil vinculado a institución');
    }

    // Programas de estudio (requeridos para pacientes)
    const countProgs = await db.programas_estudio.count();
    let programaId = '';

    if (countProgs === 0) {
        programaId = generateUUID();
        await db.programas_estudio.bulkAdd([
            {
                id: programaId,
                business_id: currentBusinessId,
                nombre: 'Enfermería Técnica',
                activo: 1,
                sync_status: 'pending'
            },
            {
                id: generateUUID(),
                business_id: currentBusinessId,
                nombre: 'Desarrollo de Sistemas de Información',
                activo: 1,
                sync_status: 'pending'
            }
        ] as any);
        console.log('📚 Programas de estudio creados');
    } else {
        programaId = (await db.programas_estudio.toCollection().first())!.id;
        console.log('📚 Usando programa existente');
    }

    // Pacientes de ejemplo
    const countPatients = await db.pacientes.count();
    let patientId = '';

    if (countPatients === 0) {
        patientId = generateUUID();
        await db.pacientes.bulkAdd([
            {
                id: patientId,
                business_id: currentBusinessId,
                nombres: 'Juan',
                apellidos: 'Perez',
                dni: '12345678',
                programa_id: programaId,
                categoria: 'estudiante',
                sexo: 'M',
                activo: 1,
                metadata: { ciclo: 'IV', turno: 'Mañana' },
                creado_at: new Date().toISOString(),
                actualizado_at: new Date().toISOString(),
                sync_status: 'pending'
            },
            {
                id: generateUUID(),
                business_id: currentBusinessId,
                nombres: 'Maria',
                apellidos: 'Gomez',
                dni: '87654321',
                programa_id: programaId,
                categoria: 'estudiante',
                sexo: 'F',
                activo: 1,
                metadata: { ciclo: 'II', turno: 'Tarde' },
                creado_at: new Date().toISOString(),
                actualizado_at: new Date().toISOString(),
                sync_status: 'pending'
            }
        ] as any);
        console.log('👥 Pacientes demo creados');
    } else {
        patientId = (await db.pacientes.toCollection().first())!.id;
        console.log('👥 Usando paciente existente');
    }

    // Medicamentos con stock inicial
    const countMeds = await db.medicamentos.count();
    let medId = '';

    if (countMeds === 0) {
        medId = generateUUID();
        await db.medicamentos.bulkAdd([
            {
                id: medId,
                business_id: currentBusinessId,
                nombre: 'Paracetamol 500mg',
                descripcion: 'Analgésico',
                unidad_medida: 'comprimido',
                anaquel: 'A-1',
                stock_actual: 100,
                stock_minimo: 20,
                activo: 1,
                creado_at: new Date().toISOString(),
                actualizado_at: new Date().toISOString(),
                sync_status: 'pending'
            },
            {
                id: generateUUID(),
                business_id: currentBusinessId,
                nombre: 'Alcohol Medicinal',
                descripcion: 'Desinfectante',
                unidad_medida: 'frasco',
                anaquel: 'C-3',
                stock_actual: 10,
                stock_minimo: 5,
                activo: 1,
                creado_at: new Date().toISOString(),
                actualizado_at: new Date().toISOString(),
                sync_status: 'pending'
            }
        ] as any);
        console.log('💊 Medicamentos demo creados');
    } else {
        medId = (await db.medicamentos.toCollection().first())!.id;
        console.log('💊 Usando medicamento existente');
    }

    // Atenciones recientes con movimientos de stock
    const countAtts = await db.atenciones.count();

    if (countAtts === 0 && userId) {
        const now = new Date();
        const attentions: Atencion[] = [];
        const movements: MovimientoStock[] = [];

        // Crear 3 atenciones de los últimos 3 días
        for (let i = 0; i < 3; i++) {
            const date = new Date();
            date.setDate(now.getDate() - i);
            const dateStr = date.toISOString();

            const attId = generateUUID();
            attentions.push({
                id: attId,
                business_id: currentBusinessId!,
                paciente_id: patientId,
                perfil_id: userId,
                fecha_atencion: dateStr,
                motivo_consulta: 'Gripe estacional',
                observacion: 'Reposo sugerido',
                signos_vitales: { temp: '37.5', presion: '120/80', saturacion: '98' },
                activo: 1,
                creado_at: dateStr,
                actualizado_at: dateStr,
                sync_status: 'pending'
            });

            // Movimiento de stock por cada atención
            movements.push({
                id: generateUUID(),
                business_id: currentBusinessId!,
                medicamento_id: medId,
                atencion_id: attId,
                tipo: 'SALIDA',
                cantidad: 1,
                tipo_medida: 'UNIDAD',
                fecha_movimiento: dateStr,
                creado_at: dateStr,
                actualizado_at: dateStr,
                sync_status: 'pending'
            });
        }

        await db.atenciones.bulkAdd(attentions);
        await db.movimientos_stock.bulkAdd(movements);
        console.log('📋 Atenciones demo creadas');
    }

    console.log('✅ Seed de datos completado');
    window.location.reload();
}
