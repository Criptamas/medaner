# Notificaciones push (FCM) — Medaner

**Fecha:** 2026-07-12
**Estado:** decidido

## Contexto
Todo el manejo de push notifications para conductor (viaje nuevo cerca) y cliente (cambio de estado de su viaje). Esta área tuvo varios bugs sutiles ya resueltos — este documento existe para no repetirlos.

## Service worker único
`src/sw.js` (no `public/firebase-messaging-sw.js` separado) fusiona el precacheo de la PWA (Workbox, modo `injectManifest` en `vite.config.js`) con `messaging.onBackgroundMessage()` y el handler de `notificationclick` que navega a `data.url`. Dos service workers registrados en la misma ruta raíz competirían entre sí — por eso están fusionados en uno solo, a propósito.

El config de Firebase está hardcodeado ahí (son valores públicos, no secretos) porque un service worker estático no puede leer `import.meta.env`.

## `getToken()` requiere `serviceWorkerRegistration` explícito
Si no se le pasa, el SDK de Firebase intenta registrar su propio SW en `/firebase-messaging-sw.js` (no existe acá) y falla con `messaging/failed-service-worker-registration`.

`useFcmToken` se lo pasa vía `navigator.serviceWorker.ready` (el SW que registra `registerSW()` en `main.jsx`), con timeout de 5s porque `ready` **nunca resuelve** si no hay SW registrado — el caso de `npm run dev` (vite-plugin-pwa no sirve el SW ahí).

**Corolario: las push no funcionan en modo desarrollo.** Probarlas sobre build (`npm run build && npm run preview`) o sobre el deploy de Vercel.

## Payload data-only, sin la clave `notification`
Si el mensaje trae `notification`, el SDK de FCM muestra la notificación por su cuenta **y además** invoca `onBackgroundMessage()`, que la muestra otra vez → notificación **duplicada** (ver `onPush` en `@firebase/messaging/dist/index.sw.cjs`).

Por eso `title`/`body` viajan dentro de `data` en `api/notificar-viaje.js` y `api/notificar-cambio-estado.js`, y `src/sw.js` es el único que llama `showNotification()`. Los consumidores en foreground (`onMessage` en `ConductorPage` y `ViajeTrackingPage`) leen `payload.data.title`/`payload.data.body` por el mismo motivo.

**Todos los valores de `data` deben ser strings** — FCM rechaza el mensaje si alguno es `null`/`undefined`. Por eso `url` se omite con spread condicional cuando no se pudo armar.

## URL de destino va en `data.url`, nunca en `webpush.fcmOptions.link`
FCM valida ese campo y rechaza el **mensaje entero** con `INVALID_ARGUMENT` si no es HTTPS. Con `APP_BASE_URL` sin definir quedaba `"undefined/viaje/abc"`; en local, `"http://localhost:3000/..."` — en ambos casos no llegaba ninguna notificación, y como el envío es best-effort el error se tragaba sin dejar rastro.

`api/_lib/appUrl.js` (`construirUrlApp`) centraliza el armado de esa URL: cae a `https://$VERCEL_URL` si `APP_BASE_URL` falta; si no hay ninguna, devuelve `null` y la clave `url` se omite. El payload de datos no tiene validación de formato, así que ahí la URL puede ser `http://localhost` sin problema.

## `VITE_FIREBASE_VAPID_KEY` es obligatoria
Firebase Console → Configuración del proyecto → Cloud Messaging → Certificados push web. Sin ella `getToken()` falla y nunca se guarda un `fcmToken`, aunque el permiso del navegador esté concedido. Debe estar en `.env` local **y** en Vercel.

## Los errores de FCM se loguean, nunca se tragan en silencio
Todo el manejo degrada a `null` para no romper el flujo que llama (switch "Disponible", creación del viaje), así que sin `console.error` el motivo real quedaba invisible:
- `useFcmToken` loguea el fallo de `getToken`.
- Ambos endpoints loguean el código de error de FCM (`send()` en uno, `resultado.responses` del multicast en el otro, que no lanza excepción).

**No quitar esos logs: son la única pista al depurar.**

## `src/hooks/useFcmToken.js`
Pide permiso (`Notification.requestPermission()`) y obtiene el token con `getToken()` + `VITE_FIREBASE_VAPID_KEY`. Expone:
- `registrarToken(conductorId)`: pide permiso+token y hace `updateDoc` a `conductores/{id}.fcmToken`. La usa `ConductorPage` al activar "Disponible" (best-effort, no rompe el toggle si falla).
- `obtenerToken()`: solo permiso+token, sin escribir nada. La usa el cliente en `PedirViajePage.handleConfirmarViaje`, porque el viaje todavía no existe como documento cuando se pide el token.

Ante cualquier fallo (permiso denegado, navegador sin soporte, error de red), ambas caen a `null`/error manejado, nunca rompen el flujo que las llama.

## `fcmTokenCliente` en `viajes`
Mismo patrón que `clienteTelefonoNormalizado`: no hay cuenta de cliente persistente, así que el token de push vive en el propio documento del viaje, escrito una sola vez al crearlo (`useCreateViaje`). Puede ser `null` sin bloquear la creación del viaje (verificado en vivo).

## `src/components/Toast.jsx`
Primer componente tipo toast/snackbar del proyecto (antes solo existía `StatusMessage`, de sección, no flotante). Se usa para mensajes de FCM en foreground vía `onMessage()` — el navegador no dispara la notificación del sistema con la pestaña en foreground. Montado en `ConductorPage` y `ViajeTrackingPage`, cada uno con su propio `useEffect`/`onMessage()`. No hay provider global de toasts, no hizo falta.

## Endpoints
- **`api/notificar-viaje.js`** (conductor, viaje nuevo): `messaging.sendEachForMulticast()` a conductores `activo` dentro de 5 km con `fcmToken`, con limpieza best-effort de tokens muertos. Incluye `viaje.distanciaKm` cuando existe.
- **`api/notificar-cambio-estado.js`** (cliente, cambio de estado): recibe `{ viajeId, nuevoEstado }`, relee el viaje con Admin SDK, envía push 1:1 (`messaging.send()`) si `fcmTokenCliente` existe. Sin token → responde `200 { enviado: false }` sin error (caso normal). Disparado fire-and-forget por `acceptViaje`/`advanceViajeStatus` en `src/hooks/useViajeActions.js`.

## Env vars del Admin SDK
Nombre real (con infijo `_ADMIN_`): `FIREBASE_ADMIN_PROJECT_ID` / `FIREBASE_ADMIN_CLIENT_EMAIL` / `FIREBASE_ADMIN_PRIVATE_KEY`. No usar nombres sin ese infijo para nada nuevo que use `getAdminDb()`/`getAdminMessaging()`.

## Consecuencias
- Cualquier nuevo tipo de push debe seguir el patrón data-only + `data.url` vía `construirUrlApp`.
- No probar push en `npm run dev` y reportar "no funciona" sin antes probar en build/preview.