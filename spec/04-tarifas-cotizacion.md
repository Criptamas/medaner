# Configuración de tarifas y cotización de precio — Medaner

**Fecha:** 2026-07-12
**Estado:** decidido (documento semilla de `configuracion/tarifas` pendiente de crear a mano)

## Contexto
Cómo se configuran las tarifas globales y cómo se calcula/cotiza el precio de un viaje antes de crearlo.

## `configuracion/tarifas`: por qué es lectura pública y escritura bloqueada
El cliente no tiene login y necesita leer las tarifas en el navegador para mostrar un precio estimado **antes** de crear el viaje, así que `firestore.rules` da `allow read: if true` a toda la colección `configuracion`.

`allow write: if false` porque el valor no lo toca ni el cliente ni ninguna función — se carga y ajusta a mano desde la consola de Firebase, mismo patrón que `nombre`/`telefono` en `conductores/{uid}` (campos que tampoco están en el `hasOnly` de ningún rol).

## Documento semilla pendiente de crear a mano
No se creó automáticamente — escribir a la base de datos de producción es una decisión del usuario, no algo para automatizar sin supervisión. Pasos en la consola de Firebase:

1. Firestore Database → Iniciar colección (o "+ Agregar colección" si `configuracion` no existe).
2. ID de la colección: `configuracion`.
3. ID del documento: `tarifas` (exacto, minúsculas, sin espacios — el código lo busca por ese ID literal).
4. Agregar estos 6 campos, todos tipo **number**:

   | Campo | Valor |
   |---|---|
   | `tarifaBaseMoto` | `0.50` |
   | `tarifaPorKmMoto` | `0.30` |
   | `tarifaBaseCarro` | `0.80` |
   | `tarifaPorKmCarro` | `0.70` |
   | `tarifaMinima` | `1.00` |
   | `incrementoAjuste` | `0.50` |

5. Guardar. No hace falta subcolección.

Si se agregan más documentos de configuración global (horarios, zonas de cobertura), van como documentos adicionales dentro de la misma colección — la regla ya cubre cualquier `docId` dentro de ella.

## Dónde se engancha en el wizard
El botón "Confirmar viaje" del paso 4 (`MetodoPagoViajeStep`, dentro de `PedirViajePage`) ya no crea el viaje directamente — abre `CotizacionViajeSheet` (bottom sheet sin librerías, mismo patrón visual que `CartDrawer`). El botón "Confirmar viaje" **del sheet** es el que llama a `createViaje` y navega a `/viaje/:id`; si el sheet se cierra sin confirmar, el wizard queda intacto en el paso 4.

Se eligió este punto (y no justo después de elegir destino) porque nombre/teléfono/método de pago —campos del mismo documento— ya están completos ahí.

## Cálculo
Al abrir el sheet se piden en paralelo:
- Tarifas (`useTarifas`, lectura única de `configuracion/tarifas`).
- Distancia real de manejo (`getRouteDistance` en `src/utils/directions.js`, Mapbox Directions API — a diferencia del reverse geocoding, acá un fallo **sí** bloquea con botón "Reintentar", nunca inventa una distancia).

`calcularPrecioBase` (`src/utils/tarifas.js`) aplica tarifa base + tarifa/km según `tipoVehiculo`, aplica el piso `tarifaMinima`, y redondea hacia arriba al múltiplo de `incrementoAjuste` más cercano (con corrección de punto flotante — sin ella, casos como 7.8km en moto podían subir un escalón de más).

El stepper del sheet solo permite **subir** el precio desde `precioBase`, nunca bajarlo.

## Campos nuevos en `viajes`
`distanciaKm`, `duracionEstimadaMin` (puede ser `null`), `precioBase`, `precioFinal` (el que efectivamente aceptó el cliente, con el stepper). El campo `total` (existente, siempre `0`) queda intacto a propósito — no se usa en ningún componente hoy.

## Dónde se muestra `precioFinal`
`ViajeDisponibleCard` (pool), `ViajeActivoCard`, `ConductorViajeDetallePage` (para que el conductor priorice viajes mejor pagados — motivo de que el cliente pueda subir el precio) y `ViajeTrackingPage` (lado cliente). Los cuatro chequean `viaje.precioFinal != null` porque viajes creados antes de este cambio no tienen el campo.

`formatUSD` (`src/utils/tarifas.js`) es un formateador propio — **NO** reusa `priceFormatter` de `pedidoLabels.js`, que está en ARS/es-AR (bug conocido, ver `07-pendientes.md`).

## Consecuencias
- La cotización de precio en el frontend no puede leer nada hasta que se publique la regla de `configuracion` y se cree a mano el documento `tarifas`.
- Cualquier nuevo tipo de vehículo debe agregar sus propios campos `tarifaBase{X}`/`tarifaPorKm{X}` sin romper el esquema existente.