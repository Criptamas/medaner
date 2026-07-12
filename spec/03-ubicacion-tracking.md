# Ubicación en vivo del conductor durante el viaje — Medaner

**Fecha:** 2026-07-12
**Estado:** decidido

## Contexto
Dos campos de ubicación con propósitos distintos existen en el sistema — documentado explícitamente para que no se confundan ni se unifiquen por error.

## Los dos campos (no unificar)
- **`conductores/{uid}.ubicacion`** = `{ lat, lng }` → matching de proximidad para FCM. Lo escribe `useTrackDriverLocation` mientras el conductor está `activo`; lo lee `api/notificar-viaje.js` para notificar solo a conductores cercanos. **El cliente NO puede leerlo** (reglas de `conductores`).
- **`viajes/{viajeId}.ubicacionConductor`** = `{ lat, lng, timestamp }` → seguimiento en vivo que ve el **cliente** en el mapa. Lo escribe el conductor asignado desde `useCompartirUbicacionViaje` mientras el viaje está en `confirmado`/`en_curso`.

## Por qué la ubicación del viaje vive en el doc del viaje
El cliente no tiene login, y las reglas de `conductores` (`get: if isAdmin() || request.auth.uid == conductorId`) le impiden leer el doc del conductor. El viaje sí es legible por cualquiera (`allow get: if true`), así que la única forma de que el cliente vea al conductor moverse es replicar la posición en el viaje. Esa es la fuente de verdad para el seguimiento en vivo.

## Throttle de escritura
`useCompartirUbicacionViaje` escribe como máximo cada **8 segundos** o cuando el conductor se desplaza más de **20 metros** (lo que ocurra primero) — para no agotar la cuota de Firestore (Spark) ni la batería.

`watchPosition` se corta (`clearWatch`) al llegar a `completado` o al desmontar la pantalla del conductor (`ConductorViajeDetallePage`). Permiso de GPS denegado se muestra al conductor sin romper el flujo del viaje.

## Lado cliente
`ViajeTrackingPage` monta `MapaSeguimientoViaje` (lazy, para no meter mapbox-gl ~1.5MB en el bundle principal) solo en `confirmado`/`en_curso`. Mueve el marcador con `setLngLat` sin recrear el mapa, encuadra origen+destino+conductor con `fitBounds` en la primera posición, y deja de renderizar el mapa (corta el seguimiento) al `completado`.

Coordenadas siempre `double`; `timestamp` es numérico (`Date.now()`).

## Riesgo conocido (ver también 00-arquitectura-general.md)
GPS en background no confiable en PWA. Mitigación planeada por etapas: Screen Wake Lock → TWA → Capacitor (app nativa).

## Consecuencias
- Ninguna feature nueva debe leer `conductores/{uid}.ubicacion` desde el cliente — usar siempre `viajes/{id}.ubicacionConductor`.
- No bajar el throttle de 8s/20m sin evaluar cuota de Firestore Spark.