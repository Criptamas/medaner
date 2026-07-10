import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'

// Rechaza una solicitud de conductor. A diferencia de aprobar, no toca
// Firebase (no se creó ninguna cuenta todavía) — es un update simple en
// Supabase. Sin chequeo de que quien llama es admin de verdad: mismo nivel
// de protección informal que el resto de los endpoints admin-* del repo.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const { solicitudId, motivo } = req.body ?? {}
  if (!solicitudId) {
    res.status(400).json({ error: 'Falta solicitudId' })
    return
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: solicitud, error: errorSolicitud } = await supabase
      .from('solicitudes_conductor')
      .select('id, estado')
      .eq('id', solicitudId)
      .maybeSingle()
    if (errorSolicitud) throw errorSolicitud
    if (!solicitud) {
      res.status(404).json({ error: 'Solicitud no encontrada' })
      return
    }
    if (solicitud.estado !== 'pendiente') {
      res.status(409).json({ error: `La solicitud ya está en estado "${solicitud.estado}"` })
      return
    }

    const { error: errorUpdate } = await supabase
      .from('solicitudes_conductor')
      .update({
        estado: 'rechazada',
        // Motivo no obligatorio: string vacío o undefined del body se
        // guarda como null en vez de "" para no ensuciar el filtro de
        // notas_admin en futuras consultas.
        notas_admin: motivo && motivo.trim() ? motivo.trim() : null,
        revisado_en: new Date().toISOString(),
      })
      .eq('id', solicitudId)
    if (errorUpdate) throw errorUpdate

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[admin-rechazar-conductor] falló el rechazo:', err.message)
    res.status(500).json({ error: 'No se pudo rechazar la solicitud' })
  }
}
