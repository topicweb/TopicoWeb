// ───────────────────────────────────────────────────────────────────────────────
// SUPABASE - PUBLIC API
// Punto de entrada canónico para clientes Supabase
// ───────────────────────────────────────────────────────────────────────────────

export { supabase } from './client';
// NOTA: supabaseAdmin no se exporta aquí para evitar error de runtime
// cuando falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY.
// Importar directamente desde './admin' en Server Actions.

// TODO: Agregar export de Database types cuando se generen
// export type { Database } from './types';
