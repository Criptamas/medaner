import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'

// Devuelve TODAS las tiendas (activas e inactivas) para el panel de admin.
// Necesita service_role porque la policy de RLS del catálogo solo deja leer
// tiendas con activa = true a la ANON key — el admin necesita ver también
// las inactivas para poder reactivarlas. Sin chequeo de que quien llama es
// admin de verdad: mismo nivel de protección informal que ya tiene hoy
// /admin en el frontend (limitación conocida, fuera de alcance acá).
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.from('tiendas').select('*').order('nombre')

    if (error) throw error

    res.status(200).json({ tiendas: data ?? [] })
  } catch (err) {
    // Logueado, no tragado en silencio: sin esto un fallo de Supabase acá
    // sería invisible en producción (ver mismo criterio en tasa-cambio.js).
    console.error('[admin-tiendas] falló la consulta a Supabase:', err.message)
    res.status(500).json({ error: 'No se pudieron cargar las tiendas' })
  }
}
