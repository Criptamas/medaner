import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { getAdminDb } from './_lib/firebaseAdmin.js'

// Aprueba una solicitud de conductor: crea el doc en Firestore
// conductores/{uid} y marca la solicitud como aprobada en Supabase.
// Ya NO crea una cuenta de Firebase Auth: con el puente Supabase->Firebase
// (api/firebase-token.js) el conductor sigue usando su cuenta de Supabase
// existente para loguearse, y Firestore ve `request.auth.uid` = uid de
// Supabase vía custom token. Crear una segunda cuenta de Firebase Auth acá
// generaría una identidad duplicada (un uid distinto al de Supabase) y
// rompería justamente el puente que hace que las reglas de Firestore
// reconozcan al conductor. El doc de Firestore se crea con
// ID = solicitud.usuario_id porque ESE es el uid que va a traer el custom
// token (ver firebase-token.js).
// Sin chequeo de que quien llama es admin de verdad: mismo nivel de
// protección informal que el resto de los endpoints admin-* del repo.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const { solicitudId } = req.body ?? {}
  if (!solicitudId) {
    res.status(400).json({ error: 'Falta solicitudId' })
    return
  }

  const supabase = getSupabaseAdmin()

  try {
    const { data: solicitud, error: errorSolicitud } = await supabase
      .from('solicitudes_conductor')
      .select('id, usuario_id, cedula, estado')
      .eq('id', solicitudId)
      .maybeSingle()

    if (errorSolicitud) throw errorSolicitud
    if (!solicitud) {
      res.status(404).json({ error: 'Solicitud no encontrada' })
      return
    }
    if (solicitud.estado !== 'pendiente') {
      // No reaprovechar una solicitud ya procesada (aprobada o rechazada):
      // evita recrear/sobrescribir el doc de Firestore si el admin hace
      // doble click o reintenta una llamada que en realidad sí había pasado.
      res.status(409).json({ error: `La solicitud ya está en estado "${solicitud.estado}"` })
      return
    }

    const { data: usuario, error: errorUsuario } = await supabase
      .from('usuarios')
      .select('nombre, telefono')
      .eq('id', solicitud.usuario_id)
      .maybeSingle()
    if (errorUsuario) throw errorUsuario
    if (!usuario) {
      // No debería pasar (FK a usuarios), pero si pasa no tiene sentido
      // seguir: no hay nombre/teléfono que copiar al doc del conductor.
      res.status(404).json({ error: 'No se encontró el usuario asociado a la solicitud' })
      return
    }

    try {
      const db = getAdminDb()
      await db
        .collection('conductores')
        .doc(solicitud.usuario_id)
        .set({
          nombre: usuario.nombre ?? null,
          telefono: usuario.telefono ?? null,
          cedula: solicitud.cedula,
          // Recién aprobado: todavía no puso el switch "Disponible" desde
          // ConductorPage, coherente con que ese campo lo prende el propio
          // conductor, no el admin.
          activo: false,
          cuotaSemanalPagada: false,
          ubicacion: null,
          fcmToken: null,
        })
    } catch (errFirestore) {
      // A diferencia del flujo anterior, ya no hay ninguna cuenta de
      // Firebase Auth que limpiar (no se crea ninguna acá): si el .set
      // falla, la solicitud simplemente queda "pendiente" y el admin puede
      // reintentar sin dejar ningún recurso huérfano.
      console.error(
        '[admin-aprobar-conductor] falló la escritura en Firestore:',
        errFirestore.message,
      )
      throw errFirestore
    }

    const { error: errorUpdate } = await supabase
      .from('solicitudes_conductor')
      .update({ estado: 'aprobada', revisado_en: new Date().toISOString() })
      .eq('id', solicitudId)
    if (errorUpdate) throw errorUpdate

    res.status(200).json({ ok: true, conductorUid: solicitud.usuario_id })
  } catch (err) {
    console.error('[admin-aprobar-conductor] falló la aprobación:', err.message)
    res.status(500).json({ error: 'No se pudo aprobar la solicitud' })
  }
}
