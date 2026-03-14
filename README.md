# 🏥 Tópico PWA - Gestión de Enfermerías

Tópico PWA es una solución **Offline-first** diseñada para la gestión eficiente de enfermerías escolares o institucionales. Permite el control de inventario, registro de pacientes, consultas médicas y seguimiento de stock, funcionando incluso sin conexión a internet.

## 🚀 Características Principales

- **Offline-First:** Sincronización bidireccional automática entre Dexie.js (local) y Supabase (nube).
- **Multi-Tenancy (SaaS):** Aislamiento completo de datos por institución (`business_id`).
- **Gestión de Inventario:** Control de stock, alertas de agotamiento y registro de movimientos (Entrada/Salida).
- **Consultas Médicas:** Registro de atenciones, signos vitales (JSONB) y dispensación automática de medicamentos.
- **PWA Ready:** Instalable en dispositivos móviles con soporte para funcionamiento sin red.
- **Dashboard Analítico:** Gráficos de tendencias y resumen de actividades recientes.

## 🛠️ Stack Tecnológico

- **Frontend:** Next.js 15 (App Router), Tailwind CSS.
- **Base de Datos Local (Navegador):** Dexie.js (IndexedDB).
- **Base de Datos Nube & Auth:** Supabase.
- **Iconografía:** Lucide React.
- **Gestor de Paquetes:** Pnpm.

## 📋 Requisitos Previos

1. Nodo.js 18+
2. Pnpm (`npm install -g pnpm`)
3. Proyecto en Supabase con las tablas configuradas según el spec.

## 🔌 Instalación

1. Clona el repositorio:
   ```bash
   git clone [url-del-repo-privado]
   ```
2. Instala las dependencias:
   ```bash
   pnpm install
   ```
3. Configura las variables de entorno (`.env.local`):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
   SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key (solo para admin actions)
   ```
4. Inicia el servidor de desarrollo:
   ```bash
   pnpm dev
   ```

## 🔐 Estructura de Datos (Multi-tenancy)

El proyecto utiliza la **Regla de Oro #1**: Todas las tablas principales (`pacientes`, `medicamentos`, `atenciones`, `perfiles`) contienen un `business_id`. 
Esto permite que un solo despliegue del sistema pueda servir a múltiples instituciones (colegios, empresas) manteniendo la privacidad total de los datos.

## 📄 Licencia

Este es un proyecto privado para uso institucional.
