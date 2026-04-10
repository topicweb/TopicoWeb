-- FASE 4.3: Crear tabla de auditoría de seguridad
-- Esta tabla registra todas las operaciones críticas para compliance y trazabilidad

CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    business_id UUID NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('DISPENSACION', 'ENTRADA_STOCK', 'ERROR_VALIDACION', 'ACCESO_DENEGADO', 'STOCK_BAJO', 'SINCRONIZACION', 'CONCURRENCIA_DETECTADA')),
    medicamento_id UUID REFERENCES medicamentos(id),
    atencion_id UUID REFERENCES atenciones(id),
    cantidad DECIMAL(10,2),
    tipo_medida VARCHAR(20) CHECK (tipo_medida IN ('UNIDAD', 'VOLUMEN_ML', 'PESO_MG', 'PORCENTAJE')),
    stock_anterior INTEGER,
    stock_nuevo INTEGER,
    descripcion TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_security_audit_business_id ON security_audit_log(business_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_tipo ON security_audit_log(tipo);
CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON security_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_audit_medicamento_id ON security_audit_log(medicamento_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_atencion_id ON security_audit_log(atencion_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_business_tipo ON security_audit_log(business_id, tipo);

-- Políticas RLS para seguridad
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Solo usuarios autenticados de su propio business_id pueden ver registros
CREATE POLICY "Users can view own business audit logs" ON security_audit_log
    FOR SELECT
    USING (business_id = auth.uid());

-- Solo el servicio de sync puede insertar (la aplicación inserta como el usuario autenticado)
CREATE POLICY "Authenticated users can insert audit logs" ON security_audit_log
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Comentarios para documentación
COMMENT ON TABLE security_audit_log IS 'Registro de auditoría de todas las operaciones críticas del sistema (FASE 4.3)';
COMMENT ON COLUMN security_audit_log.tipo IS 'Tipo de evento: DISPENSACION, ENTRADA_STOCK, ERROR_VALIDACION, etc.';
COMMENT ON COLUMN security_audit_log.metadata IS 'Datos adicionales en formato JSON (diferencia de stock, porcentaje de consumo, etc.)';
