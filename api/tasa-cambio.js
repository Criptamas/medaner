// DolarApi expone la tasa "oficial" (BCV) sin necesidad de key ni token.
const URL_DOLAR_OFICIAL = 'https://ve.dolarapi.com/v1/dolares/oficial'

// El BCV suele publicar una vez al día; 6h es margen suficiente para no
// mostrar una tasa desactualizada sin martillar la API externa en cada carga
// del Home (potencialmente muchas por minuto).
const SEIS_HORAS_MS = 6 * 60 * 60 * 1000

// Cache EN MEMORIA del módulo. Vercel reutiliza la misma instancia de función
// entre invocaciones ("warm start"), así que este objeto sobrevive entre
// llamadas y evita golpear DolarApi en cada request. En un "cold start" se
// pierde y se vuelve a consultar (barato: la API es pública y liviana).
//
// Antes esta cache vivía en Firestore (configuracion/tasaCambio) vía Firebase
// Admin. Se quitó esa dependencia a propósito: en plena migración a Supabase,
// si las env vars de Firebase Admin no estaban bien, getAdminDb() reventaba
// ANTES del try/catch y el endpoint devolvía 500 → el Home mostraba "Tasa no
// disponible" aunque DolarApi estuviera perfecto. Sin Firebase, ese modo de
// fallo desaparece por completo.
let cache = null // { valor: number, fechaActualizacion: string, guardadoEn: number }

function cacheVigente() {
  return cache && Date.now() - cache.guardadoEn <= SEIS_HORAS_MS
}

export default async function handler(req, res) {
  // A diferencia del resto de los endpoints del repo (POST, disparan una
  // acción), este es de solo lectura: no hay body que validar.
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' })
    return
  }

  // Cache fresca en memoria: respondemos directo, sin tocar la API externa.
  if (cacheVigente()) {
    res.status(200).json({ valor: cache.valor, fechaActualizacion: cache.fechaActualizacion })
    return
  }

  try {
    const response = await fetch(URL_DOLAR_OFICIAL)
    if (!response.ok) throw new Error(`DolarApi respondió ${response.status}`)

    const data = await response.json()
    const { promedio, fechaActualizacion } = data
    if (typeof promedio !== 'number' || !Number.isFinite(promedio)) {
      throw new Error('DolarApi no devolvió un "promedio" numérico')
    }

    cache = { valor: promedio, fechaActualizacion, guardadoEn: Date.now() }
    res.status(200).json({ valor: promedio, fechaActualizacion })
  } catch (err) {
    // Best-effort igual que los otros endpoints que llaman APIs externas (ver
    // reverseGeocode en api/_lib/mapbox.js): sin este log, un fallo acá es
    // invisible en producción porque nunca tumba el endpoint con un throw.
    console.error('[tasa-cambio] falló la consulta a DolarApi:', err.message)

    if (cache) {
      // Cache vieja (>6h) sigue siendo mejor que nada: el conversor del Home
      // no se queda sin dato solo porque la API externa está caída ahora.
      res.status(200).json({ valor: cache.valor, fechaActualizacion: cache.fechaActualizacion })
      return
    }

    // No hay ningún valor, ni fresco ni viejo, que ofrecer.
    res.status(503).json({ error: 'Tasa de cambio no disponible' })
  }
}
