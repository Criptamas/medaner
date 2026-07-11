import { getSupabaseAdmin } from './_lib/supabaseAdmin.js'
import { getAdminAuth } from './_lib/firebaseAdmin.js'

// Puente Supabase -> Firebase: conductor/admin inician sesión con Supabase
// Auth, pero Firestore (viajes/pedidos/conductores/tracking/FCM) sigue
// exigiendo `request.auth` de Firebase con un uid concreto (ver
// firestore.rules). Este endpoint verifica la sesión de Supabase y devuelve
// un custom token de Firebase con uid = uid de Supabase, para que el
// frontend haga signInWithCustomToken y `request.auth.uid` en Firestore
// termine siendo el mismo uid que ya identifica al usuario en Supabase — sin
// eso, conductor/admin quedarían sin acceso a Firestore tras la unificación.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const authHeader = req.headers.authorization ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado' })
    return
  }
  const accessToken = authHeader.slice('Bearer '.length).trim()
  if (!accessToken) {
    res.status(401).json({ error: 'No autorizado' })
    return
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data: { user }, error: errorUser } = await supabase.auth.getUser(accessToken)
    if (errorUser || !user) {
      res.status(401).json({ error: 'No autorizado' })
      return
    }

    // El rol SIEMPRE sale de la tabla `usuarios` (poblada por trigger del
    // lado servidor), nunca de `user.user_metadata`: ese metadata lo puede
    // escribir el propio usuario al hacer signup, así que confiar en él
    // permitiría que cualquiera se autoasigne 'admin' o 'conductor' y se
    // mintara un custom token de Firebase con ese rol.
    const { data: perfil, error: errorPerfil } = await supabase
      .from('usuarios')
      .select('tipo_usuario')
      .eq('id', user.id)
      .single()
    if (errorPerfil || !perfil) {
      res.status(403).json({ error: 'Perfil no encontrado' })
      return
    }

    const { tipo_usuario: tipoUsuario } = perfil
    if (!['conductor', 'admin'].includes(tipoUsuario)) {
      // Los clientes no tienen dashboard en Firebase/Firestore con este
      // esquema de reglas: no hace falta (ni conviene) mintarles un token.
      res.status(403).json({ error: 'Rol sin acceso a dashboard' })
      return
    }

    // Custom token: Firebase Auth lo firma con la cuenta de servicio y el
    // frontend lo cambia por una sesión real vía signInWithCustomToken. El
    // uid queda fijado al uid de Supabase a propósito (ver comentario de
    // arriba). El claim `tipo_usuario` viaja disponible en el ID token
    // resultante por si en el futuro hace falta en reglas o en el cliente.
    const token = await getAdminAuth().createCustomToken(user.id, { tipo_usuario: tipoUsuario })

    res.status(200).json({ token, tipoUsuario })
  } catch (err) {
    console.error('[firebase-token] falló la generación del custom token:', err?.message)
    res.status(500).json({ error: 'No se pudo generar el token' })
  }
}
