import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[Supabase] Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * Cliente Supabase singleton.
 * Importar siempre desde '@/core/db/supabase/client'.
 *
 * Cuando generes los tipos con `supabase gen types typescript`, reemplaza
 * `createClient(...)` por `createClient<Database>(...)` e importa `Database`
 * desde '@/core/supabase/types'.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
