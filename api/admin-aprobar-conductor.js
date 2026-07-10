import { randomBytes } from 'node:crypto'
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { getAdminAuth, getAdminDb } from './_lib/firebaseAdmin.js'

function generarPasswordTemporal() {
  // 9 bytes -> 12 caracteres en base64url, suficiente entropía para una
  // contraseña de un solo uso que el conductor va a cambiar/no reutilizar.
  return randomBytes(9).toString('base64url')
}

// Aprueba una solicitud de conductor: crea la cuenta en Firebase Auth (el
// sistema de login de conductores sigue siendo Firebase, no Supabase) y el
// doc en Firestore conductores/{uid}, y marca la solicitud como aprobada en
// Supabase. Sin chequeo de que quien llama es admin de verdad: mismo nivel
// de protección informal que el resto de los endpoints admin-* del repo.
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
      // evita crear dos veces la cuenta de Firebase Auth si el admin hace
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

    const { data: authUsuario, error: errorAuthUsuario } =
      await supabase.auth.admin.getUserById(solicitud.usuario_id)
    if (errorAuthUsuario) throw errorAuthUsuario
    const email = authUsuario?.user?.email
    if (!email) {
      res.status(500).json({ error: 'El usuario no tiene email registrado en Supabase Auth' })
      return
    }

    const passwordTemporal = generarPasswordTemporal()
    const adminAuth = getAdminAuth()

    let nuevoUid
    try {
      const usuarioFirebase = await adminAuth.createUser({
        email,
        password: passwordTemporal,
        displayName: usuario.nombre ?? undefined,
      })
      nuevoUid = usuarioFirebase.uid
    } catch (err) {
      if (err?.code === 'auth/email-already-exists') {
        res.status(409).json({ error: 'Ya existe una cuenta de Firebase Auth con ese email' })
        return
      }
      throw err
    }

    try {
      const db = getAdminDb()
      await db
        .collection('conductores')
        .doc(nuevoUid)
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
      // El usuario de Firebase Auth ya se creó — si dejamos el doc de
      // Firestore sin crear, queda una cuenta huérfana que puede loguearse
      // pero no aparece en ningún lado como conductor. Se limpia antes de
      // devolver el error para no dejar el sistema en un estado intermedio.
      console.error(
        '[admin-aprobar-conductor] falló Firestore tras crear el usuario de Firebase Auth, limpiando:',
        errFirestore.message,
      )
      try {
        await adminAuth.deleteUser(nuevoUid)
      } catch (errLimpieza) {
        // Si ni la limpieza funciona, logueamos fuerte: hay que resolverlo a
        // mano en la consola de Firebase (usuario huérfano sin doc).
        console.error(
          `[admin-aprobar-conductor] no se pudo limpiar el usuario huérfano ${nuevoUid} de Firebase Auth:`,
          errLimpieza.message,
        )
      }
      throw errFirestore
    }

    const { error: errorUpdate } = await supabase
      .from('solicitudes_conductor')
      .update({ estado: 'aprobada', revisado_en: new Date().toISOString() })
      .eq('id', solicitudId)
    if (errorUpdate) throw errorUpdate

    res.status(200).json({ ok: true, conductorUid: nuevoUid, email, passwordTemporal })
  } catch (err) {
    console.error('[admin-aprobar-conductor] falló la aprobación:', err.message)
    res.status(500).json({ error: 'No se pudo aprobar la solicitud' })
  }
}
