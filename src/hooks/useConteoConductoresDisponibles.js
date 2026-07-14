import { useEffect, useRef, useState } from 'react'

// Mismo intervalo y misma razón que useConductoresDisponibles.js (spec/08 §4):
// el GPS del conductor se escribe como máx cada 8s, pollear más rápido no
// trae datos más frescos.
const INTERVALO_MS = 10000

// Sheet de selección de vehículo ('conductores', antes de crear el viaje):
// conteo en vivo de conductores disponibles por tipo, para mostrarlo junto al
// precio de cada tarjeta (moto/carro). A diferencia del hook hermano
// (useConductoresDisponibles, que trae la LISTA para un solo tipoVehiculo acá
// adentro de la pantalla de espera), acá se pide el CONTEO de ambos tipos en
// una sola llamada porque el sheet muestra las dos tarjetas a la vez — no
// tiene sentido duplicar el polling por vehículo.
export function useConteoConductoresDisponibles(origen, activo) {
  const [conteo, setConteo] = useState({ moto: 0, carro: 0 })
  const [cargando, setCargando] = useState(true)
  const timeoutIdRef = useRef(null)

  // Depende de valores primitivos, no del objeto `origen` (mismo motivo que
  // el hook hermano): `origen` puede llegar recién creado en cada render del
  // padre y no queremos reiniciar la cadena de polling por eso.
  const lat = origen?.lat
  const lng = origen?.lng

  useEffect(() => {
    if (!activo || lat == null || lng == null) {
      setCargando(false)
      return undefined
    }

    let cancelado = false

    async function consultar() {
      try {
        const params = new URLSearchParams({ lat: String(lat), lng: String(lng) })
        const response = await fetch(`/api/conductores-disponibles?${params.toString()}`)
        if (!response.ok) {
          throw new Error(`GET /api/conductores-disponibles respondió ${response.status}`)
        }
        const data = await response.json().catch(() => null)
        if (cancelado) return
        const moto = Number(data?.conteo?.moto)
        const carro = Number(data?.conteo?.carro)
        setConteo({
          moto: Number.isFinite(moto) ? moto : 0,
          carro: Number.isFinite(carro) ? carro : 0,
        })
      } catch {
        // Best-effort (mismo criterio que el hook hermano, spec/08 §4): un
        // error de red no resetea el conteo a 0, se mantiene el último
        // conocido — más útil que mostrar "sin conductores" por un timeout.
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    function programarSiguiente() {
      if (cancelado || document.visibilityState !== 'visible') return
      timeoutIdRef.current = setTimeout(tick, INTERVALO_MS)
    }

    async function tick() {
      if (navigator.onLine) {
        await consultar()
      }
      programarSiguiente()
    }

    function handleVisibilityChange() {
      clearTimeout(timeoutIdRef.current)
      if (document.visibilityState === 'visible') {
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
  }, [lat, lng, activo])

  return { conteo, cargando }
}
