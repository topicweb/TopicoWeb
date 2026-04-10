import { db, generateUUID } from '@/core/db/dexie/db';
import { supabase } from '@/core/db/supabase/client';
import { Atencion } from '@/features/atenciones/types';
import { MovimientoStock } from '@/features/inventario/types';
import { Paciente, ProgramaEstudio } from '@/features/pacientes/types';
import { Medicamento } from '@/features/inventario/types';

export async function seedDatabase(userEmail: string, userId: string) {
    if (!userEmail || !userId) return;

    console.log('--- Inicianizando Seed de Datos (v11) ---');

    // 1. Asegurar Institución (Tenant Raíz)
    const existingInst = await db.table('instituciones' as any).toCollection().first();
    let currentBusinessId = existingInst?.id;

    if (!existingInst) {
        // Intentamos buscar una institución existente en Supabase antes de inventar una
        // (Esto evita el error de RLS si la institución ya fue creada por un admin)
        const { data: remoteInst } = await supabase.from('instituciones').select('id').limit(1).single();

        if (remoteInst) {
            currentBusinessId = remoteInst.id;
            console.log('Usando institución existente de Supabase:', currentBusinessId);
        } else {
            currentBusinessId = generateUUID();
            console.log('No se encontró institución en Supabase. Creando local (puede fallar sync si hay RLS):', currentBusinessId);
        }

        await db.table('instituciones' as any).add({
            id: currentBusinessId,
            nombre: 'Institución Educativa Demo',
            activo: 1,
            creado_at: new Date().toISOString(),
            sync_status: remoteInst ? 'synced' : 'pending'
        } as any);
    }

    // 2. Asegurar Perfil vinculado a la Institución
    let existingProfile = await db.perfiles.get(userId);
    let perfilId = userId;

    if (!existingProfile) {
        await db.perfiles.add({
            id: perfilId, // USAMOS EL ID REAL DE AUTH
            email: userEmail,
            nombre: 'Admin Demo',
            rol: 'admin',
            activo: 1,
            business_id: currentBusinessId, // FK a institución
            creado_at: new Date().toISOString(),
            actualizado_at: new Date().toISOString(),
            sync_status: 'pending'
        });
        console.log('Perfil creado vinculado a institución con ID real.');
    } else {
        // Aseguramos que el perfil tenga el business_id correcto
        await db.perfiles.update(perfilId, { business_id: currentBusinessId });
    }

    // 3. Crear Programas de Estudio (FK para Pacientes)
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
                nombre: 'Desarrollo de Sistemas',
                activo: 1,
                sync_status: 'pending'
            }
        ] as any);
        console.log('Programas de estudio creados.');
    } else {
        const p = await db.programas_estudio.toCollection().first();
        programaId = p!.id;
    }

    // 4. Crear Pacientes vinculados a Programa y Negocio
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
        console.log('Pacientes creados.');
    } else {
        const p = await db.pacientes.toCollection().first();
        patientId = p!.id;
    }

    // 5. Crear Medicamentos con campo 'anaquel' (Spec requirement)
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
        console.log('Medicamentos creados.');
    } else {
        const m = await db.medicamentos.toCollection().first();
        medId = m!.id;
    }

    // 6. Crear Atenciones (Últimos 3 días) vinculadas a Paciente y Perfil
    const countAtts = await db.atenciones.count();
    if (countAtts === 0 && perfilId) {
        const now = new Date();
        const attentions: Atencion[] = [];
        const movements: MovimientoStock[] = [];

        for (let i = 0; i < 3; i++) {
            const date = new Date();
            date.setDate(now.getDate() - i);
            const dateStr = date.toISOString();

            const attId = generateUUID();
            attentions.push({
                id: attId,
                business_id: currentBusinessId!,
                paciente_id: patientId,
                perfil_id: perfilId,
                fecha_atencion: dateStr,
                motivo_consulta: 'Gripe estacional',
                observacion: 'Reposo sugerido',
                signos_vitales: { temp: '37.5', presion: '120/80', saturacion: '98' },
                activo: 1,
                creado_at: dateStr,
                actualizado_at: dateStr,
                sync_status: 'pending'
            });

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
        console.log('Atenciones y movimientos creados.');
    }

    console.log('--- Seed de Datos Finalizado ---');
    window.location.reload();
}
