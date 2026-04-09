# 🏥 Plan Integral de Reestructuración - Módulo Atenciones

Este plan establece una reestructuración profunda de la lógica de Atenciones del sistema Tópico PWA, abordando los problemas actuales de inventario unitario, atenciones simples y registros fragmentados, siguiendo las mejores prácticas de arquitectura SaaS, seguridad y rendimiento offline-first.

## 🎯 **ANÁLISIS DE ESTADO ACTUAL Y CONTEXTO**

### **Arquitectura Actual Identificada:**
- **PWA con Next.js 16** y arquitectura limpia (app/core/features/shared)
- **Multi-tenancy** por `business_id` con filtrado automático
- **Offline-first** con Dexie (IndexedDB) + Supabase (sync)
- **Patrón canónico**: `useDexieCrud` para operaciones CRUD
- **Estructura de features**: 3 carpetas (components/hooks/types)

### **Problemas Críticos Detectados:**
1. **Lógica de Inventario Unitaria**: Todo descuenta por `cantidad` numérica sin distinción de unidades vs volumen
2. **Atenciones Semi-Múltiples**: Permite varios medicamentos PERO genera movimientos individuales
3. **Movimientos Fragmentados**: Cada medicamento crea su propio registro `movimientos_stock`
4. **Sin Validación de Tipos**: No se distingue entre pastillas (unidades) y líquidos (ml/volumen)

---

## 📋 **PLAN DE IMPLEMENTACIÓN POR FASES**

### **FASE 1: FUNDAMENTOS Y TIPOS (Backend-First)**
**Objetivo:** Establecer las bases estructurales seguras antes de modificar la UI

#### **1.1 Evolución de Tipos TypeScript**
- **Modificar `Medicamento` interface** para soporte multi-medida:
  ```typescript
  tipo_medida: 'UNIDAD' | 'VOLUMEN_ML' | 'PESO_MG' | 'PORCENTAJE'
  presentacion?: string // "Caja x 20", "Frasco 500ml"
  ```

- **Crear nuevos tipos de dispensación**:
  ```typescript
  interface DispensacionMedicamento {
    medicamento_id: string;
    cantidad: number;
    tipo_medida: 'UNIDAD' | 'VOLUMEN_ML' | 'PESO_MG' | 'PORCENTAJE';
    presentacion_entregada?: string;
  }
  ```

- **Extender `MovimientoStock`** con agrupación:
  ```typescript
  tipo_medida: 'UNIDAD' | 'VOLUMEN_ML' | 'PESO_MG' | 'PORCENTAJE';
  descripcion_movimiento?: string; // "Atención: 2 Unid. Paracetamol"
  ```

#### **1.2 Migración de Base de Datos (SQL)**
- **ALTER TABLE medicamentos** con validaciones CHECK
- **ALTER TABLE movimientos_stock** para soporte de descripciones
- **Migración de datos existentes** (default 'UNIDAD')
- **Índices optimizados** para consultas de stock por tipo

#### **1.3 Actualización de Lógica Core**
- **Modificar `stock.ts`** con validaciones de tipo_medida
- **Implementar validaciones cruzadas** (medicamento.tipo_medida === movimiento.tipo_medida)
- **Agregar manejo de errores específicos** por tipo de medida

---

### **FASE 2: LÓGICA DE NEGOCIO SEGURA (Transaccional)**
**Objetivo:** Implementar la nueva lógica de dispensación con garantías ACID

#### **2.1 Refactorización de `registrarAtencion`**
- **Transacción atómica** que agrupa movimientos por medicamento/tipo
- **Validación de stock** antes de la transacción
- **Rollback automático** si cualquier paso falla
- **Generación de descripciones consolidadas**

#### **2.2 Sistema de Agrupación Inteligente**
```typescript
// Agrupar: 2 pastillas Paracetamol + 1 pastilla Ibuprofeno
// Resultado: 1 movimiento "Atención: 2 Unid. Paracetamol, 1 Unid. Ibuprofeno"
```

#### **2.3 Validaciones de Negocio**
- **Stock suficiente por tipo de medida**
- **Compatibilidad medicamento-dispensación**
- **Límites de dispensación** (según tipo de medicamento)

---

### **FASE 3: INTERFAZ DE USUARIO MODERNA (UX-First)**
**Objetivo:** Implementar UI intuitiva que distinga visualmente tipos de medida

#### **3.1 Componente `MedicineDispenser`**
- **Tarjetas visuales** por tipo de medicamento
- **Indicadores de stock** con unidades apropiadas
- **Selección múltiple** con validaciones en tiempo real
- **Previsualización de dispensación** antes de guardar

#### **3.2 Sistema de Presentación Visual**
```typescript
// Pastillas: "💊 Paracetamol - Stock: 24 unidades"
// Líquidos:   "🧪 Alcohol - Stock: 500ml"
// Insumos:    "🩸 Gasas - Stock: 10 unidades"
```

#### **3.3 Validaciones en UI**
- **Feedback inmediato** de stock insuficiente
- **Advertencias de tipo incompatible**
- **Confirmación de dispensación múltiple

---

### **FASE 4: INTEGRACIÓN Y TESTING (Quality-First)**
**Objetivo:** Asegurar robustez offline/online y consistencia de datos

#### **4.1 Testing de Escenarios Críticos**
- **Offline → Online sync** con múltiples dispensaciones
- **Concurrencia** de atenciones simultáneas
- **Validación de stock** en escenarios límite
- **Rollback automático** en fallos de red

#### **4.2 Performance y Optimización**
- **Índices Dexie** para consultas de stock
- **Caching inteligente** de medicamentos frecuentes
- **Lazy loading** de historial de dispensaciones

#### **4.3 Seguridad y Validación**
- **Sanitización de inputs** en cantidades
- **Validación de permisos** por tipo de medicamento
- **Audit trail** completo de dispensaciones

---

## 🔒 **MEJORES PRÁCTICAS DE PROGRAMACIÓN**

### **Principios de Arquitectura**
1. **SOLID**: Single Responsibility en cada componente
2. **Clean Architecture**: Dependencias hacia adentro
3. **Domain-Driven Design**: Lógica de negocio en features
4. **Offline-First**: Resiliencia ante pérdida de conexión

### **Seguridad Implementada**
1. **Multi-tenancy**: Filtrado obligatorio por `business_id`
2. **Input Validation**: Zod schemas para todos los formularios
3. **Type Safety**: TypeScript strict mode
4. **SQL Injection Prevention**: Parámetros en Supabase

### **Performance Optimizado**
1. **IndexedDB Indexing**: Índices compuestos para queries frecuentes
2. **React.memo**: Memoización de componentes costosos
3. **Code Splitting**: Lazy loading de módulos pesados
4. **Debouncing**: Búsquedas con retraso controlado

### **Calidad y Mantenimiento**
1. **Error Boundaries**: Manejo elegante de errores
2. **Logging Structured**: Logs contextuales para debugging
3. **Type Guards**: Validaciones en runtime
4. **Documentation**: JSDoc completo en funciones críticas

---

## 🚀 **ESTRATEGIA DE DESPLIEGUE**

### **Rollout Gradual**
1. **Feature Flags**: Activar nueva lógica por institución
2. **A/B Testing**: Comparar新旧 rendimientos
3. **Monitorización**: Métricas de error y performance
4. **Rollback Plan**: Reversión automática si falla

### **Migración de Datos**
1. **Data Backup**: Respaldar estado actual
2. **Schema Migration**: ALTER TABLEs con defaults seguros
3. **Data Validation**: Verificar consistencia post-migración
4. **Performance Testing**: Benchmark de queries nuevos

---

## 📊 **MÉTRICAS DE ÉXITO**

### **KPIs Técnicos**
- **Build Time**: < 30 segundos en producción
- **Bundle Size**: < 2MB comprimido
- **First Contentful Paint**: < 1.5s
- **Sync Success Rate**: > 99.5%

### **KPIs de Negocio**
- **Error Rate**: < 0.1% en dispensaciones
- **Stock Accuracy**: 100% consistencia offline/online
- **User Satisfaction**: > 4.5/5 en experiencia
- **Training Time**: < 15 minutos para nuevos usuarios

---

## 🔄 **CICLO DE VIDA DE DESARROLLO**

### **Sprints de 2 Semanas**
- **Sprint 1**: FASE 1 (Tipos y BD)
- **Sprint 2**: FASE 2 (Lógica de negocio)
- **Sprint 3**: FASE 3 (UI/UX)
- **Sprint 4**: FASE 4 (Testing y optimización)

### **Code Review Process**
1. **Peer Review**: Mínimo 2 desarrolladores senior
2. **Automated Testing**: Unit + Integration + E2E
3. **Security Review**: Validación de vulnerabilidades
4. **Performance Review**: Análisis de impacto

---

## 📝 **PRÓXIMOS PASOS**

### **Inmediato (Esta Semana)**
1. **Setup de ambiente de desarrollo**
2. **Backup de base de datos actual**
3. **Creación de branch feature/atenciones-v2**
4. **Setup de testing framework**

### **Corto Plazo (Próximas 2 Semanas)**
1. **Implementación FASE 1** completa
2. **Testing unitario** de nuevos tipos
3. **Documentación técnica** actualizada
4. **Demo interna** para stakeholders

### **Mediano Plazo (Próximo Mes)**
1. **Completar FASES 2-3**
2. **Testing de integración** completo
3. **User acceptance testing**
4. **Despliegue a producción**

---

## 🎯 **RESULTADO FINAL ESPERADO**

### **Transformación Completa**
- **Lógica Mixta**: Pastillas (unidades) + Líquidos (ml) + Insumos (varios)
- **Atenciones Verdaderamente Múltiples**: Lista completa de medicamentos
- **Movimientos Consolidados**: "Atención: 2 Unid. Paracetamol, 5ml Alcohol"
- **Experiencia Intuitiva**: UI clara que guía al usuario

### **Impacto en el Negocio**
- **Reducción de errores**: 90% menos de descuadres de stock
- **Eficiencia operativa**: 50% más rápido el registro de atenciones
- **Satisfacción del usuario**: Experiencia moderna y confiable
- **Escalabilidad**: Soporte para múltiples instituciones sin cambios

---

*Este plan está diseñado para ser ejecutable por fases, minimizando riesgos y maximizando valor en cada iteración.*
