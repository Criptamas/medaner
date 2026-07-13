import { getSupabaseAdmin } from './supabaseAdmin.js'
import { getAdminDb } from './firebaseAdmin.js'

// Handlers del panel de admin, consolidados desde los antiguos endpoints
// api/admin-*.js en un solo módulo _lib (que Vercel NO cuenta como función
// serverless) para no pasarnos del tope de 12 funciones del plan Hobby. El
// router público es api/admin.js, que despacha por ?action=. La lógica de cada
// handler es idéntica a la que vivía en su archivo propio; solo cambió que son
// exports nombrados y que los imports de _lib ahora son del mismo directorio.
//
// Todos comparten la misma "protección informal": no verifican que quien llama
// sea admin de verdad (limitación conocida, igual que antes de consolidar).

// --- Solicitudes de conductor: aprobar ---
// Aprueba una solicitud de conductor: crea el doc en Firestore
// conductores/{uid} y marca la solicitud como aprobada en Supabase. Ya NO crea
// una cuenta de Firebase Auth: con el puente Supabase->Firebase
// (api/firebase-token.js) el conductor sigue usando su cuenta de Supabase
// existente para loguearse. El doc de Firestore se crea con
// ID = solicitud.usuario_id porque ESE es el uid que va a traer el custom token.
export async function aprobarConductor(req, res) {
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
          // Campos del perfil público (spec/08 §1): los carga el admin después
          // vía editarConductor. Defaults vacíos para que la lista de
          // conductores disponibles y el panel asignado degraden sin romper.
          placa: '',
          fotoPerfilUrl: '',
          motoFotoUrl: '',
          vehiculo: 'moto',
          // Puntos (spec/09): server-write-only, arrancan en 0.
          puntos: 0,
          semanaPuntos: '',
          puntosHoy: 0,
          fechaPuntosHoy: '',
        })
    } catch (errFirestore) {
      console.error(
        '[admin/aprobar-conductor] falló la escritura en Firestore:',
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
    console.error('[admin/aprobar-conductor] falló la aprobación:', err.message)
    res.status(500).json({ error: 'No se pudo aprobar la solicitud' })
  }
}

// --- Solicitudes de conductor: rechazar ---
// A diferencia de aprobar, no toca Firebase (no se creó ninguna cuenta
// todavía) — es un update simple en Supabase.
export async function rechazarConductor(req, res) {
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
    console.error('[admin/rechazar-conductor] falló el rechazo:', err.message)
    res.status(500).json({ error: 'No se pudo rechazar la solicitud' })
  }
}

// Cuánto dura la URL firmada de las fotos: alcanza para que el admin las vea
// al cargar la pantalla (no quedan abiertas indefinidamente, el bucket es
// privado a propósito).
const SEGUNDOS_URL_FIRMADA = 300

// --- Solicitudes de conductor: listar ---
// Lista las solicitudes de conductor para el panel de admin, con el
// nombre/teléfono del usuario asociado y URLs firmadas para ver las fotos.
export async function solicitudesConductor(req, res) {
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
            `[admin/solicitudes-conductor] no se pudo firmar foto_placa_url de ${solicitud.id}:`,
            placaFirmada.error.message,
          )
        }
        if (selfieFirmada.error) {
          console.error(
            `[admin/solicitudes-conductor] no se pudo firmar foto_selfie_url de ${solicitud.id}:`,
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
    console.error('[admin/solicitudes-conductor] falló la consulta:', err.message)
    res.status(500).json({ error: 'No se pudieron cargar las solicitudes' })
  }
}

// --- Tiendas: listar todas ---
// Devuelve TODAS las tiendas (activas e inactivas) para el panel de admin.
// Necesita service_role porque la policy de RLS del catálogo solo deja leer
// tiendas con activa = true a la ANON key.
export async function tiendas(req, res) {
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
    console.error('[admin/tiendas] falló la consulta a Supabase:', err.message)
    res.status(500).json({ error: 'No se pudieron cargar las tiendas' })
  }
}

// --- Tiendas: activar/desactivar ---
// Necesita service_role porque el catálogo no tiene policy de insert/update/
// delete para anon/authenticated — toda escritura pasa por acá.
export async function toggleTienda(req, res) {
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
    console.error('[admin/toggle-tienda] falló el update en Supabase:', err.message)
    res.status(500).json({ error: 'No se pudo actualizar la tienda' })
  }
}

// Vehículos válidos para el campo "vehiculo" (ver spec/08 §1).
const VEHICULOS_VALIDOS = ['moto', 'carro']

// Campos editables por editarConductor. Lista blanca a propósito: estos campos
// quedan FUERA de los `hasOnly` del cliente en firestore.rules (ni el conductor
// ni el admin autenticado por reglas pueden tocarlos) — solo Admin SDK, vía
// este handler, puede escribirlos.
const CAMPOS_EDITABLES = ['placa', 'fotoPerfilUrl', 'motoFotoUrl', 'vehiculo']

// --- Conductor: editar perfil público ---
// Edita el perfil público de un conductor (foto, placa, foto de la moto,
// tipo de vehículo). Separado de aprobarConductor porque ese corre una vez;
// este se usa para cargar/corregir estos datos después, las veces que haga falta.
export async function editarConductor(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const { conductorUid, ...body } = req.body ?? {}
  if (!conductorUid) {
    res.status(400).json({ error: 'Falta conductorUid' })
    return
  }

  if (body.vehiculo !== undefined && !VEHICULOS_VALIDOS.includes(body.vehiculo)) {
    res.status(400).json({ error: "vehiculo debe ser 'moto' o 'carro'" })
    return
  }

  // Solo copiamos al update los campos que realmente vinieron en el body:
  // un PATCH parcial de verdad, no un .set que pisaría con undefined los
  // campos que el caller no mandó (ej. el admin solo cambia la placa, no
  // toda la ficha).
  const updates = {}
  for (const campo of CAMPOS_EDITABLES) {
    if (body[campo] === undefined) continue
    if (typeof body[campo] !== 'string') {
      res.status(400).json({ error: `${campo} debe ser un string` })
      return
    }
    updates[campo] = body[campo]
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No se envió ningún campo para actualizar' })
    return
  }

  try {
    const db = getAdminDb()
    const conductorRef = db.collection('conductores').doc(conductorUid)

    const conductorSnap = await conductorRef.get()
    if (!conductorSnap.exists) {
      res.status(404).json({ error: 'Conductor no encontrado' })
      return
    }

    await conductorRef.update(updates)

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[admin/editar-conductor] falló el update en Firestore:', err.message)
    res.status(500).json({ error: 'No se pudo actualizar el conductor' })
  }
}
