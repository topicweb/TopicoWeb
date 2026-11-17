-- Contrato de acceso por tenant para 20261116000100_secure_tenant_access.sql.
-- Requiere aplicar antes supabase/tests/fixtures/schema.sql y la migración,
-- en una base local desechable. Todo dato creado aquí se revierte al final.
BEGIN;

DO $$ BEGIN
  ASSERT NOT has_schema_privilege('authenticated','private','CREATE'), 'cliente puede crear objetos privados';
  ASSERT NOT has_function_privilege('anon','private.current_business_id()','EXECUTE'), 'helper ejecutable por anon';
  ASSERT NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND policyname LIKE 'legacy%'), 'sobreviven políticas abiertas';
  ASSERT NOT has_column_privilege('authenticated','public.perfiles','rol','UPDATE'), 'sobrevive grant privilegiado';
END $$;

-- Identidades e instituciones sintéticas. Se ejecuta con el owner de la base,
-- antes de cambiar a los roles que simulan PostgREST.
INSERT INTO auth.users(id) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'), -- admin activo A
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'), -- personal activo A
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'), -- personal activo B
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'), -- inactivo A
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'), -- eliminado A
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5')  -- sin perfil
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.instituciones(id,nombre,ruc) VALUES
  ('11111111-1111-4111-8111-111111111111','Tenant test A','TEST-RUC-A'),
  ('22222222-2222-4222-8222-222222222222','Tenant test B','TEST-RUC-B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.perfiles(id,nombre,email,rol,activo,deleted_at,business_id) VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','Admin A','admin-a@test.invalid','admin',true,NULL,'11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','Personal A','personal-a@test.invalid','personal',true,NULL,'11111111-1111-4111-8111-111111111111'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','Personal B','personal-b@test.invalid','personal',true,NULL,'22222222-2222-4222-8222-222222222222'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','Inactivo A','inactive-a@test.invalid','personal',false,NULL,'11111111-1111-4111-8111-111111111111'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','Eliminado A','deleted-a@test.invalid','personal',true,now(),'11111111-1111-4111-8111-111111111111')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.programas_estudio(id,business_id,nombre) VALUES
  ('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111','Programa A'),
  ('33333333-3333-4333-8333-333333333332','22222222-2222-4222-8222-222222222222','Programa B')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.pacientes(id,business_id,dni,nombres,apellidos,categoria,programa_id) VALUES
  ('44444444-4444-4444-8444-444444444441','11111111-1111-4111-8111-111111111111','TEST0001','Paciente','A','estudiante','33333333-3333-4333-8333-333333333331'),
  ('44444444-4444-4444-8444-444444444442','22222222-2222-4222-8222-222222222222','TEST0002','Paciente','B','estudiante','33333333-3333-4333-8333-333333333332')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.medicamentos(id,business_id,nombre) VALUES
  ('55555555-5555-4555-8555-555555555551','11111111-1111-4111-8111-111111111111','Medicamento A'),
  ('55555555-5555-4555-8555-555555555552','22222222-2222-4222-8222-222222222222','Medicamento B')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.atenciones(id,business_id,paciente_id,perfil_id,motivo_consulta) VALUES
  ('66666666-6666-4666-8666-666666666661','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444441','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','Test A'),
  ('66666666-6666-4666-8666-666666666662','22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444442','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','Test B')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.movimientos_stock(id,business_id,medicamento_id,tipo,cantidad) VALUES
  ('77777777-7777-4777-8777-777777777771','11111111-1111-4111-8111-111111111111','55555555-5555-4555-8555-555555555551','ENTRADA',1),
  ('77777777-7777-4777-8777-777777777772','22222222-2222-4222-8222-222222222222','55555555-5555-4555-8555-555555555552','ENTRADA',1)
ON CONFLICT (id) DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',true);
DO $$
DECLARE n integer;
BEGIN
  -- SELECT en las siete tablas: A ve A y nunca B.
  SELECT count(*) INTO n FROM public.instituciones WHERE id='11111111-1111-4111-8111-111111111111'; ASSERT n=1, 'instituciones: tenant A no ve su fila';
  SELECT count(*) INTO n FROM public.instituciones WHERE id='22222222-2222-4222-8222-222222222222'; ASSERT n=0, 'instituciones: tenant A ve tenant B';
  SELECT count(*) INTO n FROM public.perfiles WHERE business_id='11111111-1111-4111-8111-111111111111'; ASSERT n=4, 'perfiles: tenant A no ve perfiles propios (incluye inactivo/eliminado)';
  SELECT count(*) INTO n FROM public.perfiles WHERE business_id='22222222-2222-4222-8222-222222222222'; ASSERT n=0, 'perfiles: tenant A ve tenant B';
  SELECT count(*) INTO n FROM public.programas_estudio WHERE business_id='11111111-1111-4111-8111-111111111111'; ASSERT n=1, 'programas: tenant A no ve su fila';
  SELECT count(*) INTO n FROM public.programas_estudio WHERE business_id='22222222-2222-4222-8222-222222222222'; ASSERT n=0, 'programas: tenant A ve tenant B';
  SELECT count(*) INTO n FROM public.pacientes WHERE business_id='11111111-1111-4111-8111-111111111111'; ASSERT n=1, 'pacientes: tenant A no ve su fila';
  SELECT count(*) INTO n FROM public.pacientes WHERE business_id='22222222-2222-4222-8222-222222222222'; ASSERT n=0, 'pacientes: tenant A ve tenant B';
  SELECT count(*) INTO n FROM public.medicamentos WHERE business_id='11111111-1111-4111-8111-111111111111'; ASSERT n=1, 'medicamentos: tenant A no ve su fila';
  SELECT count(*) INTO n FROM public.medicamentos WHERE business_id='22222222-2222-4222-8222-222222222222'; ASSERT n=0, 'medicamentos: tenant A ve tenant B';
  SELECT count(*) INTO n FROM public.atenciones WHERE business_id='11111111-1111-4111-8111-111111111111'; ASSERT n=1, 'atenciones: tenant A no ve su fila';
  SELECT count(*) INTO n FROM public.atenciones WHERE business_id='22222222-2222-4222-8222-222222222222'; ASSERT n=0, 'atenciones: tenant A ve tenant B';
  SELECT count(*) INTO n FROM public.movimientos_stock WHERE business_id='11111111-1111-4111-8111-111111111111'; ASSERT n=1, 'movimientos: tenant A no ve su fila';
  SELECT count(*) INTO n FROM public.movimientos_stock WHERE business_id='22222222-2222-4222-8222-222222222222'; ASSERT n=0, 'movimientos: tenant A ve tenant B';
END $$;

-- El usuario del tenant B queda aislado en sentido inverso en las siete tablas.
SELECT set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',true);
DO $$ DECLARE n integer; BEGIN
  SELECT count(*) INTO n FROM public.instituciones WHERE id='22222222-2222-4222-8222-222222222222'; ASSERT n=1, 'instituciones: tenant B no ve su fila';
  SELECT count(*) INTO n FROM public.instituciones WHERE id='11111111-1111-4111-8111-111111111111'; ASSERT n=0, 'instituciones: tenant B ve tenant A';
  SELECT count(*) INTO n FROM public.perfiles WHERE business_id='22222222-2222-4222-8222-222222222222'; ASSERT n=1, 'perfiles: tenant B no ve su fila';
  SELECT count(*) INTO n FROM public.perfiles WHERE business_id='11111111-1111-4111-8111-111111111111'; ASSERT n=0, 'perfiles: tenant B ve tenant A';
  SELECT count(*) INTO n FROM public.programas_estudio WHERE business_id='22222222-2222-4222-8222-222222222222'; ASSERT n=1, 'programas: tenant B no ve su fila';
  SELECT count(*) INTO n FROM public.programas_estudio WHERE business_id='11111111-1111-4111-8111-111111111111'; ASSERT n=0, 'programas: tenant B ve tenant A';
  SELECT count(*) INTO n FROM public.pacientes WHERE business_id='22222222-2222-4222-8222-222222222222'; ASSERT n=1, 'pacientes: tenant B no ve su fila';
  SELECT count(*) INTO n FROM public.pacientes WHERE business_id='11111111-1111-4111-8111-111111111111'; ASSERT n=0, 'pacientes: tenant B ve tenant A';
  SELECT count(*) INTO n FROM public.medicamentos WHERE business_id='22222222-2222-4222-8222-222222222222'; ASSERT n=1, 'medicamentos: tenant B no ve su fila';
  SELECT count(*) INTO n FROM public.medicamentos WHERE business_id='11111111-1111-4111-8111-111111111111'; ASSERT n=0, 'medicamentos: tenant B ve tenant A';
  SELECT count(*) INTO n FROM public.atenciones WHERE business_id='22222222-2222-4222-8222-222222222222'; ASSERT n=1, 'atenciones: tenant B no ve su fila';
  SELECT count(*) INTO n FROM public.atenciones WHERE business_id='11111111-1111-4111-8111-111111111111'; ASSERT n=0, 'atenciones: tenant B ve tenant A';
  SELECT count(*) INTO n FROM public.movimientos_stock WHERE business_id='22222222-2222-4222-8222-222222222222'; ASSERT n=1, 'movimientos: tenant B no ve su fila';
  SELECT count(*) INTO n FROM public.movimientos_stock WHERE business_id='11111111-1111-4111-8111-111111111111'; ASSERT n=0, 'movimientos: tenant B ve tenant A';
END $$;

SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',true);
DO $$
DECLARE n integer;
BEGIN

  -- Escritura propia permitida en las cuatro tablas sincronizables.
  INSERT INTO public.pacientes(id,business_id,dni,nombres,apellidos,categoria) VALUES ('44444444-4444-4444-8444-444444444443','11111111-1111-4111-8111-111111111111','TEST0003','Insert','A','estudiante');
  UPDATE public.pacientes SET nombres='Paciente A editado' WHERE id='44444444-4444-4444-8444-444444444441';
  INSERT INTO public.pacientes(id,business_id,dni,nombres,apellidos,categoria) VALUES ('44444444-4444-4444-8444-444444444441','11111111-1111-4111-8111-111111111111','TEST0001','Upsert','A','estudiante') ON CONFLICT(id) DO UPDATE SET nombres=excluded.nombres;
  INSERT INTO public.medicamentos(id,business_id,nombre) VALUES ('55555555-5555-4555-8555-555555555553','11111111-1111-4111-8111-111111111111','Insert A');
  UPDATE public.medicamentos SET nombre='Medicamento A editado' WHERE id='55555555-5555-4555-8555-555555555551';
  INSERT INTO public.medicamentos(id,business_id,nombre) VALUES ('55555555-5555-4555-8555-555555555551','11111111-1111-4111-8111-111111111111','Upsert A') ON CONFLICT(id) DO UPDATE SET nombre=excluded.nombre;
  INSERT INTO public.atenciones(id,business_id,paciente_id,perfil_id,motivo_consulta) VALUES ('66666666-6666-4666-8666-666666666663','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444441','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','Insert A');
  UPDATE public.atenciones SET motivo_consulta='Atención A editada' WHERE id='66666666-6666-4666-8666-666666666661';
  INSERT INTO public.atenciones(id,business_id,paciente_id,perfil_id,motivo_consulta) VALUES ('66666666-6666-4666-8666-666666666661','11111111-1111-4111-8111-111111111111','44444444-4444-4444-8444-444444444441','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','Upsert A') ON CONFLICT(id) DO UPDATE SET motivo_consulta=excluded.motivo_consulta;
  INSERT INTO public.movimientos_stock(id,business_id,medicamento_id,tipo,cantidad) VALUES ('77777777-7777-4777-8777-777777777773','11111111-1111-4111-8111-111111111111','55555555-5555-4555-8555-555555555551','ENTRADA',2);
  UPDATE public.movimientos_stock SET cantidad=3 WHERE id='77777777-7777-4777-8777-777777777771';
  INSERT INTO public.movimientos_stock(id,business_id,medicamento_id,tipo,cantidad) VALUES ('77777777-7777-4777-8777-777777777771','11111111-1111-4111-8111-111111111111','55555555-5555-4555-8555-555555555551','ENTRADA',4) ON CONFLICT(id) DO UPDATE SET cantidad=excluded.cantidad;

  SELECT count(*) INTO n FROM public.pacientes WHERE id='44444444-4444-4444-8444-444444444441' AND nombres='Upsert'; ASSERT n=1, 'UPSERT propio de pacientes no persistió';
  SELECT count(*) INTO n FROM public.pacientes WHERE id='44444444-4444-4444-8444-444444444443'; ASSERT n=1, 'INSERT propio de pacientes no persistió';
  SELECT count(*) INTO n FROM public.medicamentos WHERE id='55555555-5555-4555-8555-555555555551' AND nombre='Upsert A'; ASSERT n=1, 'UPSERT propio de medicamentos no persistió';
  SELECT count(*) INTO n FROM public.medicamentos WHERE id='55555555-5555-4555-8555-555555555553'; ASSERT n=1, 'INSERT propio de medicamentos no persistió';
  SELECT count(*) INTO n FROM public.atenciones WHERE id='66666666-6666-4666-8666-666666666661' AND motivo_consulta='Upsert A'; ASSERT n=1, 'UPSERT propio de atenciones no persistió';
  SELECT count(*) INTO n FROM public.atenciones WHERE id='66666666-6666-4666-8666-666666666663'; ASSERT n=1, 'INSERT propio de atenciones no persistió';
  SELECT count(*) INTO n FROM public.movimientos_stock WHERE id='77777777-7777-4777-8777-777777777771' AND cantidad=4; ASSERT n=1, 'UPSERT propio de movimientos no persistió';
  SELECT count(*) INTO n FROM public.movimientos_stock WHERE id='77777777-7777-4777-8777-777777777773'; ASSERT n=1, 'INSERT propio de movimientos no persistió';

  -- Cambiar business_id de una fila propia falla por WITH CHECK.
  BEGIN
    UPDATE public.pacientes SET business_id='22222222-2222-4222-8222-222222222222' WHERE id='44444444-4444-4444-8444-444444444441';
    RAISE EXCEPTION 'cambio de business_id propio fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Inserts y UPSERTs con tenant B se deniegan; UPDATE de fila B afecta cero filas.
  BEGIN
    INSERT INTO public.pacientes(id,business_id,dni,nombres,apellidos,categoria) VALUES ('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','TEST0004','Cross','Tenant','estudiante');
    RAISE EXCEPTION 'INSERT cruzado de pacientes fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    INSERT INTO public.pacientes(id,business_id,dni,nombres,apellidos,categoria) VALUES ('44444444-4444-4444-8444-444444444442','22222222-2222-4222-8222-222222222222','TEST0002','Upsert','B','estudiante') ON CONFLICT(id) DO UPDATE SET nombres=excluded.nombres;
    RAISE EXCEPTION 'UPSERT cruzado de pacientes fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  UPDATE public.pacientes SET nombres='no debe cambiar' WHERE id='44444444-4444-4444-8444-444444444442';
  GET DIAGNOSTICS n = ROW_COUNT; ASSERT n=0, 'UPDATE cruzado de pacientes afectó filas';
  BEGIN
    INSERT INTO public.medicamentos(id,business_id,nombre) VALUES ('55555555-5555-4555-8555-555555555554','22222222-2222-4222-8222-222222222222','Cross B');
    RAISE EXCEPTION 'INSERT cruzado de medicamentos fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.medicamentos(id,business_id,nombre) VALUES ('55555555-5555-4555-8555-555555555552','22222222-2222-4222-8222-222222222222','Upsert B') ON CONFLICT(id) DO UPDATE SET nombre=excluded.nombre;
    RAISE EXCEPTION 'UPSERT cruzado de medicamentos fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.medicamentos SET nombre='no debe cambiar' WHERE id='55555555-5555-4555-8555-555555555552';
  GET DIAGNOSTICS n = ROW_COUNT; ASSERT n=0, 'UPDATE cruzado de medicamentos afectó filas';
  BEGIN
    UPDATE public.medicamentos SET business_id='22222222-2222-4222-8222-222222222222' WHERE id='55555555-5555-4555-8555-555555555551';
    RAISE EXCEPTION 'traslado de tenant en medicamento fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.atenciones(id,business_id,paciente_id,perfil_id,motivo_consulta) VALUES ('66666666-6666-4666-8666-666666666664','22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444442','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','Cross B');
    RAISE EXCEPTION 'INSERT cruzado de atenciones fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.atenciones(id,business_id,paciente_id,perfil_id,motivo_consulta) VALUES ('66666666-6666-4666-8666-666666666662','22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444442','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','Upsert B') ON CONFLICT(id) DO UPDATE SET motivo_consulta=excluded.motivo_consulta;
    RAISE EXCEPTION 'UPSERT cruzado de atenciones fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.atenciones SET motivo_consulta='no debe cambiar' WHERE id='66666666-6666-4666-8666-666666666662';
  GET DIAGNOSTICS n = ROW_COUNT; ASSERT n=0, 'UPDATE cruzado de atenciones afectó filas';
  BEGIN
    UPDATE public.atenciones SET business_id='22222222-2222-4222-8222-222222222222' WHERE id='66666666-6666-4666-8666-666666666661';
    RAISE EXCEPTION 'traslado de tenant en atención fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.movimientos_stock(id,business_id,medicamento_id,tipo,cantidad) VALUES ('77777777-7777-4777-8777-777777777774','22222222-2222-4222-8222-222222222222','55555555-5555-4555-8555-555555555552','ENTRADA',1);
    RAISE EXCEPTION 'INSERT cruzado de movimientos fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.movimientos_stock(id,business_id,medicamento_id,tipo,cantidad) VALUES ('77777777-7777-4777-8777-777777777772','22222222-2222-4222-8222-222222222222','55555555-5555-4555-8555-555555555552','ENTRADA',2) ON CONFLICT(id) DO UPDATE SET cantidad=excluded.cantidad;
    RAISE EXCEPTION 'UPSERT cruzado de movimientos fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.movimientos_stock SET cantidad=99 WHERE id='77777777-7777-4777-8777-777777777772';
  GET DIAGNOSTICS n = ROW_COUNT; ASSERT n=0, 'UPDATE cruzado de movimientos afectó filas';
  BEGIN
    UPDATE public.movimientos_stock SET business_id='22222222-2222-4222-8222-222222222222' WHERE id='77777777-7777-4777-8777-777777777771';
    RAISE EXCEPTION 'traslado de tenant en movimiento fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- Perfiles: ni cambiar privilegios ni tenant/estado desde el cliente.
  BEGIN
    UPDATE public.perfiles SET rol='admin' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
    RAISE EXCEPTION 'cambio de rol propio fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.perfiles SET business_id='22222222-2222-4222-8222-222222222222' WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
    RAISE EXCEPTION 'cambio de tenant propio fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.perfiles SET activo=false WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
    RAISE EXCEPTION 'cambio de estado propio fue permitido';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

-- Usuarios inactivos/eliminados solo pueden leer su propio perfil; sin perfil,
-- el helper de tenant queda NULL y no expone ninguna tabla.
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',true);
DO $$ DECLARE n integer; BEGIN
  SELECT count(*) INTO n FROM public.perfiles WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3'; ASSERT n=1, 'inactivo no puede leer perfil propio';
  SELECT count(*) INTO n FROM public.perfiles WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'; ASSERT n=0, 'inactivo ve otro perfil';
  SELECT count(*) INTO n FROM public.pacientes; ASSERT n=0, 'inactivo ve filas de pacientes';
END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',true);
DO $$ DECLARE n integer; BEGIN
  SELECT count(*) INTO n FROM public.perfiles WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4'; ASSERT n=1, 'eliminado no puede leer perfil propio';
  SELECT count(*) INTO n FROM public.perfiles WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'; ASSERT n=0, 'eliminado ve otro perfil';
  SELECT count(*) INTO n FROM public.pacientes; ASSERT n=0, 'eliminado ve filas de pacientes';
END $$;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5',true);
DO $$ DECLARE n integer; BEGIN
  SELECT count(*) INTO n FROM public.perfiles; ASSERT n=0, 'usuario sin perfil ve perfiles';
  SELECT count(*) INTO n FROM public.pacientes; ASSERT n=0, 'usuario sin perfil ve pacientes';
END $$;

-- No hay permisos de escritura admin/client para perfil/instituciones/programas.
DO $$ DECLARE denied boolean; BEGIN
  ASSERT NOT has_table_privilege('authenticated','public.instituciones','INSERT'), 'authenticated conserva INSERT instituciones';
  ASSERT NOT has_table_privilege('authenticated','public.instituciones','UPDATE'), 'authenticated conserva UPDATE instituciones';
  ASSERT NOT has_table_privilege('authenticated','public.programas_estudio','INSERT'), 'authenticated conserva INSERT programas';
  ASSERT NOT has_table_privilege('authenticated','public.programas_estudio','UPDATE'), 'authenticated conserva UPDATE programas';
  ASSERT NOT has_table_privilege('authenticated','public.perfiles','DELETE'), 'authenticated conserva DELETE perfiles';
  ASSERT NOT has_table_privilege('authenticated','public.instituciones','DELETE'), 'authenticated conserva DELETE instituciones';
  ASSERT NOT has_table_privilege('authenticated','public.programas_estudio','DELETE'), 'authenticated conserva DELETE programas';
  ASSERT NOT has_table_privilege('authenticated','public.pacientes','TRUNCATE'), 'authenticated conserva TRUNCATE pacientes';
  ASSERT NOT has_table_privilege('authenticated','public.medicamentos','TRUNCATE'), 'authenticated conserva TRUNCATE medicamentos';
  ASSERT NOT has_table_privilege('authenticated','public.atenciones','TRUNCATE'), 'authenticated conserva TRUNCATE atenciones';
  ASSERT NOT has_table_privilege('authenticated','public.movimientos_stock','TRUNCATE'), 'authenticated conserva TRUNCATE movimientos';
  denied := false;
  BEGIN INSERT INTO public.instituciones(id,nombre) VALUES ('88888888-8888-4888-8888-888888888881','no'); RAISE EXCEPTION 'instituciones INSERT permitido';
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  ASSERT denied, 'instituciones INSERT no denegado';
  denied := false;
  BEGIN UPDATE public.programas_estudio SET nombre='no' WHERE id='33333333-3333-4333-8333-333333333331'; RAISE EXCEPTION 'programas UPDATE permitido';
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  ASSERT denied, 'programas UPDATE no denegado';
  denied := false;
  BEGIN INSERT INTO public.programas_estudio(id,nombre) VALUES ('33333333-3333-4333-8333-333333333333','no'); RAISE EXCEPTION 'programas INSERT permitido';
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  ASSERT denied, 'programas INSERT no denegado';
  denied := false;
  BEGIN UPDATE public.instituciones SET nombre='no' WHERE id='11111111-1111-4111-8111-111111111111'; RAISE EXCEPTION 'instituciones UPDATE permitido';
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  ASSERT denied, 'instituciones UPDATE no denegado';
END $$;

-- Sin DELETE/TRUNCATE para authenticated, incluso con JWT de admin.
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',true);
DO $$ DECLARE denied boolean; BEGIN
  denied := false;
  BEGIN DELETE FROM public.pacientes WHERE id='44444444-4444-4444-8444-444444444441'; RAISE EXCEPTION 'DELETE permitido';
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  ASSERT denied, 'DELETE no denegado';
  denied := false;
  BEGIN TRUNCATE public.pacientes CASCADE; RAISE EXCEPTION 'TRUNCATE permitido';
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  ASSERT denied, 'TRUNCATE no denegado';
END $$;

-- anon no tiene SELECT; la excepción esperada es exclusivamente 42501.
SET LOCAL ROLE anon;
DO $$ DECLARE denied boolean; BEGIN
  denied := false;
  BEGIN PERFORM 1 FROM public.pacientes; RAISE EXCEPTION 'anon SELECT permitido';
  EXCEPTION WHEN insufficient_privilege THEN denied := true; END;
  ASSERT denied, 'anon SELECT no denegado';
END $$;

-- El fixture otorga ALL a service_role; la migración conserva esos grants.
RESET ROLE;
SET LOCAL ROLE service_role;
INSERT INTO public.instituciones(id,nombre,ruc) VALUES ('88888888-8888-4888-8888-888888888882','Service role test','SERVICE-TEST');
UPDATE public.instituciones SET nombre='Service role test editado' WHERE id='88888888-8888-4888-8888-888888888882';
DO $$ DECLARE n integer; BEGIN
  SELECT count(*) INTO n FROM public.instituciones WHERE id='88888888-8888-4888-8888-888888888882' AND nombre='Service role test editado';
  ASSERT n=1, 'service_role perdió grants o bypass RLS';
END $$;

ROLLBACK;
