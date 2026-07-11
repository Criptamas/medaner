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

  // TEMP DIAGNÓSTICO (quitar tras resolver el 500): `paso` registra hasta
  // dónde llegó la ejecución. Si la función se cuelga (timeout de red), el
  // último `console.log('[firebase-token] paso: ...')` en los logs de Vercel
  // muestra en qué await quedó colgada; si tira un error atrapable, el cuerpo
  // 500 devuelve el mensaje real para verlo directo en DevTools.
  let paso = 'inicio'
  try {
    paso = 'getSupabaseAdmin'
    console.log('[firebase-token] paso:', paso, '| envs:', {
      urlPresente: !!process.env.VITE_SUPABASE_URL,
      serviceKeyPresente: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      fbProject: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
      fbEmail: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      fbKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    })
    const supabase = getSupabaseAdmin()

    paso = 'getUser'
    console.log('[firebase-token] paso:', paso)
    const { data: { user }, error: errorUser } = await supabase.auth.getUser(accessToken)
    if (errorUser || !user) {
      res.status(401).json({ error: 'No autorizado', _diag: { paso, detalle: errorUser?.message } })
      return
    }

    // El rol SIEMPRE sale de la tabla `usuarios` (poblada por trigger del
    // lado servidor), nunca de `user.user_metadata`: ese metadata lo puede
    // escribir el propio usuario al hacer signup, así que confiar en él
    // permitiría que cualquiera se autoasigne 'admin' o 'conductor' y se
    // mintara un custom token de Firebase con ese rol.
    paso = 'query-usuarios'
    console.log('[firebase-token] paso:', paso, '| uid:', user.id)
    const { data: perfil, error: errorPerfil } = await supabase
      .from('usuarios')
      .select('tipo_usuario')
      .eq('id', user.id)
      .single()
    if (errorPerfil || !perfil) {
      res.status(403).json({ error: 'Perfil no encontrado', _diag: { paso, detalle: errorPerfil?.message } })
      return
    }

    const { tipo_usuario: tipoUsuario } = perfil
    if (!['conductor', 'admin'].includes(tipoUsuario)) {
      // Los clientes no tienen dashboard en Firebase/Firestore con este
      // esquema de reglas: no hace falta (ni conviene) mintarles un token.
      res.status(403).json({ error: 'Rol sin acceso a dashboard', _diag: { paso, tipoUsuario } })
      return
    }

    // Custom token: Firebase Auth lo firma con la cuenta de servicio y el
    // frontend lo cambia por una sesión real vía signInWithCustomToken. El
    // uid queda fijado al uid de Supabase a propósito (ver comentario de
    // arriba). El claim `tipo_usuario` viaja disponible en el ID token
    // resultante por si en el futuro hace falta en reglas o en el cliente.
    paso = 'createCustomToken'
    console.log('[firebase-token] paso:', paso)
    const token = await getAdminAuth().createCustomToken(user.id, { tipo_usuario: tipoUsuario })

    console.log('[firebase-token] paso: OK')
    res.status(200).json({ token, tipoUsuario })
  } catch (err) {
    console.error(`[firebase-token] falló en paso "${paso}":`, err?.code, err?.message)
    res.status(500).json({ error: 'No se pudo generar el token', _diag: { paso, code: err?.code, detalle: err?.message } })
  }
}
