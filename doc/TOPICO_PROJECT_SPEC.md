# 🏥 Topico PWA - Sistema de Gestión de Tópico Médico

## 📋 **Especificación Técnica Actualizada (Abril 2026)**

### **🎯 Visión General**
Sistema PWA offline-first para gestión de tópicos médicos en instituciones educativas, soportando atención médica, inventario de medicamentos y seguimiento de pacientes con arquitectura multi-tenant.

---

## 🏗️ **ARQUITECTURA TÉCNICA**

### **📱 Stack Tecnológico**
- **Frontend**: Next.js 16 (App Router) + TypeScript + React 18
- **UI**: Shadcn/UI + TailwindCSS + Lucide Icons + Framer Motion
- **Base de Datos**: Supabase (PostgreSQL 17) + Dexie (IndexedDB)
- **Estado**: React Context + Hooks personalizados
- **PWA**: Service Workers + Offline-first strategy

### **� Arquitectura Multi-tenant**
- **Filtrado por `business_id`**: Cada institución solo ve sus datos
- **RLS Policies**: Seguridad a nivel de base de datos con validación real
- **Perfiles**: `admin` (gestión completa) y `personal` (operaciones médicas)
- **Validación**: Triggers y constraints para integridad de datos

---

## 📊 **ESTRUCTURA DE DATOS ACTUALIZADA**

### **🏢 Instituciones**
```sql
CREATE TABLE public.instituciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  ruc text UNIQUE,
  activo boolean DEFAULT true,
  creado_at timestamptz DEFAULT now()
);
```

### **👥 Perfiles (Usuarios)**
```sql
CREATE TABLE public.perfiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.instituciones(id),
  nombre text,
  email text UNIQUE,
  rol rol_usuario DEFAULT 'admin',
  activo boolean DEFAULT true,
  creado_at timestamptz DEFAULT now()
);
```

### **👨‍⚕️ Pacientes**
```sql
CREATE TABLE public.pacientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.instituciones(id),
  dni text NOT NULL,
  nombres text NOT NULL,
  apellidos text NOT NULL,
  sexo text CHECK (sexo IN ('M', 'F')),
  categoria text CHECK (categoria IN ('estudiante', 'docente', 'administrativo', 'limpieza')),
  programa_id uuid REFERENCES public.programas_estudio(id),
  metadata jsonb DEFAULT '{}',
  activo boolean DEFAULT true,
  creado_at timestamptz DEFAULT now()
);
```

### **📚 Programas de Estudio**
```sql
CREATE TABLE public.programas_estudio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.instituciones(id),
  nombre text NOT NULL,
  activo boolean DEFAULT true
);
```

### **💊 Medicamentos (Actualizado con Soporte Multi-Medida)**
```sql
CREATE TABLE public.medicamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.instituciones(id),
  nombre text NOT NULL,
  descripcion text,
  unidad_medida text DEFAULT 'unidad',
  tipo_medida text CHECK (tipo_medida IN ('UNIDAD', 'VOLUMEN_ML', 'PESO_MG', 'PORCENTAJE')),
  presentacion text, -- "Caja x 20", "Frasco 500ml"
  anaquel text, -- "Anaquel A-3"
  stock_actual integer DEFAULT 0,
  stock_minimo integer DEFAULT 5,
  imagen_url text,
  activo boolean DEFAULT true,
  creado_at timestamptz DEFAULT now()
);
```

### **🏥 Atenciones (Actualizado con Soporte Múltiple)**
```sql
CREATE TABLE public.atenciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.instituciones(id),
  paciente_id uuid REFERENCES public.pacientes(id),
  perfil_id uuid REFERENCES public.perfiles(id),
  motivo_consulta text NOT NULL,
  signos_vitales jsonb DEFAULT '{"temp": "", "presion": "", "saturacion": ""}',
  observacion text,
  fecha_atencion timestamptz DEFAULT now(),
  activo boolean DEFAULT true
);
```

### **📦 Movimientos de Stock (Actualizado con Agrupación)**
```sql
CREATE TABLE public.movimientos_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.instituciones(id),
  medicamento_id uuid REFERENCES public.medicamentos(id),
  atencion_id uuid REFERENCES public.atenciones(id),
  tipo text CHECK (tipo IN ('ENTRADA', 'SALIDA')),
  cantidad integer NOT NULL,
  tipo_medida text CHECK (tipo_medida IN ('UNIDAD', 'VOLUMEN_ML', 'PESO_MG', 'PORCENTAJE')),
  descripcion_movimiento text, -- "Atención: 2 Unid. Paracetamol, 5ml Alcohol"
  fecha_movimiento timestamptz DEFAULT now()
);
```

---

## 🔄 **ESTRATEGIA OFFLINE-FIRST**

### **💾 Arquitectura Dual Storage**
- **Local (Dexie/IndexedDB)**: Operaciones inmediatas, cache completo
- **Remoto (Supabase)**: Sincronización automática, source of truth

### **🔄 Ciclo de Sincronización**
- **Detección de Conexión:** El `NetworkProvider` escucha cambios en el estado del internet.
- **Subida (Push):** Se recorre la `sync_queue` enviando registros pendientes a Supabase en orden cronológico.
- **Bajada (Pull):** Se descargan nuevos pacientes o medicamentos creados por otros usuarios desde la última actualización.
- **Resolución de Conflictos:** En caso de ediciones simultáneas, prevalece el último cambio realizado (Last Write Wins).

### **📊 Estados de Sincronización**
- **`sync_status: 'synced'`**: Datos iguales en local y remoto
- **`sync_status: 'pending'`**: Cambios locales pendientes de subir
- **`sync_status: 'failed'`**: Error en sincronización (reintentar automáticamente)

---

## 🎯 **MÓDULOS PRINCIPALES**

### **👨‍⚕️ Atenciones (Refactorizado en Progreso)**
- **Estado Actual**: Soporta atención simple con un medicamento
- **Mejoras en Progreso**:
  - ✅ **Tipos multi-medida**: UNIDAD | VOLUMEN_ML | PESO_MG | PORCENTAJE
  - ✅ **Atenciones múltiples**: Lista de medicamentos por atención
  - ✅ **Movimientos consolidados**: Agrupación inteligente
  - 🔄 **UI mejorada**: Componente `MedicineDispenser` con selección múltiple

### **💊 Inventario**
- **Gestión de medicamentos**: CRUD completo con control de stock
- **Movimientos automáticos**: Actualización de stock en atenciones
- **Alertas de stock**: Notificaciones cuando stock < stock_minimo
- **Multi-medida**: Soporte para pastillas (unidades) y líquidos (ml)

### **👥 Pacientes**
- **Gestión completa**: CRUD con validación de DNI único
- **Programas educativos**: Asociación a carreras/grados
- **Historial médico**: Registro de todas las atenciones
- **Metadata flexible**: JSONB para datos adicionales

### **📊 Dashboard**
- **Estadísticas en tiempo real**: Atenciones por período, stock crítico
- **Gráficos interactivos**: Recharts para visualización de datos
- **Alertas contextuales**: Medicamentos bajos, pacientes frecuentes
- **Responsive design**: Optimizado para móviles y desktop

---

## 🔧 **ESTRUCTURA DE CARPETAS CANÓNICA**

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Layout dashboard
│   ├── auth/              # Páginas de autenticación
│   └── globals.css
├── components/             # UI reutilizables
├── features/              # Módulos de negocio
│   ├── atenciones/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   ├── inventario/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types/
│   └── pacientes/
│       ├── components/
│       ├── hooks/
│       └── types/
├── core/                  # Lógica centralizada
│   ├── db/
│   │   └── dexie/
│   └── providers/
└── shared/               # Utilidades compartidas
    └── hooks/
```

---

## 🔒 **SEGURIDAD IMPLEMENTADA**

### **�️ Row Level Security (RLS)**
- **Políticas activas**: Todas las tablas con RLS habilitado
- **Filtrado real**: `business_id = (SELECT business_id FROM perfiles WHERE id = auth.uid())`
- **Optimizaciones**: `(select auth.uid())` para mejor performance
- **Sin recursión**: Políticas limpias sin bucles infinitos

### **🔐 Validaciones**
- **Input sanitization**: Zod schemas para todos los formularios
- **Type safety**: TypeScript strict mode
- **SQL injection prevention**: Parámetros en todas las queries
- **Audit trail**: Tabla `security_audit_log` para tracking

---

## 📱 **CARACTERÍSTICAS PWA**

### **📥 Instalación**
- **Service Worker**: Cache estratégico de recursos
- **Manifest.json**: Configuración de app instalable
- **Offline functionality**: Operaciones completas sin conexión

### **⚡ Performance**
- **Lazy loading**: Componentes bajo demanda
- **Code splitting**: Bundles optimizados
- **IndexedDB indexing**: Consultas locales rápidas
- **Debouncing**: Búsquedas con retraso controlado

---

## � **ESTADO ACTUAL DEL PROYECTO**

### **✅ Completado**
- **Arquitectura base**: Estructura canónica implementada
- **Multi-tenancy**: Seguridad por institución funcionando
- **Offline-first**: Sincronización bidireccional activa
- **Módulos básicos**: Pacientes, Inventario, Dashboard operativos

### **🔄 En Progreso (Reestructuración Atenciones)**
- **FASE 1.1 ✅**: Seguridad crítica de Supabase corregida
- **FASE 1.2 ✅**: Tipos TypeScript multi-medida implementados
- **FASE 1.3 🔄**: Migración de base de datos SQL
- **FASE 1.4 ⏳**: Lógica core de inventario actualizada

### **🎯 Próximos Hitos**
- **Atenciones múltiples**: Dispensar varios medicamentos por atención
- **Movimientos consolidados**: Agrupación inteligente de stock
- **UI mejorada**: Componente `MedicineDispenser` con selección múltiple
- **Testing completo**: Unit + Integration + E2E

---

## � **MÉTRICAS DE ÉXITO**

### **🎯 KPIs Técnicos**
- **Build Time**: < 30 segundos en producción
- **Bundle Size**: < 2MB comprimido
- **First Contentful Paint**: < 1.5s
- **Sync Success Rate**: > 99.5%

### **💼 KPIs de Negocio**
- **Error Rate**: < 0.1% en dispensaciones
- **Stock Accuracy**: 100% consistencia offline/online
- **User Satisfaction**: > 4.5/5 en experiencia
- **Training Time**: < 15 minutos para nuevos usuarios

---

*Última actualización: Abril 2026 - Reestructuración de Atenciones en progreso*

