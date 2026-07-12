# Seguimiento de pedidos/viajes sin cuenta de cliente — Medaner

**Fecha:** 2026-07-12
**Estado:** decidido

## Contexto
Como no hay cuentas de cliente, se necesitó un mecanismo para que el cliente recupere la visibilidad de sus pedidos/viajes activos, tanto en el mismo dispositivo como si pierde el localStorage.

## localStorage como referencia primaria
Clave `medaner_pedidos_activos`, array de `{ id, tipo: 'pedido'|'viaje', createdAt }`. Helpers en `src/utils/seguimientoLocal.js`; UI en `src/components/MisPedidosRecientes.jsx` (Home). Entradas de más de 24h o en estado final se limpian solas.

## Recuperación por teléfono (sin login)
Si el cliente pierde el localStorage (borró caché, cambió de dispositivo), puede recuperar sus pedidos/viajes activos con su número de teléfono desde la Home (`src/components/RecuperarPedidos.jsx`, sección discreta y colapsada bajo "Mis pedidos recientes").

### Cómo funciona
1. Al crear pedido/viaje, `useCreateOrder`/`useCreateViaje` guardan `clienteTelefonoNormalizado` (10 dígitos nacionales, ej. `4121234567`) además del `clienteTelefono` tal como lo escribió el cliente.
2. El normalizador compartido vive en `src/utils/telefono.js` (`normalizarTelefono`) — **no cambiar su lógica sin migrar datos**, es el contrato entre creación y búsqueda. Regla al tocarlo: los cambios solo pueden **AMPLIAR** los formatos aceptados, **nunca** cambiar el resultado de un formato que ya normalizaba bien. Hoy tolera `0412…`, `4121234567`, `+58…` (12 dígitos) y `+58` pegado sin quitar el 0 de troncal (13 dígitos, ej. `5804121234567`).
3. `POST /api/recuperar-pedidos` (`api/recuperar-pedidos.js`, Admin SDK) recibe `{ telefono }`, normaliza, y busca por `clienteTelefonoNormalizado` en `pedidos` y `viajes`. Filtra en código (sin índice compuesto) estados finales y más de 24h; tope 20 resultados. Devuelve **solo** `{ id, tipo, estado }` — es un endpoint público y no debe exponer nombre/dirección por teléfono.
4. La lectura va por endpoint porque las reglas NO permiten `list` sin auth (y no hay que abrirlas).
5. En éxito, el front reinyecta los resultados al localStorage (`agregarPedidoActivo`) y `StoreListPage` remonta `MisPedidosRecientes` vía `key` (ese componente lee localStorage solo al montar).

## Limitación conocida
Documentos anteriores a este cambio no tienen `clienteTelefonoNormalizado` y no aparecen en la búsqueda (aceptado, solo afecta datos de prueba).

## Consecuencias
- Cualquier endpoint público nuevo sobre `pedidos`/`viajes` debe seguir el mismo principio de mínima exposición de datos (`id`, `tipo`, `estado`, nada de datos personales).
- No modificar `normalizarTelefono` de forma que cambie el resultado de un formato ya aceptado, sin plan de migración de datos existentes.