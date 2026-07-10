import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'

// Cuánto dura la URL firmada de las fotos: alcanza para que el admin las vea
// al cargar la pantalla (no quedan abiertas indefinidamente, el bucket es
// privado a propósito).
const SEGUNDOS_URL_FIRMADA = 300

// Lista las solicitudes de conductor para el panel de admin, con el
// nombre/teléfono del usuario asociado y URLs firmadas para ver las fotos.
// Necesita service_role: el bucket es privado (sin policy de select pública)
// y la tabla no tiene policy de "listar todas" para el cliente (solo
// insert/select de la propia solicitud). Sin chequeo de que quien llama es
// admin de verdad: mismo nivel de protección informal que admin-tiendas.js.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  // Por defecto solo las pendientes (lo que el admin necesita revisar);
  // ?estado=todas trae todo, cualquier otro valor filtra por ese estado
  // exacto (aprobada/rechazada) para poder auditar el historial.
  const estadoFiltro = typeof req.query.estado === 'string' ? req.query.estado : 'pendiente'

  try {
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from('solicitudes_conductor')
      .select('id, usuario_id, cedula, foto_placa_url, foto_selfie_url, estado, creado_en')
      .order('creado_en', { ascending: false })

    if (estadoFiltro !== 'todas') {
      query = query.eq('estado', estadoFiltro)
    }

    const { data: solicitudes, error: errorSolicitudes } = await query
    if (errorSolicitudes) throw errorSolicitudes

    if (!solicitudes || solicitudes.length === 0) {
      res.status(200).json({ solicitudes: [] })
      return
    }

    // Segunda query en vez de join embebido: mantiene la lectura simple y
    // no depende de que exista una foreign key con el nombre exacto que
    // PostgREST necesita para el embed automático.
    const usuarioIds = [...new Set(solicitudes.map((s) => s.usuario_id))]
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('usuarios')
      .select('id, nombre, telefono')
      .in('id', usuarioIds)
    if (errorUsuarios) throw errorUsuarios

    const usuariosPorId = new Map((usuarios ?? []).map((u) => [u.id, u]))

    // URLs firmadas en paralelo (dos por solicitud) — best-effort: si una
    // falla (ej. el archivo fue borrado a mano del bucket), no tumba toda la
    // lista, esa solicitud simplemente queda con esa URL en null y el admin
    // ve una imagen rota en vez de que la pantalla entera no cargue.
    const solicitudesConUrls = await Promise.all(
      solicitudes.map(async (solicitud) => {
        const [placaFirmada, selfieFirmada] = await Promise.all([
          supabase.storage
            .from('conductor-verificacion')
            .createSignedUrl(solicitud.foto_placa_url, SEGUNDOS_URL_FIRMADA),
          supabase.storage
            .from('conductor-verificacion')
            .createSignedUrl(solicitud.foto_selfie_url, SEGUNDOS_URL_FIRMADA),
        ])

        if (placaFirmada.error) {
          console.error(
            `[admin-solicitudes-conductor] no se pudo firmar foto_placa_url de ${solicitud.id}:`,
            placaFirmada.error.message,
          )
        }
        if (selfieFirmada.error) {
          console.error(
            `[admin-solicitudes-conductor] no se pudo firmar foto_selfie_url de ${solicitud.id}:`,
            selfieFirmada.error.message,
          )
        }

        const usuario = usuariosPorId.get(solicitud.usuario_id)

        return {
          id: solicitud.id,
          usuarioId: solicitud.usuario_id,
          nombre: usuario?.nombre ?? null,
          telefono: usuario?.telefono ?? null,
          cedula: solicitud.cedula,
          estado: solicitud.estado,
          creadoEn: solicitud.creado_en,
          fotoPlacaUrl: placaFirmada.data?.signedUrl ?? null,
          fotoSelfieUrl: selfieFirmada.data?.signedUrl ?? null,
        }
      }),
    )

    res.status(200).json({ solicitudes: solicitudesConUrls })
  } catch (err) {
    console.error('[admin-solicitudes-conductor] falló la consulta:', err.message)
    res.status(500).json({ error: 'No se pudieron cargar las solicitudes' })
  }
}
