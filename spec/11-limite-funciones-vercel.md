# Límite de funciones serverless (Hobby) y router de admin

**Fecha:** 2026-07-13
**Estado:** decidido (implementado)

## Contexto
El plan **Hobby de Vercel permite máximo 12 funciones serverless por
deployment**. Cada archivo `.js` en el directorio `/api` (nivel superior) cuenta
como una función; los archivos dentro de `/api/_lib/` NO cuentan (prefijo `_`).

El proyecto ya estaba **exactamente en 12** funciones. Al agregar los 3 endpoints
de las features de conductores/puntos (`conductores-disponibles`,
`otorgar-puntos`, `admin-editar-conductor`) el total subió a 15 y **el deploy
falló entero** con:

> *No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan.*

Nada se desplegaba (ni siquiera el frontend), no era un error de código.

## Alternativas consideradas
- **Upgrade a Vercel Pro (~$20/mes):** sube el límite, cero código, pero es
  costo recurrente en dólares — evitable, y el proyecto es sensible al costo.
- **Fold mínimo (dejar 12 justo):** meter los 3 nuevos dentro de funciones
  existentes. Tocaba funciones del flujo del cliente (`notificar-cambio-estado`,
  `conductores-cerca`) y quedaba sin margen (el próximo endpoint volvía a romper).
- **Consolidar los endpoints de admin (elegida):** los 6 `admin-*` son internos
  (solo el panel admin los usa), así que consolidarlos no toca el flujo
  cliente/pago (lo que CLAUDE.md más protege) y libera 5 slots.

## Decisión
Un solo router `api/admin.js` que despacha por `?action=` a los 6 handlers de
admin, cuya lógica (idéntica a la que tenían) vive en `api/_lib/adminHandlers.js`
(no cuenta como función). Se borraron los 6 archivos `api/admin-*.js`.

Acciones del router: `aprobar-conductor`, `rechazar-conductor`,
`solicitudes-conductor`, `tiendas`, `toggle-tienda`, `editar-conductor`.
El método (GET/POST) lo valida cada handler; la `action` se lee del query string.

Frontend: los 4 archivos que llamaban a `/api/admin-*` ahora llaman a
`/api/admin?action=<nombre>` (mismo método y body): `AdminPage`,
`AdminConductorRow`, `useSolicitudesConductor`, `useAllTiendas`.

Resultado: **10 funciones** (`admin`, `cancelar-viaje`, `conductores-cerca`,
`conductores-disponibles`, `firebase-token`, `notificar-cambio-estado`,
`notificar-viaje`, `otorgar-puntos`, `recuperar-pedidos`, `tasa-cambio`) — 2 de
margen.

## Consecuencias
- **Regla para nuevos endpoints de admin:** agregarlos como una `action` nueva en
  `_lib/adminHandlers.js` + una línea en `api/admin.js`, **no** como archivo nuevo
  en `/api`. Así el panel admin no consume slots de función.
- Si a futuro se necesitan muchas más funciones no-admin, evaluar el mismo patrón
  de router por dominio (ej. un `api/conductores.js`) antes que pagar Pro.
- Los endpoints de admin siguen con la misma "protección informal" (no verifican
  identidad de admin real) — sin cambios respecto de antes.
