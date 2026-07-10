import { useEffect, useState } from 'react'

// Lee UNA VEZ (fetch simple, sin listener) GET /api/tasa-cambio: la tasa del
// BCV se actualiza a lo sumo una vez al día (ver api/tasa-cambio.js), así que
// no tiene sentido re-consultarla en cada render ni mantener una conexión
// abierta — mismo espíritu que useTarifas.js, pero contra un endpoint HTTP
// propio en vez de leer Firestore directo (el cliente no tiene permisos ni
// motivo para leer configuracion/tasaCambio: ese doc es cache interna del
// endpoint, no un contrato público).
//
// El endpoint puede responder 503 { error } cuando no hay ningún dato
// disponible (ni cache ni la API externa del BCV respondió) — se trata igual
// que un error de red: nunca lanza, solo expone { valor: null, error }.
export function useTasaCambio() {
  const [valor, setValor] = useState(null)
  const [fechaActualizacion, setFechaActualizacion] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false

    async function cargar() {
      setCargando(true)
      setError(null)

      try {
        const response = await fetch('/api/tasa-cambio')
        const data = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(data?.error || `Error ${response.status} al consultar la tasa de cambio`)
        }
        // Defensivo más allá del contrato: si el body no trae un `valor`
        // numérico (ej. respuesta HTML/no-JSON, cuerpo vacío), lo tratamos
        // como error en vez de dejar pasar un valor corrupto — Number(null)
        // es 0, así que sin esta validación un body inesperado se mostraría
        // como una tasa real de "Bs. 0.00" en vez de caer al estado de error.
        if (typeof data?.valor !== 'number' || !Number.isFinite(data.valor)) {
          throw new Error('La respuesta de /api/tasa-cambio no trae un valor numérico válido')
        }
        if (cancelado) return

        setValor(data.valor)
        setFechaActualizacion(data.fechaActualizacion ?? null)
      } catch (err) {
        if (cancelado) return
        setValor(null)
        setFechaActualizacion(null)
        setError(err)
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [])

  return { valor, fechaActualizacion, cargando, error }
}
