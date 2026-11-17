-- SOLO pruebas locales: nunca ejecutar este fixture en Supabase.
-- Columnas, enums y restricciones exportados del catálogo el 16/11/2026.
-- Auth mínimo sintético; no reproduce GoTrue/PostgREST ni extensiones/triggers.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon,authenticated,service_role;
CREATE TYPE public.rol_usuario AS ENUM ('admin','personal');
CREATE TYPE public.tipo_medida_enum AS ENUM ('UNIDAD','VOLUMEN_ML','PESO_MG','PORCENTAJE');
CREATE TYPE public.tipo_movimiento AS ENUM ('entrada','salida');
CREATE TYPE public.tipo_paciente AS ENUM ('estudiante','docente','otro');
CREATE TABLE public.atenciones (id uuid DEFAULT gen_random_uuid() NOT NULL,business_id uuid NOT NULL,paciente_id uuid NOT NULL,perfil_id uuid NOT NULL,motivo_consulta text NOT NULL,signos_vitales jsonb DEFAULT '{"fc": "", "fr": "", "temp": "", "presion": "", "saturacion": ""}'::jsonb,observacion text,fecha_atencion timestamp with time zone DEFAULT now(),activo boolean DEFAULT true,sync_status text DEFAULT 'synced'::text,actualizado_at timestamp with time zone DEFAULT now(),creado_at timestamp with time zone DEFAULT now(),diagnostico text);
CREATE TABLE public.instituciones (id uuid DEFAULT gen_random_uuid() NOT NULL,nombre text NOT NULL,ruc text,activo boolean DEFAULT true,creado_at timestamp with time zone DEFAULT now(),sync_status text DEFAULT 'synced'::text);
CREATE TABLE public.medicamentos (id uuid DEFAULT gen_random_uuid() NOT NULL,business_id uuid NOT NULL,nombre text NOT NULL,descripcion text,unidad_medida text DEFAULT 'unidad'::text,anaquel text,stock_actual integer DEFAULT 0,stock_minimo integer DEFAULT 5,imagen_url text,activo boolean DEFAULT true,creado_at timestamp with time zone DEFAULT now(),tipo_medida tipo_medida_enum DEFAULT 'UNIDAD'::tipo_medida_enum NOT NULL,presentacion text,sync_status text DEFAULT 'synced'::text,actualizado_at timestamp with time zone DEFAULT now());
CREATE TABLE public.movimientos_stock (id uuid DEFAULT gen_random_uuid() NOT NULL,business_id uuid NOT NULL,medicamento_id uuid NOT NULL,atencion_id uuid,tipo text,cantidad integer NOT NULL,fecha_movimiento timestamp with time zone DEFAULT now(),tipo_medida tipo_medida_enum DEFAULT 'UNIDAD'::tipo_medida_enum NOT NULL,descripcion_movimiento text,sync_status text DEFAULT 'synced'::text,actualizado_at timestamp with time zone DEFAULT now(),fecha_vencimiento date);
CREATE TABLE public.pacientes (id uuid DEFAULT gen_random_uuid() NOT NULL,business_id uuid NOT NULL,dni text NOT NULL,nombres text NOT NULL,apellidos text NOT NULL,sexo text,categoria text NOT NULL,programa_id uuid,metadata jsonb DEFAULT '{}'::jsonb,creado_at timestamp with time zone DEFAULT now(),activo boolean DEFAULT true,sync_status text DEFAULT 'synced'::text,actualizado_at timestamp with time zone DEFAULT now(),fecha_nacimiento date,telefono text);
CREATE TABLE public.perfiles (id uuid NOT NULL,nombre text,email text NOT NULL,rol rol_usuario DEFAULT 'admin'::rol_usuario,activo boolean DEFAULT true,creado_at timestamp with time zone DEFAULT now(),actualizado_at timestamp with time zone DEFAULT now(),deleted_at timestamp with time zone,business_id uuid,sync_status text DEFAULT 'synced'::text);
CREATE TABLE public.programas_estudio (id uuid DEFAULT gen_random_uuid() NOT NULL,business_id uuid,nombre text NOT NULL,activo boolean DEFAULT true,sync_status text DEFAULT 'synced'::text,creado_at timestamp with time zone DEFAULT now(),actualizado_at timestamp with time zone DEFAULT now());
ALTER TABLE public.atenciones ADD CONSTRAINT atenciones_pkey PRIMARY KEY (id);
ALTER TABLE public.instituciones ADD CONSTRAINT instituciones_pkey PRIMARY KEY (id);
ALTER TABLE public.instituciones ADD CONSTRAINT instituciones_ruc_key UNIQUE (ruc);
ALTER TABLE public.medicamentos ADD CONSTRAINT medicamentos_pkey PRIMARY KEY (id);
ALTER TABLE public.movimientos_stock ADD CONSTRAINT movimientos_stock_tipo_check CHECK ((tipo = ANY (ARRAY['ENTRADA'::text, 'SALIDA'::text])));
ALTER TABLE public.movimientos_stock ADD CONSTRAINT movimientos_stock_pkey PRIMARY KEY (id);
ALTER TABLE public.pacientes ADD CONSTRAINT pacientes_sexo_check CHECK ((sexo = ANY (ARRAY['M'::text, 'F'::text])));
ALTER TABLE public.pacientes ADD CONSTRAINT pacientes_pkey PRIMARY KEY (id);
ALTER TABLE public.pacientes ADD CONSTRAINT pacientes_categoria_check CHECK ((categoria = ANY (ARRAY['estudiante'::text, 'docente'::text, 'administrativo'::text, 'limpieza'::text])));
ALTER TABLE public.pacientes ADD CONSTRAINT pacientes_business_id_dni_key UNIQUE (business_id, dni);
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_pkey PRIMARY KEY (id);
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_email_key UNIQUE (email);
ALTER TABLE public.programas_estudio ADD CONSTRAINT programas_estudio_pkey PRIMARY KEY (id);
ALTER TABLE public.programas_estudio ADD CONSTRAINT programas_estudio_business_id_nombre_key UNIQUE (business_id, nombre);
ALTER TABLE public.atenciones ADD CONSTRAINT atenciones_paciente_id_fkey FOREIGN KEY (paciente_id) REFERENCES pacientes(id);
ALTER TABLE public.atenciones ADD CONSTRAINT atenciones_perfil_id_fkey FOREIGN KEY (perfil_id) REFERENCES perfiles(id);
ALTER TABLE public.atenciones ADD CONSTRAINT atenciones_business_id_fkey FOREIGN KEY (business_id) REFERENCES instituciones(id);
ALTER TABLE public.medicamentos ADD CONSTRAINT medicamentos_business_id_fkey FOREIGN KEY (business_id) REFERENCES instituciones(id);
ALTER TABLE public.movimientos_stock ADD CONSTRAINT movimientos_stock_medicamento_id_fkey FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id);
ALTER TABLE public.movimientos_stock ADD CONSTRAINT movimientos_stock_business_id_fkey FOREIGN KEY (business_id) REFERENCES instituciones(id);
ALTER TABLE public.movimientos_stock ADD CONSTRAINT movimientos_stock_atencion_id_fkey FOREIGN KEY (atencion_id) REFERENCES atenciones(id);
ALTER TABLE public.pacientes ADD CONSTRAINT pacientes_programa_id_fkey FOREIGN KEY (programa_id) REFERENCES programas_estudio(id);
ALTER TABLE public.pacientes ADD CONSTRAINT pacientes_business_id_fkey FOREIGN KEY (business_id) REFERENCES instituciones(id);
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_business_id_fkey FOREIGN KEY (business_id) REFERENCES instituciones(id);
ALTER TABLE public.programas_estudio ADD CONSTRAINT programas_estudio_business_id_fkey FOREIGN KEY (business_id) REFERENCES instituciones(id);
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon,authenticated,service_role;

