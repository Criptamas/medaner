import { createClient } from '@supabase/supabase-js'

// Cliente público (ANON key) — el único permitido en código que corre en el
// navegador (cualquier archivo bajo src/). La ANON key respeta Row Level
// Security: con las policies actuales (ver migración a Supabase) solo puede
// leer tiendas activas y productos disponibles, nunca escribir.
//
// La service_role key (que sí puede saltarse RLS) NUNCA debe importarse
// desde acá — vive solo en funciones serverless (api/*.js) y en el script
// de migración (scripts/migrar-tiendas.js), ambos ejecutados server-side.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
