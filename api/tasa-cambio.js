import { getAdminDb } from './_lib/firebaseAdmin.js'
import { FieldValue } from 'firebase-admin/firestore'

// DolarApi expone la tasa "oficial" (BCV) sin necesidad de key ni token.
const URL_DOLAR_OFICIAL = 'https://ve.dolarapi.com/v1/dolares/oficial'

// El BCV suele publicar una vez al día; 6h es margen suficiente para no
// mostrar una tasa desactualizada sin martillar la API externa en cada
// carga del Home (potencialmente muchas por minuto).
const SEIS_HORAS_MS = 6 * 60 * 60 * 1000

function estaVencida(actualizadoEn) {
  // Doc sin este campo (no debería pasar, pero un doc corrupto/manual no se
  // descarta) se trata igual que "vencida": forzamos a refrescar en vez de
  // servir un cache que no podemos fechar.
  if (!actualizadoEn) return true
  return Date.now() - actualizadoEn.toMillis() > SEIS_HORAS_MS
}

export default async function handler(req, res) {
  // A diferencia del resto de los endpoints del repo (POST, disparan una
  // acción), este es de solo lectura: no hay body que validar.
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  const db = getAdminDb()
  const docRef = db.collection('configuracion').doc('tasaCambio')
  const snap = await docRef.get()
  const cache = snap.exists ? snap.data() : null

  // Cache fresco: respondemos directo, sin tocar la API externa.
  if (cache && !estaVencida(cache.actualizadoEn)) {
    res.status(200).json({ valor: cache.valor, fechaActualizacion: cache.fechaActualizacion })
    return
  }

  try {
    const response = await fetch(URL_DOLAR_OFICIAL)
    if (!response.ok) throw new Error(`DolarApi respondió ${response.status}`)

    const data = await response.json()
    const { promedio, fechaActualizacion } = data
    if (typeof promedio !== 'number') {
      throw new Error('DolarApi no devolvió un "promedio" numérico')
    }

    // Sobreescribe (no merge parcial): el doc entero se deriva de esta
    // respuesta, no tiene sentido arrastrar campos viejos.
    await docRef.set({
      valor: promedio,
      fechaActualizacion,
      // Server timestamp, no Date.now(): así "vencida" se mide contra el
      // reloj de Firestore, no el de la función serverless.
      actualizadoEn: FieldValue.serverTimestamp(),
    })

    res.status(200).json({ valor: promedio, fechaActualizacion })
  } catch (err) {
    // Best-effort igual que los otros endpoints que llaman APIs externas
    // (ver reverseGeocode en api/_lib/mapbox.js): sin este log, un fallo acá
    // es invisible en producción porque nunca tumba el endpoint con un error.
    console.error('[tasa-cambio] falló la consulta a DolarApi:', err.message)

    if (cache) {
      // Cache vieja (>6h) sigue siendo mejor que nada: el conversor del Home
      // no se queda sin dato solo porque la API externa está caída ahora.
      res.status(200).json({ valor: cache.valor, fechaActualizacion: cache.fechaActualizacion })
      return
    }

    // Primera llamada de la vida del doc y la API externa está caída: no hay
    // ningún valor, ni fresco ni viejo, que ofrecer.
    res.status(503).json({ error: 'Tasa de cambio no disponible' })
  }
}
