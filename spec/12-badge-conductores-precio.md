# Badge de conductores disponibles junto al precio (VehiculoSeleccionSheet)

**Fecha:** 2026-07-14
**Estado:** decidido e implementado

## Contexto
Al probar el flujo de pedir un viaje, la lista de conductores disponibles de
`spec/08-conductores-perfil-y-lista.md` (mostrada en `BuscandoConductorPanel`,
mientras el cliente espera que alguien acepte) salía vacía. Esa feature ya
estaba completa en código — el síntoma real era de datos: el filtro exige
`conductor.vehiculo` seteado y `activo === true` con `ubicacion`, y ese campo
no estaba cargado en los conductores de prueba (pendiente ya anotado en
`07-pendientes.md`).

A partir de esa revisión surgió una feature nueva, no cubierta por `08`: un
badge verde con el número de conductores disponibles, junto al precio de cada
vehículo (moto/carro) en `VehiculoSeleccionSheet` — el paso **anterior** a
crear el viaje, donde el cliente todavía está eligiendo vehículo y precio.
Ahí no existía ninguna señal de cuántos conductores hay cerca.

## Decisión

### 1. Modo conteo en el endpoint existente, no uno nuevo
El proyecto está en 10/12 funciones serverless (Hobby de Vercel, ver `11`), así
que en vez de crear un archivo nuevo en `/api`, se extendió
`api/conductores-disponibles.js`:

- `tipoVehiculo` en el query string (como hasta ahora) → comportamiento
  **sin cambios**: `{ conductores: [...] }` con foto/nombre/puntos/distancia/ETA
  de un solo tipo de vehículo, usado por `BuscandoConductorPanel`.
- `tipoVehiculo` **ausente** → modo nuevo: `{ conteo: { moto: n, carro: m } }`,
  sin identidad ni orden por puntos (es un número, no una lista de vitrina).

Ambos modos comparten el mismo universo de "candidatos" (`activo === true`,
tiene `ubicacion`, `haversineKm <= 5`), extraído a
`obtenerConductoresCandidatos(db, origen)` dentro del mismo archivo — el modo
detalle filtra ese universo por `tipoVehiculo`, el modo conteo lo agrupa por
`conductor.vehiculo`.

### 2. Hook nuevo, mismo patrón de polling que el hermano
`useConteoConductoresDisponibles(origen, activo)` (`src/hooks/`) sigue el
mismo criterio que `useConductoresDisponibles` (spec/08 §4): cadena de
`setTimeout` cada 10s (no `setInterval`), pausa por `visibilitychange`,
best-effort en error de red (no resetea el conteo a 0). Difiere en que pide
**ambos** tipos de vehículo en una sola llamada, porque el sheet muestra las
dos tarjetas a la vez — pollear dos veces por separado sería duplicar
requests sin necesidad.

Arranca con `activo=true` fijo, independiente de si `tarifas`/`ruta` ya
resolvieron: el conteo de conductores no depende del cálculo de precio.

### 3. UI: badge no se muestra hasta la primera respuesta
`TarjetaVehiculo` no renderiza el badge mientras `cargandoConteo` es `true`
(evita el flash de "0" antes del primer fetch). Una vez cargado:
- `disponibles > 0` → badge con fondo `var(--green)`.
- `disponibles === 0` → se **sigue mostrando el número** (pedido explícito:
  no ocultar), pero en variante neutra (`--vacio`: borde `#3a4552`, texto
  `#9aa5b1`, ya usados en este archivo) — verde con "0" leería como
  "hay disponibilidad" cuando no la hay.

## Bug encontrado y corregido: `--green` no era verde
Al verificar visualmente, `--green` en `src/index.css` valía `#e6e6e6` (gris
claro) en vez de `#22c55e`. El comentario del propio token (y `10-header-
logueado-saludo.md`, que documenta la decisión original) siempre dijo que
debía ser el mismo verde que el pin de "destino" en `MapaConductoresView`
(`#22C55E`) — quedó desincronizado en algún momento posterior, afectando ya
en producción a `TasaCambioWidget` y `AdminConductorRow`, que también leen
`var(--green)`. Se corrigió el valor del token (un solo carácter de
diferencia real: `e6e6e6` → `22c55e`); no se tocó `MapaConductoresView.jsx`
(sigue con el hex hardcodeado del pin, fuera de alcance acá, ver `07`).

## Consecuencias
- El badge (y los otros dos componentes que ya usaban `--green`) ahora se ven
  verdes como estaba decidido originalmente — antes se veían gris claro.
- Nuevo request cada 10s mientras el sheet está montado (además del polling
  ya existente de `useTarifas`/`getRouteDistance` en el mismo componente):
  payload mínimo (`{conteo:{moto,carro}}`), sin identidad de conductores.
- Mismo pendiente de `07`: sin rate-limiting en este endpoint público
  (comparte el mismo pendiente que el modo detalle).
- La lista de `BuscandoConductorPanel` (spec/08) y el badge de este spec
  ahora comparten el mismo endpoint con dos contratos de respuesta distintos
  según presencia de `tipoVehiculo` — cualquier cambio futuro al endpoint debe
  revisar que no rompa ninguno de los dos modos.
