# Nombres legibles de ubicación e identidad/contacto — Medaner

**Fecha:** 2026-07-12
**Estado:** decidido (un matiz pendiente, ver abajo)

## Contexto
Cómo se resuelven nombres legibles de origen/destino (dada la baja cobertura de Mapbox en Falcón) y cómo se identifican/contactan cliente y conductor sin sistema de cuentas de cliente.

## Cobertura real de Mapbox en Falcón (verificado en vivo, no asumido)
Mapbox **no tiene datos de calle/avenida/barrio/POI** para Punto Fijo ni Venezuela en general — se probó forzando `types=address,poi,neighborhood,locality` contra Punto Fijo, Coro y Caracas, y devuelve 0 resultados en los tres casos, tanto en API v5 como v6. Lo más específico que existe es nivel municipio/parroquia (`place`, ej. "Carirubana").

Por eso `reverseGeocode` (`src/utils/geocode.js` y su espejo `api/_lib/mapbox.js`) pide `types=address,poi,neighborhood,locality,place,region` — excluye a propósito:
- `postcode` (sin el filtro, el "best match" de Mapbox elegía el código postal → resultados confusos tipo "Carirubana, Falcón, 41, Venezuela").
- `country` (ruido redundante, la app es solo Venezuela).

Y recorta el sufijo ", Venezuela" del resultado. Resultado limpio: **"Carirubana, Falcón"**.

Si Mapbox mejora su cobertura en la zona más adelante, este mismo filtro empieza a devolver address/poi/neighborhood automáticamente, sin tocar código.

**Google Maps Geocoding evaluado y descartado:** exige cuenta de Cloud Billing, y Venezuela no está en los países soportados por Google Payments — misma restricción documentada para Firebase Storage.

## Por qué hace falta una referencia manual
Dado que Mapbox nunca va a dar más que el municipio/parroquia en esta zona, y el conductor **no ve ningún mapa** en su pantalla (`ConductorViajeDetallePage` es solo texto), depender solo del geocoding dejaría al conductor sin forma real de ubicar al cliente.

Por eso `SelectorUbicacion` pide, además del pin, un campo de texto corto **obligatorio** ("Referencia: calle, avenida, punto conocido") una vez seleccionado un punto — `UbicacionViajeStep` no deja avanzar (`disabled` en "Confirmar ubicación") hasta que haya referencia escrita, tanto en origen como en destino.

**Matiz pendiente de decisión consciente (no implementado):** en destino el pasajero ya va en el vehículo y puede guiar en vivo, así que la referencia pesa menos ahí que en origen (donde el conductor va "a ciegas"). Si en la práctica genera fricción/abandono en el paso de destino, la solución es diferenciar con una prop (ej. `referenciaRequerida`) en vez de volverla opcional en los dos pasos.

## Nombres de origen/destino
El viaje guarda, además de las coordenadas (`origen`/`destino` = `{ lat, lng }`, fuente de verdad para mapa y matching), dos strings legibles: **`origenNombre`** y **`destinoNombre`**.

Cada uno combina la referencia manual + el nombre geocodificado vía `combinarDireccion(referencia, nombreGeocodificado)` (en `useCreateViaje`): `"{referencia} — {nombreGeocodificado}"` si hay ambos, o el que exista si falta uno (nunca queda vacío si al menos uno tiene contenido).

El texto manual crudo se guarda además por separado en **`origenReferencia`**/**`destinoReferencia`** (sin mezclar en el string combinado) para poder mostrarlo/editarlo/buscarlo después sin parsear.

Se resuelven **una sola vez al crear el viaje**, no en cada render (offline-first + ahorra llamadas a Mapbox). `SelectorUbicacion` resuelve el geocoding al mover el pin y lo muestra bajo el mapa junto al input de referencia; `UbicacionViajeStep` → `PedirViajePage` → `useCreateViaje` propagan `{ lat, lng, nombre, referencia }` sin tocar su contenido.

**La UI siempre muestra `origenNombre || formatCoords(origen)`** (fallback a coordenadas para viajes viejos sin estos campos). El geocoding es best-effort: si falla, `origenNombre` cae a solo la referencia (sigue siendo útil) y **nunca bloquea** la creación del viaje — lo único obligatorio es la referencia manual, no el geocoding.

`api/notificar-viaje.js` reusa `origenNombre`/`destinoNombre` si vienen, y solo hace reverse geocode en el servidor cuando faltan.

## Identidad del conductor en el viaje
`conductorNombre`, `conductorTelefono` los copia `acceptViaje` (`src/hooks/useViajeActions.js`) al doc del viaje al momento de aceptar, tomándolos del perfil propio del conductor (`useConductorPropio`, que sí puede leer su `conductores/{uid}`). Mismo motivo que la ubicación en vivo: el cliente no tiene login y las reglas le impiden leer `conductores/{uid}`, así que el viaje (público) es la única fuente que puede leer. No requiere cambios de reglas (`viajes` ya tiene `allow update: if request.auth != null`).

## Contacto por WhatsApp
`construirEnlaceWhatsApp(telefono)` (`src/utils/telefono.js`) arma `https://wa.me/58<10 dígitos>` reutilizando `normalizarTelefono`; devuelve `null` si el teléfono no es válido, y ahí la UI cae a texto plano (nunca un link roto).

- El **cliente** ve "«{conductorNombre}» aceptó tu viaje" + botón a WhatsApp del conductor en `ViajeTrackingPage` (aparece cuando `conductorNombre` existe).
- El **conductor** ve el botón a WhatsApp del cliente en `ConductorViajeDetallePage`.
- En tarjetas envueltas en `<Link>` (`ViajeActivoCard`) el contacto es un `<button>` con `preventDefault`+`stopPropagation`+`window.open` para no anidar `<a>` ni navegar la tarjeta.

## Decisión de producto (revisable)
El conductor ve el teléfono del cliente **solo después de aceptar** el viaje (condición `esMio` en `ConductorViajeDetallePage`), consistente con `ViajeActivoCard` (viajes míos, muestra teléfono) vs `ViajeDisponibleCard` (pool sin asignar, no lo muestra). Para permitir contacto **antes** de aceptar (viaje aún `pendiente`), quitar el gate `esMio` de esa sección.

## `telefono` en `conductores/{uid}`
Campo de solo lectura para el conductor (igual que `nombre`), gestionado por el admin en la consola. Se copia al viaje al aceptar para que el cliente contacte por WhatsApp. Si un conductor no tiene `telefono` cargado, el cliente simplemente no ve el botón de WhatsApp (degrada, no rompe).

## Consecuencias
- No implementar Google Maps Geocoding como alternativa a Mapbox mientras Venezuela siga fuera de los países soportados por Google Payments.
- Cualquier feature que necesite "dirección exacta" debe apoyarse en la referencia manual, no asumir que el geocoding la va a dar.