import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'

// Activa/desactiva una tienda. Necesita service_role porque el catálogo no
// tiene policy de insert/update/delete para anon/authenticated (de solo
// lectura desde el cliente) — toda escritura pasa por acá. Sin chequeo de
// que quien llama es admin de verdad: mismo nivel de protección informal que
// ya tiene hoy /admin en el frontend (limitación conocida, fuera de alcance).
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const { tiendaId, activa } = req.body ?? {}
  if (!tiendaId || typeof activa !== 'boolean') {
    res.status(400).json({ error: 'Falta tiendaId o activa (boolean)' })
    return
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('tiendas')
      .update({ activa })
      .eq('id', tiendaId)
      .select('id')

    if (error) throw error

    // update() con un id que no matchea ninguna fila no es un error para
    // Supabase (responde OK con 0 filas afectadas) — sin este chequeo el
    // frontend creería que el cambio se guardó cuando en realidad no tocó
    // nada (ej. tiendaId obsoleto por un borrado concurrente).
    if (!data || data.length === 0) {
      res.status(404).json({ error: 'Tienda no encontrada' })
      return
    }

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[admin-toggle-tienda] falló el update en Supabase:', err.message)
    res.status(500).json({ error: 'No se pudo actualizar la tienda' })
  }
}
