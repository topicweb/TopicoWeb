# 🏥 Sistema de Tópico Institucional - Especificación Senior (SaaS & Offline-First)

Este documento es la ÚNICA fuente de verdad. Ignorar arquitecturas previas y patrones "Enterprise" innecesarios.

## 🛠️ 1. Arquitectura de Carpetas Estricta (Bajo src/)
- `app/`: SOLO RUTAS Y LAYOUTS (Next.js 16 App Router).
- `core/`: MOTOR (db/dexie, supabase/client, providers/auth, services/sync).
- `features/`: LÓGICA DE NEGOCIO (pacientes, inventario, atenciones). Cada uno con sus `components/`, `hooks/` y `types.ts`.
- `shared/`: REUTILIZABLE (Shadcn, hooks genéricos, utils).

## 🔑 2. Reglas de Oro: SaaS & Datos
1. **Multi-tenancy:** Filtrado obligatorio por `business_id` en toda consulta (Supabase/Dexie).
2. **Contexto:** `business_id` se extrae del perfil del usuario tras login (AuthContext).
3. **Flexibilidad JSONB:** 
   - `pacientes.metadata`: Ciclo, Año ingreso, etc. (No crear columnas extras).
   - `atenciones.signos_vitales`: Presión, Temp, Saturación.
4. **Inventario:** Incluir `unidad_medida` y `anaquel` (ubicación física).

## 🗄️ 3. Esquema SQL Real (Supabase)
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.atenciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  paciente_id uuid NOT NULL,
  perfil_id uuid NOT NULL,
  motivo_consulta text NOT NULL,
  signos_vitales jsonb DEFAULT '{"temp": "", "presion": "", "saturacion": ""}'::jsonb,
  observacion text,
  fecha_atencion timestamp with time zone DEFAULT now(),
  activo boolean DEFAULT true,
  CONSTRAINT atenciones_pkey PRIMARY KEY (id),
  CONSTRAINT atenciones_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES public.pacientes(id),
  CONSTRAINT atenciones_perfil_id_fkey FOREIGN KEY (perfil_id) REFERENCES public.perfiles(id),
  CONSTRAINT atenciones_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.instituciones(id)
);
CREATE TABLE public.instituciones (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  ruc text UNIQUE,
  activo boolean DEFAULT true,
  creado_at timestamp with time zone DEFAULT now(),
  CONSTRAINT instituciones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.medicamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  unidad_medida text DEFAULT 'unidad'::text,
  anaquel text,
  stock_actual integer DEFAULT 0,
  stock_minimo integer DEFAULT 5,
  imagen_url text,
  activo boolean DEFAULT true,
  creado_at timestamp with time zone DEFAULT now(),
  CONSTRAINT medicamentos_pkey PRIMARY KEY (id),
  CONSTRAINT medicamentos_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.instituciones(id)
);
CREATE TABLE public.movimientos_stock (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  medicamento_id uuid NOT NULL,
  atencion_id uuid,
  tipo text CHECK (tipo = ANY (ARRAY['ENTRADA'::text, 'SALIDA'::text])),
  cantidad integer NOT NULL,
  fecha_movimiento timestamp with time zone DEFAULT now(),
  CONSTRAINT movimientos_stock_pkey PRIMARY KEY (id),
  CONSTRAINT movimientos_stock_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.instituciones(id),
  CONSTRAINT movimientos_stock_medicamento_id_fkey FOREIGN KEY (medicamento_id) REFERENCES public.medicamentos(id),
  CONSTRAINT movimientos_stock_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES public.atenciones(id)
);
CREATE TABLE public.pacientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  dni text NOT NULL,
  nombres text NOT NULL,
  apellidos text NOT NULL,
  sexo text CHECK (sexo = ANY (ARRAY['M'::text, 'F'::text])),
  categoria text NOT NULL CHECK (categoria = ANY (ARRAY['estudiante'::text, 'docente'::text, 'administrativo'::text, 'limpieza'::text])),
  programa_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  creado_at timestamp with time zone DEFAULT now(),
  activo boolean DEFAULT true,
  CONSTRAINT pacientes_pkey PRIMARY KEY (id),
  CONSTRAINT pacientes_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.instituciones(id),
  CONSTRAINT pacientes_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES public.programas_estudio(id)
);
CREATE TABLE public.perfiles (
  id uuid NOT NULL,
  nombre text,
  email text NOT NULL UNIQUE,
  rol USER-DEFINED DEFAULT 'admin'::rol_usuario,
  activo boolean DEFAULT true,
  creado_at timestamp with time zone DEFAULT now(),
  actualizado_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  business_id uuid,
  CONSTRAINT perfiles_pkey PRIMARY KEY (id),
  CONSTRAINT perfiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT perfiles_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.instituciones(id)
);
CREATE TABLE public.programas_estudio (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_id uuid,
  nombre text NOT NULL,
  activo boolean DEFAULT true,
  CONSTRAINT programas_estudio_pkey PRIMARY KEY (id),
  CONSTRAINT programas_estudio_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.instituciones(id)
);

## 🟦 4. Flujo de Datos
- **Escritura:** UI -> Hook (useFeature) -> Dexie (Local) -> SyncService -> Supabase.
- **Stock:** Descuento automático vía SQL Trigger en Supabase al insertar en `movimientos_stock`.
## 🎨 5. Interfaz
- Mobile-first, botones grandes (Tablet ready), Shadcn/UI, Lucide Icons.

##  6  Acerca del proyecto casos de uso 
- Este proyecto es una aplicación web progresiva (PWA) que permite gestionar el tópico de una institución educativa.
- La aplicación permite gestionar pacientes, atenciones, medicamentos y movimientos de stock.
- ### 🟢 1. Autenticación y Acceso

**Actor:** Administrador / Personal de Salud
**Flujo:**

- **Inicio de Sesión:** El usuario ingresa credenciales (requiere internet la primera vez para validar contra Supabase).
- **Persistencia Local:** El sistema almacena el perfil y el rol en **Dexie** para permitir el acceso posterior sin conexión.
- **Validación de Sesión:** Al abrir la app, se verifica el token local; si es válido, permite entrar directo al Dashboard.
- **Cierre de Sesión:** Limpieza de datos sensibles en IndexedDB y redirección al Login.

---

### 🔵 2. Gestión de Usuarios y Roles (Solo Admin)

**Actor:** Administrador
**Flujo:**

- **Registro de Personal:** Crear nuevos perfiles (Nombre, Email, Rol).
- **Asignación de Roles:** Definir si el usuario es `Admin` (gestión total) o `Personal` (solo registro de atenciones).
- **Control de Estado:** Activar o desactivar usuarios para restringir el acceso al sistema.

---

### 🟠 3. Registro y Gestión de Pacientes

**Actor:** Personal de Salud / Administrador
**Flujo:**

- **Búsqueda Rápida:** Ingresar DNI para verificar si el paciente ya existe en la base de datos local.
- **Registro Nuevo:** Si no existe, completar datos (Nombres, Apellidos, Tipo de usuario, Programa de estudio).
- **Modo Offline:** El paciente se guarda en **Dexie** con estado `pending`.
- **Sincronización:** Al detectar red, el registro se sube a Supabase automáticamente.

---

### 🔴 4. Atención Médica y Consultas

**Actor:** Personal de Salud
**Flujo:**

- **Apertura de Atención:** Seleccionar un paciente y crear una nueva ficha de consulta.
- **Registro de Datos:** Ingresar motivo de consulta, observaciones y diagnóstico.
- **Dispensación de Medicamentos:** Seleccionar medicamentos del inventario local.
- **Vinculación:** La atención genera automáticamente un **Movimiento de Stock** de tipo "Salida".
- **Registro Temporal:** La atención se marca como `pending` hasta que haya conexión.

---

### 📦 5. Gestión de Inventario (Kardex)

**Actor:** Administrador
**Flujo:**

- **Carga de Medicamentos:** Registrar nuevos productos (Nombre, stock mínimo, tipo).
- **Entrada de Stock:** Registrar ingresos manuales (compras/donaciones) especificando cantidad y fecha de vencimiento.
- **Cálculo de Stock Real:** El sistema suma entradas y resta salidas (atenciones) para mostrar el stock actual.
- **Alertas de Stock:** Visualización de productos que están por debajo del mínimo establecido.

---

### 🔄 6. Sincronización de Datos (Caso General)

**Actor:** Sistema (Automático)
**Flujo:**

- **Detección de Conexión:** El `NetworkProvider` escucha cambios en el estado del internet.
- **Subida (Push):** Se recorre la `sync_queue` enviando registros pendientes a Supabase en orden cronológico.
- **Bajada (Pull):** Se descargan nuevos pacientes o medicamentos creados por otros usuarios desde la última actualización.
- **Resolución de Conflictos:** En caso de ediciones simultáneas, prevalece el último cambio realizado (Last Write Wins).

