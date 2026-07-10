import { createClient } from '@supabase/supabase-js'

// Cliente con service_role: salta Row Level Security por completo. Solo para
// funciones serverless (server-side) — nunca importar esto desde src/, la
// key se bundlearía al navegador. El cliente público (ANON key, respeta RLS)
// vive en src/lib/supabaseClient.js.
//
// Reutiliza VITE_SUPABASE_URL (no es secreta, es la URL pública del
// proyecto) en vez de duplicar la variable sin el prefijo — es la misma que
// consume el cliente del navegador y el script de migración.
let cachedClient = null

export function getSupabaseAdmin() {
  // Vercel puede reutilizar la misma instancia de función entre invocaciones
  // ("warm start"); cachear el cliente evita reconstruirlo en cada llamada,
  // mismo motivo que el guard de getApps() en firebaseAdmin.js.
  if (cachedClient) return cachedClient

  cachedClient = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    // Sin storage de sesión en el servidor (no hay navegador donde
    // persistirla) y no hace falta: service_role no pasa por login.
    { auth: { persistSession: false } },
  )
  return cachedClient
}
