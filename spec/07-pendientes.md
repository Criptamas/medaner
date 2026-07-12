# Pendientes — Medaner

**Estado:** vivo — este archivo se actualiza seguido, a diferencia de los demás specs.

> Nota: a diferencia de `00`–`06`, este archivo no sigue el formato de "decisión documentada" — es una lista de tareas. Cuando una tarea se resuelve y genera una decisión de arquitectura, esa decisión se documenta en su propio spec numerado y se borra de aquí.

## Pendientes activos

- [ ] Definir y construir flujos principales: cliente hace pedido → tienda lo recibe → conductor lo toma → entrega. Falta la parte de la tienda: hoy el pedido va directo al pool de conductores.
- [ ] Panel de tiendas (gestionar productos, ver pedidos entrantes).
- [ ] Autenticación por rol (cliente / conductor / tienda / admin) + redirección post-login según rol. Hoy `LoginPage` manda a `/admin` por defecto.
- [ ] Cancelación de pedidos por el cliente — **postergada a propósito** (decisión 2026-07-08). Cuando se implemente: requiere estado `cancelado` nuevo (ver `01-firestore-schema.md`), regla de Firestore acotada o endpoint, y UI discreta.
- [ ] Corregir moneda: `priceFormatter` en `src/utils/pedidoLabels.js` usa `es-AR`/`ARS` (Argentina) — debería ser USD o VES.
- [ ] Borrar la ruta `/test-mapa` de `App.jsx` antes de producción.
- [ ] A escala: restringir `allow list` de `pedidos` (hoy cualquier conductor autenticado puede listar todos los pedidos con datos de clientes).
- [ ] Publicar la regla de `configuracion` (`firebase deploy --only firestore:rules` o consola) y crear a mano el documento `configuracion/tarifas` (ver `04-tarifas-cotizacion.md`) — la cotización de precio no puede leer nada hasta que se hagan ambas cosas.
- [ ] Testing con usuarios reales en Punto Fijo.

## Bugs críticos actuales (mencionados fuera de este repo, confirmar estado)
- [ ] Conductores registrados y admin reciben error "no registrado" al hacer login.
- [ ] Conductores quedan en home screen en vez de ir al dashboard tras instalar la PWA.

## En progreso
- [ ] Rediseño del flujo de solicitud de viaje en una sola página consolidada.
- [ ] Actualización de paleta de colores en todo el sitio.
- [ ] Migración híbrida de base de datos (Supabase para datos relacionales, Firebase solo FCM) — ver `00-arquitectura-general.md`.
- [ ] Widget de tasa de cambio BCV.
- [ ] Feature de ubicaciones favoritas.