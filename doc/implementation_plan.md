# 🏥 Plan Integral de Reestructuración - Módulo Atenciones (V2 Mejorado)

Este plan establece una reestructuración profunda de la lógica de Atenciones del sistema Tópico PWA, abordando los problemas actuales de inventario unitario, atenciones simples y registros fragmentados, siguiendo las mejores prácticas de arquitectura SaaS, seguridad y rendimiento offline-first.

## 🔍 **ANÁLISIS DE BASE DE DATOS SUPABASE**

### **Estado Actual Crítico Detectado:**
- ❌ **Seguridad**: RLS policies con `USING (true)` - BYPASS TOTAL DE SEGURIDAD
- ❌ **Performance**: 9 foreign keys sin índices - CONSULTAS LENTAS
- ❌ **Arquitectura**: Múltiples policies permissive - INEFICIENCIA
- ✅ **Datos**: 2 pacientes, 2 medicamentos, 3 atenciones, 3 movimientos

### **Acciones Inmediatas Requeridas:**
1. **Fix RLS Policies** - Implementar filtrado real por `business_id`
2. **Add Indexes** - Optimizar todas las foreign keys
3. **Consolidate Policies** - Eliminar duplicados por rol/acción

---

## 🎯 **ESTRATEGIA DE IMPLEMENTACIÓN POR FASES**

### **FASE 1: FUNDAMENTOS Y SEGURIDAD (Backend-First)**
**Objetivo:** Establecer bases seguras antes de modificar lógica de negocio

#### **🔒 1.1 Seguridad Crítica - Supabase**
- [x] **FIX RLS Policies** - Reemplazar `USING (true)` con `business_id = auth.uid()`
- [x] **Add Performance Indexes** - Crear índices para todas las foreign keys
- [x] **Consolidate Policies** - Unificar múltiples policies por rol/acción
- [x] **Enable Leaked Password Protection** - Activar seguridad de contraseñas

#### **📊 1.2 Evolución de Tipos TypeScript**
- [x] **Modificar `Medicamento` interface** para soporte multi-medida:
  ```typescript
  tipo_medida: 'UNIDAD' | 'VOLUMEN_ML' | 'PESO_MG' | 'PORCENTAJE'
  presentacion?: string // "Caja x 20", "Frasco 500ml"
  ```

- [x] **Crear nuevos tipos de dispensación**:
  ```typescript
  interface DispensacionMedicamento {
    medicamento_id: string;
    cantidad: number;
    tipo_medida: 'UNIDAD' | 'VOLUMEN_ML' | 'PESO_MG' | 'PORCENTAJE';
    presentacion_entregada?: string;
  }
  ```

- [x] **Extender `MovimientoStock`** con agrupación:
  ```typescript
  tipo_medida: 'UNIDAD' | 'VOLUMEN_ML' | 'PESO_MG' | 'PORCENTAJE';
  descripcion_movimiento?: string; // "Atención: 2 Unid. Paracetamol"
  ```

#### **🗄️ 1.3 Migración de Base de Datos (SQL)** ✅ COMPLETADO
- [x] **ALTER TABLE medicamentos** con validaciones CHECK - Tipo ENUM creado, columnas tipo_medida/presentacion agregadas
- [x] **ALTER TABLE movimientos_stock** para soporte de descripciones - Columnas tipo_medida/descripcion_movimiento agregadas
- [x] **Migración de datos existentes** (default 'UNIDAD') - 2 medicamentos y 3 movimientos actualizados
- [x] **Índices optimizados** para consultas de stock por tipo - 4 índices creados para performance

#### **⚙️ 1.4 Actualización de Lógica Core** ✅ COMPLETADO
- [x] **Modificar `stock.ts`** con validaciones de tipo_medida - `validarTipoMedida()`, `validarCantidad()`, `validarStockSuficiente()`
- [x] **Implementar validaciones cruzadas** - `validarCompatibilidadTipoMedida()` verifica `medicamento.tipo_medida === movimiento.tipo_medida`
- [x] **Agregar manejo de errores específicos** - `StockError` class con códigos: STOCK_INSUFICIENTE, TIPO_MEDIDA_INVALIDO, INCOMPATIBILIDAD_TIPO, MEDICAMENTO_NO_ENCONTRADO, CANTIDAD_INVALIDA

---

### **FASE 2: LÓGICA DE NEGOCIO TRANSACCIONAL**
**Objetivo:** Implementar nueva lógica de dispensación con garantías ACID

#### **💼 2.1 Refactorización de `registrarAtencion`** ✅ COMPLETADO
- [x] **Transacción atómica** - `db.transaction('rw', ...)` con Dexie garantiza ACID
- [x] **Validación de stock** antes de la transacción - FASE 1 valida stock y tipos ANTES de iniciar transacción
- [x] **Rollback automático** - Dexie maneja rollback automático si falla cualquier operación dentro de la transacción
- [x] **Generación de descripciones consolidadas** - `generarDescripcionMovimiento()` crea descripciones como "Atención: 2unid. Paracetamol, 5ml Alcohol"

#### **🔄 2.2 Sistema de Agrupación Inteligente** ✅ COMPLETADO
- [x] **`agruparDispensacionesPorMedicamento()`** - Agrupa por ID, suma cantidades: 2 pastillas + 1 pastilla = 3 pastillas
- [x] **`agruparDispensacionesPorTipoMedida()`** - Separa por categoría: UNIDAD, VOLUMEN_ML, PESO_MG, PORCENTAJE
- [x] **`generarDescripcionMovimiento()`** - Crea descripciones consolidadas: "Atención: 3unid. Paracetamol, 5ml Alcohol"
- [x] **`generarResumenPorTipoMedida()`** - Genera resúmenes por tipo: "3unid. (Paracetamol) | 5ml (Alcohol)"

#### **✅ 2.3 Validaciones de Negocio** ✅ COMPLETADO
- [x] **Stock suficiente por tipo de medida** - `validarStockSuficiente()` verifica stock antes de dispensar
- [x] **Compatibilidad medicamento-dispensación** - `validarCompatibilidadTipoMedida()` valida que tipos coincidan
- [x] **Límites de dispensación** - `validarLimiteDispensacion()` con límites por defecto: UNIDAD(50), VOLUMEN_ML(500), PESO_MG(1000), PORCENTAJE(100)

---

### **FASE 3: INTERFAZ DE USUARIO MODERNA (UX-First)**
**Objetivo:** Implementar UI intuitiva que distinga visualmente tipos de medida

#### **🎨 3.1 Componente `MedicineDispenser`** ✅ COMPLETADO
- [x] **Tarjetas visuales** - 4 tipos de tarjetas con colores distintivos: 💊 Azul (UNIDAD), 🧪 Cyan (VOLUMEN_ML), ⚖️ Ámbar (PESO_MG), 📊 Púrpura (PORCENTAJE)
- [x] **Indicadores de stock** - Barras de progreso con alertas de stock bajo (rojo < mínimo)
- [x] **Selección múltiple** - Selección visual con controles +/- y remoción
- [x] **Previsualización de dispensación** - Resumen consolidado con totales por tipo

#### **👁️ 3.2 Sistema de Presentación Visual** ✅ COMPLETADO
- [x] **Visualización por tipo** - Cada tipo tiene icono, color y unidad específica:
  - 💊 **UNIDAD**: Icono Pill, azul, unid. (pastillas, cápsulas)
  - 🧪 **VOLUMEN_ML**: Icono Droplets, cyan, ml (jarabes, soluciones)
  - ⚖️ **PESO_MG**: Icono Scale, ámbar, mg (polvos, cremas)
  - 📊 **PORCENTAJE**: Icono Percent, púrpura, % (alcohol, antisépticos)

#### **⚡ 3.3 Validaciones en UI** ✅ COMPLETADO
- [x] **Feedback inmediato** - Stock insuficiente muestra barra roja y "Stock bajo" en tarjeta
- [x] **Límites de dispensación** - Validación en tiempo real con `validarLimiteDispensacion()`
- [x] **Preview de dispensación** - Resumen visual antes de guardar con totales por tipo

---

### **FASE 4: INTEGRACIÓN Y TESTING (Quality-First)**
**Objetivo:** Asegurar robustez offline/online y consistencia de datos

#### **🧪 4.1 Testing de Escenarios Críticos** ✅ COMPLETADO - **32 TESTS PASANDO**
- [x] **Suite de tests unitarios** - `stock.test.ts` con **32 tests** cubriendo:
  - ✅ Validación de tipos de medida (4 tipos válidos, 1 inválido)
  - ✅ Validación de cantidades (positivas, cero, negativas, NaN, Infinity)
  - ✅ Compatibilidad cruzada medicamento-dispensación (8 escenarios)
  - ✅ Stock suficiente vs insuficiente (ENTRADA vs SALIDA)
  - ✅ Límites de dispensación por tipo (50, 500, 1000, 100) + personalizados
  - ✅ Agrupación inteligente por medicamento (suma cantidades)
  - ✅ Agrupación por tipo de medida (4 categorías)
  - ✅ Generación de descripciones consolidadas (con/sin duplicados)
  - ✅ Generación de resúmenes por tipo
  - ✅ Escenarios críticos: múltiples dispensaciones, tipos mixtos, validación en cascada
- [x] **Configuración Vitest** - `vitest.config.ts` con coverage y jsdom
- [x] **Scripts de testing** - `npm test`, `npm run test:coverage`, `npm run test:ui`
- [x] **Resultado**: `Test Files 1 passed (1) | Tests 32 passed (32) | Duration 1.65s`

#### **⚡ 4.2 Performance y Optimización** ✅ COMPLETADO
- [x] **Índices Dexie** - `db.version(14)` con índices optimizados:
  - `medicamentos`: `[business_id+tipo_medida]`, `[business_id+stock_actual]`
  - `movimientos_stock`: `[business_id+medicamento_id]`, `[business_id+atencion_id]`, `[medicamento_id+fecha_movimiento]`
- [x] **Caching inteligente** - `useMedicamentosCache.ts` con:
  - LRU Cache en memoria (50 medicamentos, TTL 5 minutos)
  - Persistencia de estadísticas en localStorage
  - Precarga predictiva de medicamentos frecuentes
  - Tracking de dispensaciones para análisis de uso
  - **15 tests pasando** para el sistema de caché
- [x] **Lazy loading** - `useLazyMovimientos.ts` con:
  - Paginación automática (20 items/página)
  - Caché de páginas visitadas (5 páginas)
  - Scroll infinito con IntersectionObserver
  - Filtrado por medicamento, atención, tipo y fechas

#### **🔒 4.3 Seguridad y Validación** ✅ COMPLETADO
- [x] **Sanitización de inputs** - `security.ts` con:
  - `sanitizeString()`: Elimina HTML, escapa caracteres especiales, limita a 1000 chars
  - `sanitizeCantidad()`: Valida números según tipo_medida (UNIDAD=enteros, VOLUMEN_ML=1 decimal)
  - `sanitizeId()`: Valida UUIDs y strings alfanuméricos
  - `sanitizeDescription()`: Elimina scripts y event handlers
  - **39 tests pasando** para sanitización
- [x] **Validación de permisos** - Sistema RBAC con:
  - Roles: `admin` (todos los permisos), `personal` (dispensar solo)
  - Límites por tipo: UNIDAD(50), VOLUMEN_ML(500), PESO_MG(1000), PORCENTAJE(100)
  - `requiereAutorizacion`: Porcentajes siempre requieren autorización
  - Rate limiting: Máximo 10 requests/minuto por usuario
- [x] **Audit trail** - `audit.ts` con:
  - Tabla `security_audit_log` en Dexie (v14) + índices
  - Registro de dispensaciones: quién, qué, cuándo, cuánto, stock antes/después
  - Registro de errores: stock insuficiente, permisos denegados, validaciones
  - Sincronización automática con Supabase (30s intervalo)
  - Limpieza automática: retención 90 días, máximo 1000 registros locales
  - Reportes por usuario: actividad, top medicamentos, errores

---

## 🔧 **MEJORES PRÁCTICAS DE PROGRAMACIÓN**

### **🏗️ Principios de Arquitectura**
1. **SOLID**: Single Responsibility en cada componente
2. **Clean Architecture**: Dependencias hacia adentro
3. **Domain-Driven Design**: Lógica de negocio en features
4. **Offline-First**: Resiliencia ante pérdida de conexión

### **🔐 Seguridad Implementada**
1. **Multi-tenancy**: Filtrado obligatorio por `business_id`
2. **Input Validation**: Zod schemas para todos los formularios
3. **Type Safety**: TypeScript strict mode
4. **SQL Injection Prevention**: Parámetros en Supabase

### **⚡ Performance Optimizado**
1. **IndexedDB Indexing**: Índices compuestos para queries frecuentes
2. **React.memo**: Memoización de componentes costosos
3. **Code Splitting**: Lazy loading de módulos pesados
4. **Debouncing**: Búsquedas con retraso controlado

### **🛠️ Calidad y Mantenimiento**
1. **Error Boundaries**: Manejo elegante de errores
2. **Logging Structured**: Logs contextuales para debugging
3. **Type Guards**: Validaciones en runtime
4. **Documentation**: JSDoc completo en funciones críticas

---

## 🚀 **ESTRATEGIA DE DESPLIEGUE**

### **📈 Rollout Gradual**
1. **Feature Flags**: Activar nueva lógica por institución
2. **A/B Testing**: Comparar rendimientos
3. **Monitorización**: Métricas de error y performance
4. **Rollback Plan**: Reversión automática si falla

### **💾 Migración de Datos**
1. **Data Backup**: Respaldar estado actual
2. **Schema Migration**: ALTER TABLEs con defaults seguros
3. **Data Validation**: Verificar consistencia post-migración
4. **Performance Testing**: Benchmark de queries nuevos

---

## 📊 **MÉTRICAS DE ÉXITO**

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

## 🔄 **CICLO DE VIDA DE DESARROLLO**

### **📅 Sprints de 2 Semanas**
- **Sprint 1**: FASE 1 (Seguridad + Tipos + BD)
- **Sprint 2**: FASE 2 (Lógica de negocio)
- **Sprint 3**: FASE 3 (UI/UX)
- **Sprint 4**: FASE 4 (Testing y optimización)

### **👥 Code Review Process**
1. **Peer Review**: Mínimo 2 desarrolladores senior
2. **Automated Testing**: Unit + Integration + E2E
3. **Security Review**: Validación de vulnerabilidades
4. **Performance Review**: Análisis de impacto

---

## 📝 **PRÓXIMOS PASOS**

### **⚡ Inmediato (Esta Semana)**
1. [ ] **Setup de ambiente de desarrollo**
2. [ ] **Backup de base de datos actual**
3. [ ] **Creación de branch feature/atenciones-v2**
4. [ ] **Setup de testing framework**
5. [ ] **FIX CRÍTICO: RLS Policies inmediato**

### **🎯 Corto Plazo (Próximas 2 Semanas)**
1. [ ] **Implementación FASE 1** completa
2. [ ] **Testing unitario** de nuevos tipos
3. [ ] **Documentación técnica** actualizada
4. [ ] **Demo interna** para stakeholders

### **🚀 Mediano Plazo (Próximo Mes)**
1. [ ] **Completar FASES 2-3**
2. [ ] **Testing de integración** completo
3. [ ] **User acceptance testing**
4. [ ] **Despliegue a producción**

---

## 🎯 **RESULTADO FINAL ESPERADO**

### **🔄 Transformación Completa**
- **Lógica Mixta**: Pastillas (unidades) + Líquidos (ml) + Insumos (varios)
- **Atenciones Verdaderamente Múltiples**: Lista completa de medicamentos
- **Movimientos Consolidados**: "Atención: 2 Unid. Paracetamol, 5ml Alcohol"
- **Experiencia Intuitiva**: UI clara que guía al usuario

### **💡 Impacto en el Negocio**
- **Reducción de errores**: 90% menos de descuadres de stock
- **Eficiencia operativa**: 50% más rápido el registro de atenciones
- **Satisfacción del usuario**: Experiencia moderna y confiable
- **Escalabilidad**: Soporte para múltiples instituciones sin cambios

---

## 🚨 **CRITICAL PATH - ACCIONES INMEDIATAS**

### **🔥 PRIORIDAD 1: Seguridad (HOY)**
```sql
-- FIX RLS Policies CRÍTICO
CREATE POLICY "Acceso por institucion" ON public.atenciones
FOR ALL USING (business_id = auth.uid());

-- Add Performance Indexes
CREATE INDEX idx_atenciones_business_id ON public.atenciones(business_id);
CREATE INDEX idx_movimientos_stock_business_id ON public.movimientos_stock(business_id);
```

### **⚡ PRIORIDAD 2: Tipos (MAÑANA)**
- [ ] Actualizar interfaces TypeScript
- [ ] Implementar validaciones de tipo_medida
- [ ] Testear compatibilidad con código existente

### **🎯 PRIORIDAD 3: Testing (ESTA SEMANA)**
- [ ] Setup de Jest + Testing Library
- [ ] Tests unitarios para nuevos tipos
- [ ] Tests de integración para lógica de stock

---

## 📋 **VERIFICATION PLAN**

### **Build Check (TypeScript)**
```powershell
# Desde c:\MisProyectosWeb\topico-pwa
npx tsc --noEmit
```
Debe completar sin errores.

### **Dev Server**
```powershell
npm run dev
```
Navegar a `http://localhost:3000` y verificar que el dashboard, la página de pacientes y el módulo de inventario cargan sin errores en consola.

### **Manual — módulo pacientes**
1. Abrir la página de pacientes
2. Crear un paciente nuevo con DNI único → debe guardarse en Dexie correctamente
3. Intentar crear otro paciente con el mismo DNI → debe mostrar error "Ya existe un paciente con este DNI"
4. Editar un paciente → se actualiza el registro
5. Eliminar un paciente → soft delete (activo: false, no aparece en lista)

### **Manual — módulo atenciones (NUEVO)**
1. Abrir nueva atención
2. Seleccionar paciente existente
3. Agregar múltiples medicamentos con diferentes tipos de medida
4. Verificar stock actualizado correctamente
5. Confirmar movimiento consolidado en historial

### **Security Check (CRÍTICO)**
```sql
-- Verificar RLS policies funcionando
SELECT * FROM pg_policies WHERE tablename = 'atenciones';

-- Verificar índices de performance
EXPLAIN ANALYZE SELECT * FROM atenciones WHERE business_id = 'test-id';
```

---

*Este plan está diseñado para ser ejecutable por fases con tracking detallado de cada tarea, minimizando riesgos y maximizando valor en cada iteración.*
