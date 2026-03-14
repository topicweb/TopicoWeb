-- Script RLS temporal (Desarrollo/Offline-First Demo)
-- Pégalo y ejecútalo en el SQL Editor de tu cuenta de Supabase.

-- 1. Permite inserciones y lecturas totales en "programas_estudio" a roles autenticados
create policy "Enable all for authenticated users" on "public"."programas_estudio"
as permissive for all to authenticated using (true) with check (true);

-- 2. Permite inserciones y lecturas totales en "perfiles" a roles autenticados
create policy "Enable all for authenticated users" on "public"."perfiles"
as permissive for all to authenticated using (true) with check (true);

-- 3. Permite inserciones y lecturas totales en "pacientes" a roles autenticados
create policy "Enable all for authenticated users" on "public"."pacientes"
as permissive for all to authenticated using (true) with check (true);

-- 4. Permite inserciones y lecturas totales en "medicamentos" a roles autenticados
create policy "Enable all for authenticated users" on "public"."medicamentos"
as permissive for all to authenticated using (true) with check (true);

-- 5. Permite inserciones y lecturas totales en "atenciones" a roles autenticados
create policy "Enable all for authenticated users" on "public"."atenciones"
as permissive for all to authenticated using (true) with check (true);

-- 6. Permite inserciones y lecturas totales en "movimientos_stock" a roles autenticados
create policy "Enable all for authenticated users" on "public"."movimientos_stock"
as permissive for all to authenticated using (true) with check (true);

-- NOTA: Este es un script de DEMOSTRACIÓN para saltar el bloqueo 403.
-- Para producción, debes crear políticas RLS que digan:
-- "using ( business_id = auth.jwt()->>'businessId' )"
