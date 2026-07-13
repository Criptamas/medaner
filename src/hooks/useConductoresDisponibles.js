import { useEffect, useRef, useState } from 'react'

// Cada 10s: el GPS del conductor se escribe como máx cada 8s (spec/03), así
// que pollear más rápido no trae datos más frescos, solo gasta batería/datos
// del cliente (spec/08 §4).
const INTERVALO_MS = 10000

// Pantalla de espera del cliente ('pendiente'): lista en vivo de conductores
// cerca del origen. Usa una CADENA de setTimeout (no setInterval) a propósito
// — cada tick se reprograma recién cuando el fetch anterior terminó, así que
// nunca hay dos requests superpuestos si la red anda lenta.
export function useConductoresDisponibles(origen, tipoVehiculo, activo) {
  const [conductores, setConductores] = useState([])
  const [cargando, setCargando] = useState(true)
  const timeoutIdRef = useRef(null)

  // Se depende de valores primitivos (no del objeto `origen`) porque `origen`
  // suele llegar recién creado en cada snapshot de Firestore del componente
  // padre (useViaje) — si dependiéramos del objeto, el efecto reiniciaría el
  // polling (y perdería el timer en curso) en cada re-render sin necesidad.
  const lat = origen?.lat
  const lng = origen?.lng

  useEffect(() => {
    if (!activo || lat == null || lng == null || !tipoVehiculo) {
      setCargando(false)
      return undefined
    }

    let cancelado = false

    async function consultar() {
      try {
        const params = new URLSearchParams({ lat: String(lat), lng: String(lng), tipoVehiculo })
        const response = await fetch(`/api/conductores-disponibles?${params.toString()}`)
        if (!response.ok) {
          throw new Error(`GET /api/conductores-disponibles respondió ${response.status}`)
        }
        const data = await response.json().catch(() => null)
        if (cancelado) return
        setConductores(Array.isArray(data?.conductores) ? data.conductores : [])
      } catch {
        // Best-effort (spec/08 §4): un error de red NO limpia la lista, se
        // mantiene la última conocida — desaparecer conductores que el
        // cliente ya vio sería peor que mostrar un dato levemente viejo.
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    // Encadena el siguiente tick solo cuando la pestaña está visible: si está
    // en background, no programamos nada más y esperamos a que
    // 'visibilitychange' retome el polling (pausa real, no solo un tick salteado).
    function programarSiguiente() {
      if (cancelado || document.visibilityState !== 'visible') return
      timeoutIdRef.current = setTimeout(tick, INTERVALO_MS)
    }

    async function tick() {
      // navigator.onLine solo detecta "sin adaptador de red" (no garantiza
      // conectividad real), pero alcanza para saltear el intento obvio y no
      // gastar batería reintentando un fetch que sabemos que va a fallar.
      if (navigator.onLine) {
        await consultar()
      }
      programarSiguiente()
    }

    function handleVisibilityChange() {
      clearTimeout(timeoutIdRef.current)
      if (document.visibilityState === 'visible') {
        // Vuelve a foreground: consulta ya (no esperar hasta 10s de dato
        // potencialmente desactualizado) y desde ahí retoma la cadena normal.
        tick()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    tick() // primera carga inmediata

    return () => {
      cancelado = true
      clearTimeout(timeoutIdRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [lat, lng, tipoVehiculo, activo])

  return { conductores, cargando }
}
