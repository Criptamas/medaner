# CLAUDE.md — Proyecto Medaner

Este archivo define las reglas que Claude Code debe seguir siempre al trabajar en este repositorio.

## Contexto del proyecto

Medaner (medaner.com) es una app web de delivery y taxi/mototaxi para Punto Fijo, estado Falcón, Venezuela.

- **Stack:** React + Vite (PWA)
- **Backend/DB:** Firebase (plan Spark) — Firestore, Auth, FCM. Storage NO disponible (restricción de facturación de Google Cloud en Venezuela) → imágenes vía URL externa (Por ahora)
- **Mapas:** Mapbox
- **Hosting:** Vercel
- **Pagos:** efectivo o pago móvil directo cliente-conductor. Sin Stripe (no soportado en Venezuela). Sin comprobante obligatorio.
- **Modelo de negocio:** conductores pagan $5/semana fijo; a futuro comisión 10–15% a tiendas al escalar.
- **Restricción de hardware del desarrollador:** laptop con 4GB RAM, i3 11va gen, 128GB almacenamiento. Evitar dependencias o procesos de build muy pesados cuando exista una alternativa más liviana.

## Reglas de estilo UI/Frontend

- Diseño moderno, minimalista y simple, pero NO insípido ni genérico.
- Priorizar practicidad y usabilidad sobre decoración innecesaria.
- Usar detalles de diseño con intención (tipografía, espaciado, color) para que se sienta cuidado, sin caer en exceso de elementos.
- Mobile-first: la mayoría de los usuarios finales (clientes y conductores) usarán esto desde el celular.

## Reglas de comunicación

- Responder siempre en español.
- Explicaciones claras, sencillas y concisas.
- No sacrificar información relevante por brevedad: ser directo, no incompleto.

## Reglas de arquitectura y escalabilidad

- Toda decisión de desarrollo debe considerar que el proyecto escalará (más tiendas, más conductores, más ciudades del estado Falcón a futuro).
- Evitar soluciones "quick fix" que compliquen crecer después (estructuras de datos rígidas, lógica hardcodeada, acoplamiento innecesario).
- Estructurar Firestore y el código pensando en que el volumen de datos y usuarios va a crecer.

## Reglas de documentación de código

- Comentar las partes importantes del código, no todo — el comentario debe aportar contexto (el "por qué", no solo el "qué").
- Dejar claridad en archivos clave (configuración, integración con Firebase/Mapbox, lógica de negocio) para que sea fácil retomar el proyecto después.
- Mantener nombres de funciones/variables descriptivos para reducir la necesidad de comentarios obvios.

## Reglas técnicas específicas de Medaner

- No usar Stripe ni asumir pagos con tarjeta — el flujo de pago es efectivo/pago móvil manual.
- No usar Firebase Storage — imágenes siempre vía URL externa.
- Tener en cuenta las limitaciones de recursos del entorno de desarrollo local al sugerir herramientas, dependencias o procesos de build.
- Nunca subir .env ni API keys al repo, reglas de seguridad de Firestore explícitas antes de cada deploy.
- Convención de commits — algo simple tipo **feat:, fix:, docs:** para que el historial no sea un caos cuando el proyecto crezca.
- Manejo de errores consistente: Mostrar errores al usuario (toasts, mensajes) de forma uniforme en toda la app, importante para UX en delivery/taxi donde fallos de red son comunes.
- Offline-first / PWA — ya que es PWA y tus usuarios en Falcón pueden tener conexión inestable, una regla tipo "considerar estados offline/carga lenta en cada feature".
- No romper lo que ya funciona — antes de refactorizar, confirmar que no se rompe el flujo de pago o el matching conductor-cliente.

---

## Estado actual del proyecto

### Infraestructura (Phase 1 completada)
- **Dominio:** medaner.com comprado en Cloudflare (registrar). DNS configurado, proxy de Cloudflare desactivado (DNS only). Apunta a Vercel.
- **Hosting:** Vercel — proyecto deployado con variables de entorno configuradas.
- **Firebase:** proyecto Spark configurado. Firestore activo. Auth activo. FCM activo. Storage omitido (no disponible por restricciones de facturación/país de Google Cloud en Venezuela).
- **Mapas:** Mapbox integrado.
- **Editor:** VS Code + Claude Code.

### Estructura de Firestore

```
tiendas/                        ← colección principal de tiendas
  {tiendaId}/
    nombre: string
    categoria: string
    descripcion: string
    telefono: string
    activa: boolean
    productos/                  ← subcolección de productos por tienda
      {productoId}/
        nombre: string
        descripcion: string
        precio: number (double)
        imagen: string (URL externa — LoremFlickr u otro)
        disponible: boolean

conductores/                    ← colección de conductores
  {conductorId}/
    (campos a definir según avance)
```

### Variables de entorno (.env)
Las siguientes variables deben estar configuradas en `.env` local y en Vercel. **Nunca commitear valores reales al repo.**

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_MAPBOX_TOKEN
```

### Competencia local conocida
- **Colex** — competidor en Falcón. También opera sin comprobante de pago obligatorio, pago efectivo/móvil directo.

### Modelo de negocio actual
- Conductores: **$5/semana fijo** (modelo piloto).
- Tiendas: sin comisión por ahora. A futuro: **10–15% por pedido** al escalar, o tarifa mensual fija.
- Negociación con inversores: vía **SAFE notes**. Pricing a validar con 10 tiendas piloto antes de comprometer modelo definitivo.

### Esquema de estados (nombres exactos en Firestore)
- **Pedidos:** `pendiente → confirmado → en_camino → entregado` (final: `entregado`). No existe `cancelado` todavía.
- **Viajes:** `pendiente → confirmado → en_curso → completado` (final: `completado`).
- Las etiquetas legibles viven centralizadas en `src/utils/pedidoLabels.js` (`ESTADO_BADGE_LABELS` para pedidos, `VIAJE_ESTADO_LABELS` para viajes). Al agregar un estado nuevo, actualizar ahí y revisar los componentes que marcan estados "finales" (`MisPedidosRecientes`).

### Identidades, admin y sesión visible (sin sistema de roles todavía)
- **Admin real:** criptamas@gmail.com → UID `y1AyjaLn7xeL1mfAiDTNu7nNhfV2` ("Juan Rojas"). Es el único UID en `isAdmin()` de `firestore.rules`. **Conductor de prueba:** conductor@prueba.com → UID `vJVgS8PZpSOro7OmcRLtOxMowXy1` ("Carlos Alejandro"); NO es admin.
- No hay sistema de roles: `ProtectedRoute` solo verifica sesión, cualquier usuario logueado puede abrir `/admin` y `/conductor` en el frontend (las reglas de Firestore son las que limitan qué puede escribir cada uno). La autenticación por rol + redirección según quién entra quedó **pendiente a propósito** (decisión del 2026-07-08).
- Los headers de `/admin` y `/conductor` muestran quién está logueado con `src/components/SesionUsuario.jsx`. Resolución del nombre: prop `nombre` (en ConductorPage viene de `conductores/{uid}.nombre`) → mapa UID→nombre de `src/utils/nombresUsuarios.js` (solo personal interno, hoy únicamente el admin) → email. Al implementar roles, reemplazar el mapa por perfiles reales.
- Cambios a `firestore.rules` NO tienen efecto hasta publicarlas (consola de Firebase o `firebase deploy --only firestore:rules`).

### Disponibilidad del conductor — campo `activo`
- El campo que marca disponibilidad en `conductores/{uid}` se llama **`activo`** (boolean), NO `disponible`. Lo escriben `ConductorPage` (switch) vía `useDocToggle`, y lo lee `api/notificar-viaje.js` (`where('activo', '==', true)`). No renombrarlo sin tocar frontend + función + reglas a la vez.
- El documento del conductor DEBE crearse en la consola con **ID = UID de Firebase Auth** del conductor. Si no coincide, el conductor ve "perfil no configurado" (la pantalla ahora muestra el UID exacto para facilitar la creación).
- Reglas de Firestore: el propio conductor solo puede escribir `activo`, `ubicacion` y `fcmToken` en su doc; el admin solo `cuotaSemanalPagada`.
- **Identidad del conductor (`nombre`, `telefono`):** son campos de solo lectura para el conductor, gestionados por el admin en la consola (no están en su `hasOnly`, igual que `cuotaSemanalPagada`). `nombre` ya se usaba en los headers; **`telefono` es nuevo** y se copia al viaje al aceptar para que el cliente lo contacte por WhatsApp (ver "Nombres legibles de ubicación y contacto por WhatsApp"). Si un conductor no tiene `telefono` cargado, el cliente simplemente no verá el botón de WhatsApp (degrada, no rompe).

### Seguimiento de pedidos/viajes del cliente (sin login)
- Como no hay cuentas de cliente, la referencia a sus pedidos/viajes activos vive en **localStorage** del navegador: clave `medaner_pedidos_activos`, array de `{ id, tipo: 'pedido'|'viaje', createdAt }`. Helpers en `src/utils/seguimientoLocal.js`; UI en `src/components/MisPedidosRecientes.jsx` (Home). Entradas de más de 24 h o en estado final se limpian solas.
- **Recuperación por teléfono (sin login):** si el cliente pierde el localStorage (borró caché, cambió de dispositivo), puede recuperar sus pedidos/viajes activos con su número de teléfono desde la Home (`src/components/RecuperarPedidos.jsx`, sección discreta y colapsada bajo "Mis pedidos recientes"). Funciona así:
  - Al crear pedido/viaje, `useCreateOrder`/`useCreateViaje` guardan `clienteTelefonoNormalizado` (10 dígitos nacionales, ej. `4121234567`) además del `clienteTelefono` tal como lo escribió el cliente. El normalizador compartido vive en `src/utils/telefono.js` (`normalizarTelefono`) — **no cambiar su lógica sin migrar datos**, es el contrato entre creación y búsqueda. Regla al tocarlo: los cambios solo pueden **AMPLIAR** los formatos aceptados (que un input antes rechazado pase a normalizar), **nunca** cambiar el resultado de un formato que ya normalizaba bien. Hoy tolera `0412…`, `4121234567`, `+58…` (12 dígitos) y `+58` pegado sin quitar el 0 de troncal (13 dígitos, ej. `5804121234567`).
  - `POST /api/recuperar-pedidos` (`api/recuperar-pedidos.js`, Admin SDK) recibe `{ telefono }`, normaliza, y busca por `clienteTelefonoNormalizado` en `pedidos` y `viajes`. Filtra en código (sin índice compuesto) estados finales y más de 24 h; tope 20 resultados. Devuelve **solo** `{ id, tipo, estado }` — es un endpoint público y no debe exponer nombre/dirección por teléfono. La lectura va por endpoint porque las reglas NO permiten `list` sin auth (y no hay que abrirlas).
  - En éxito, el front reinyecta los resultados al localStorage (`agregarPedidoActivo`) y `StoreListPage` remonta `MisPedidosRecientes` vía `key` (ese componente lee localStorage solo al montar).
  - Documentos anteriores a este cambio no tienen `clienteTelefonoNormalizado` y no aparecen en la búsqueda (aceptado, solo afecta datos de prueba).

### Ubicación en vivo del conductor durante el viaje
- **Dos campos de ubicación con propósitos distintos (no confundirlos ni unificarlos):**
  - `conductores/{uid}.ubicacion` = `{ lat, lng }` → matching de proximidad para FCM. Lo escribe `useTrackDriverLocation` mientras el conductor está `activo`; lo lee `api/notificar-viaje.js` para notificar solo a conductores cercanos. **El cliente NO puede leerlo** (reglas de `conductores`).
  - `viajes/{viajeId}.ubicacionConductor` = `{ lat, lng, timestamp }` → seguimiento en vivo que ve el **cliente** en el mapa. Lo escribe el conductor asignado desde `useCompartirUbicacionViaje` mientras el viaje está en `confirmado`/`en_curso`.
- **Por qué la ubicación del viaje vive en el doc del viaje y no en el del conductor:** el cliente no tiene login, y las reglas de `conductores` (`get: if isAdmin() || request.auth.uid == conductorId`) le impiden leer el doc del conductor. El viaje sí es legible por cualquiera (`allow get: if true`), así que la única forma de que el cliente vea al conductor moverse es replicar la posición en el viaje. Esa es la fuente de verdad para el seguimiento en vivo.
- **Throttle de escritura:** `useCompartirUbicacionViaje` escribe como máximo cada **8 s** o cuando el conductor se desplaza más de **20 m** (lo que ocurra primero), para no agotar la cuota de Firestore (Spark) ni la batería. `watchPosition` se corta (`clearWatch`) al llegar a `completado` o al desmontar la pantalla del conductor (`ConductorViajeDetallePage`). Permiso de GPS denegado se muestra al conductor sin romper el flujo del viaje.
- **Lado cliente:** `ViajeTrackingPage` monta `MapaSeguimientoViaje` (lazy, para no meter mapbox-gl ~1.5 MB en el bundle principal) solo en `confirmado`/`en_curso`; mueve el marcador con `setLngLat` sin recrear el mapa, encuadra origen+destino+conductor con `fitBounds` en la primera posición, y deja de renderizar el mapa (corta el seguimiento) al `completado`.
- Coordenadas siempre `double`; `timestamp` es numérico (`Date.now()`).

### Nombres legibles de ubicación y contacto por WhatsApp
- **Cobertura real de Mapbox en Falcón (verificado en vivo contra la API, no asumido):** Mapbox **no tiene datos de calle/avenida/barrio/POI** para Punto Fijo ni para Venezuela en general — se probó forzando `types=address,poi,neighborhood,locality` contra Punto Fijo, Coro y hasta Caracas, y devuelve 0 resultados en los tres casos, tanto en la API v5 como en la v6. Lo más específico que existe es nivel municipio/parroquia (`place`, ej. "Carirubana"). Por eso `reverseGeocode` (`src/utils/geocode.js` y su espejo `api/_lib/mapbox.js`) pide `types=address,poi,neighborhood,locality,place,region` — excluye a propósito `postcode` (sin el filtro, el "best match" de Mapbox elegía el código postal y daba resultados confusos tipo "Carirubana, Falcón, 41, Venezuela") y `country` (ruido redundante, la app es solo Venezuela) — y recorta el sufijo ", Venezuela" del resultado. Con el filtro, el resultado limpio es **"Carirubana, Falcón"**. Si Mapbox mejora su cobertura en la zona más adelante, este mismo filtro empieza a devolver address/poi/neighborhood automáticamente, sin tocar código. **Se evaluó Google Maps Geocoding como alternativa y se descartó:** exige cuenta de Cloud Billing, y Venezuela no está en los países soportados por Google Payments — la misma restricción ya documentada para Firebase Storage.
- **Por qué hace falta una referencia manual:** dado que Mapbox nunca va a dar más que el municipio/parroquia en esta zona, y el conductor **no ve ningún mapa** en su pantalla (`ConductorViajeDetallePage` es solo texto), depender solo del geocoding dejaría al conductor sin forma real de ubicar al cliente. Por eso `SelectorUbicacion` pide, además del pin, un campo de texto corto **obligatorio** ("Referencia: calle, avenida, punto conocido") una vez que hay un punto seleccionado — `UbicacionViajeStep` no deja avanzar (`disabled` en "Confirmar ubicación") hasta que haya referencia escrita, tanto en el paso de origen como en el de destino.
  - *Matiz pendiente de decisión consciente (no implementado):* en destino el pasajero ya va en el vehículo y puede guiar en vivo, así que la referencia pesa menos ahí que en origen (donde el conductor va "a ciegas"). Si en la práctica genera fricción/abandono en el paso de destino, la solución es diferenciar con una prop (ej. `referenciaRequerida`) en vez de volverla opcional en los dos.
- **Nombres de origen/destino:** el viaje guarda, además de las coordenadas (`origen`/`destino` = `{ lat, lng }`, que siguen siendo la fuente de verdad para mapa y matching), dos strings legibles **`origenNombre`** y **`destinoNombre`**. Cada uno combina la referencia manual + el nombre geocodificado vía `combinarDireccion(referencia, nombreGeocodificado)` (en `useCreateViaje`): `"{referencia} — {nombreGeocodificado}"` si hay ambos, o el que exista si falta uno (nunca queda vacío si al menos uno de los dos tiene contenido). El texto manual crudo se guarda además por separado en **`origenReferencia`**/**`destinoReferencia`** (sin mezclar en el string combinado) para poder mostrarlo/editarlo/buscarlo después sin parsear — evita la estructura rígida de un solo string opaco. Se resuelven **una sola vez al crear el viaje**, no en cada render (offline-first + ahorra llamadas a Mapbox). `SelectorUbicacion` resuelve el geocoding al mover el pin y lo muestra bajo el mapa junto al input de referencia; `UbicacionViajeStep` → `PedirViajePage` → `useCreateViaje` propagan `{ lat, lng, nombre, referencia }` sin tocar su contenido. **La UI siempre muestra `origenNombre || formatCoords(origen)`** (fallback a coordenadas para viajes viejos sin estos campos). El geocoding en sí sigue siendo best-effort: si falla, `origenNombre` cae a solo la referencia (sigue siendo útil) y **nunca bloquea** la creación del viaje — lo único obligatorio es la referencia manual, no el geocoding. `api/notificar-viaje.js` reusa `origenNombre`/`destinoNombre` si vienen, y solo hace reverse geocode en el servidor cuando faltan (cada vez menos frecuente, ya que la referencia sola alcanza para que el campo no esté vacío).
- **Identidad del conductor en el viaje (`conductorNombre`, `conductorTelefono`):** los copia `acceptViaje` (`src/hooks/useViajeActions.js`) al doc del viaje en el momento de aceptar, tomándolos del perfil propio del conductor (`useConductorPropio`, que sí puede leer su `conductores/{uid}`). **Mismo motivo que la ubicación en vivo:** el cliente no tiene login y las reglas le impiden leer `conductores/{uid}`, así que el viaje (público) es la única fuente que puede leer para saber quién lo va a buscar. No requiere cambios de reglas (`viajes` ya tiene `allow update: if request.auth != null`).
- **Contacto por WhatsApp:** `construirEnlaceWhatsApp(telefono)` (`src/utils/telefono.js`) arma `https://wa.me/58<10 dígitos>` reutilizando `normalizarTelefono`; devuelve `null` si el teléfono no es válido, y en ese caso la UI cae a texto plano (nunca un link roto). El **cliente** ve "«{conductorNombre}» aceptó tu viaje" + botón a WhatsApp del conductor en `ViajeTrackingPage` (aparece cuando `conductorNombre` existe). El **conductor** ve el botón a WhatsApp del cliente en `ConductorViajeDetallePage`. En tarjetas envueltas en `<Link>` (`ViajeActivoCard`) el contacto es un `<button>` con `preventDefault`+`stopPropagation`+`window.open` para no anidar `<a>` ni navegar la tarjeta.
- **Decisión de producto (revisable):** el conductor ve el teléfono del cliente **solo después de aceptar** el viaje (condición `esMio` en `ConductorViajeDetallePage`), consistente con `ViajeActivoCard` (viajes míos, muestra teléfono) vs `ViajeDisponibleCard` (pool sin asignar, no lo muestra). Para que el conductor pueda contactar al cliente **antes** de aceptar (viaje aún `pendiente`), quitar el gate `esMio` de esa sección.

### Próximos pasos pendientes
- Definir y construir flujos principales: cliente hace pedido → tienda lo recibe → conductor lo toma → entrega (falta la parte de la tienda: hoy el pedido va directo al pool de conductores).
- Panel de tiendas (gestionar productos, ver pedidos entrantes).
- Autenticación por rol (cliente / conductor / tienda / admin) + redirección post-login según rol (hoy LoginPage manda a `/admin` por defecto).
- Cancelación de pedidos por el cliente: **postergada a propósito** (decisión del 2026-07-08). Cuando se haga, requiere estado `cancelado` nuevo (ver "Esquema de estados"), regla de Firestore acotada o endpoint, y UI discreta.
- Corregir moneda: `priceFormatter` en `src/utils/pedidoLabels.js` usa `es-AR`/`ARS` (Argentina) — debería ser USD o VES.
- Borrar la ruta `/test-mapa` de `App.jsx` antes de producción.
- A escala: restringir `allow list` de `pedidos` (hoy cualquier conductor autenticado puede listar todos los pedidos con datos de clientes).
- Testing con usuarios reales en Punto Fijo.


# Agent Delegation Rules

Before starting any task:

- Always determine whether a specialized subagent should handle part of the work.
- Prefer delegating frontend work to Frontend Expert.
- Prefer delegating backend work to Backend Expert.
- Prefer delegating validation and testing to QA Testing Expert.
- For tasks spanning multiple domains, decompose the work and delegate each part to the appropriate subagent before producing the final result.
- Do not perform specialized work directly if a matching subagent exists.