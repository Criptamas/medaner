# Perfil del conductor (foto/placa/moto) y lista de conductores disponibles

**Fecha:** 2026-07-13
**Estado:** decidido (implementación en curso)

## Contexto
El cliente, mientras espera un conductor (`viaje.estado === 'pendiente'`), debe ver
una lista EN VIVO de conductores disponibles en su zona. Cada tarjeta muestra
**solo**: foto de perfil, nombre, puntos (ver `09-puntos-conductores.md`),
distancia (km) y tiempo estimado de llegada (min). Sin teléfono, sin coords
exactas, sin botones de aceptar/rechazar del lado del cliente. El matching sigue
siendo **"ver + difusión"**: gana el primer conductor que acepta (el cliente no
elige). Una vez asignado, el cliente ve foto de perfil real, nombre, placa y
**foto de la moto** al lado de la placa.

El modelo actual (`spec/01`) no tenía los campos necesarios: `conductores/{uid}`
solo guardaba `nombre, telefono, cedula, activo, cuotaSemanalPagada, ubicacion,
fcmToken`. Y `api/conductores-cerca.js` oculta a propósito la identidad del
conductor (devuelve solo `lat/lng/vehiculo`).

## Decisiones

### 1. Campos nuevos en `conductores/{uid}`
| Campo | Tipo | Default | Escribe |
|---|---|---|---|
| `placa` | string | `''` | Admin (Admin SDK) |
| `fotoPerfilUrl` | string (URL externa pública) | `''` | Admin (Admin SDK) |
| `motoFotoUrl` | string (URL externa pública) | `''` | Admin (Admin SDK) |
| `vehiculo` | `'moto' \| 'carro'` | `'moto'` | Admin (Admin SDK) |
| `puntos`, `semanaPuntos`, `puntosHoy`, `fechaPuntosHoy` | ver `09` | — | Solo servidor |

- **Imágenes por URL externa** (Cloudinary u otro), nunca Firebase Storage
  (regla no negociable de CLAUDE.md).
- **NO se reutiliza** el bucket privado de Supabase `conductor-verificacion`:
  esas fotos son privadas (un cliente sin login no puede leerlas) y una es la
  **foto de la placa, no un retrato**. Servirlas como avatar público sería
  incorrecto y filtraría documentación de verificación.
- Defaults nuevos se agregan al `.set(...)` de `api/admin-aprobar-conductor.js`
  (`vehiculo: 'moto'` porque el mototaxi es el caso dominante).
- Edición posterior vía **nuevo endpoint** `POST /api/admin-editar-conductor`
  (Admin SDK, bypasea reglas) que setea solo `placa/fotoPerfilUrl/motoFotoUrl/
  vehiculo`. Mantiene estos campos fuera de la superficie de escritura del
  cliente admin.

### 2. Endpoint `GET /api/conductores-disponibles`
Sirve a la pantalla de espera (identidad sí, coords no). **Se mantiene** el
endpoint separado `conductores-cerca` (pines anónimos del mapa previo): tienen
contratos de privacidad OPUESTOS y fusionarlos sería fuente de fugas de datos.

- **Request:** `?lat=<origenLat>&lng=<origenLng>&tipoVehiculo=moto`
- **Response 200:**
  ```json
  { "conductores": [
    { "fotoPerfilUrl": "https://...", "nombre": "Carlos A.", "puntos": 35, "distanciaKm": 1.2, "etaMin": 4 }
  ] }
  ```
- **Filtro:** `activo === true` Y tiene `ubicacion` Y `haversineKm ≤ 5` Y
  `vehiculo === tipoVehiculo`. A diferencia de `notificar-viaje`, acá **se
  excluyen** los conductores sin `ubicacion` (sin coords no hay distancia/ETA).
- **Orden:** `puntosEfectivos` desc (ver reset perezoso en `09`), `distanciaKm`
  asc como desempate. Tope de 20 ítems en el payload.
- **Nunca** devuelve `id`, coords exactas, `telefono`, `fcmToken`, `cedula`,
  `cuotaSemanalPagada`.

### 3. ETA por velocidad, no Mapbox por conductor
Llamar a Mapbox Directions por conductor en cada tick de polling es caro y
lento. Estimación determinista:
```
FACTOR_DETOUR = 1.3
VELOCIDAD_KMH = { moto: 25, carro: 20 }   // urbano Punto Fijo
etaMin = max(1, round((haversineKm * 1.3) / VELOCIDAD_KMH[tipoVehiculo] * 60))
```

### 4. Polling de la pantalla de espera
Hook nuevo `useConductoresDisponibles(origen, tipoVehiculo, activo)`:
- **Cada 10 s** (el GPS del conductor se escribe como máx cada 8 s, ver `03`;
  pollear más rápido no trae datos más frescos, solo gasta batería/datos).
- **Cadena de `setTimeout`** (no `setInterval`): evita solapar requests.
- Pausa con `document.visibilityState` (`visibilitychange`); salta el tick si
  `!navigator.onLine`; en error **no limpia** la lista (best-effort).
- Se monta dentro del panel de `pendiente`, así se desmonta solo al cambiar de
  estado. Cuando un conductor acepta, el `onSnapshot` de `useViaje` ya mueve al
  cliente a `confirmado` (mecanismo actual, no cambia).

### 5. `acceptViaje` + `ConductorAsignadoPanel`
- `useViajeActions.acceptViaje` copia además `conductorFotoUrl` y
  `conductorMotoFotoUrl` al viaje (degradan a `''` como `conductorPlaca`).
  Fuente: `useConductorPropio` ya trae el doc completo del conductor en
  `ConductorViajeDetallePage`, solo hay que pasarlos en `handleAceptar`.
- `ConductorAsignadoPanel`: `Avatar` con `avatarUrl={viaje.conductorFotoUrl}` y
  un `<img>` de `conductorMotoFotoUrl` junto a la placa, con degradado si falta.

## Consecuencias
- **Reversión acotada de privacidad:** foto/nombre/puntos de conductores
  disponibles quedan expuestos a un cliente sin login. Es la misma info que verá
  al confirmarse y no filtra contacto ni ubicación exacta. Endpoint público
  scrapeable (como los otros dos) — rate-limiting a escala queda en `07`.
- `firestore.rules`: se agrega la subcolección `puntosHistorial`; `puntos` y
  derivados quedan server-write-only (no se tocan los `hasOnly` existentes). Ver
  bloque exacto en `09`.
- Requiere crear a mano `configuracion/puntos` y publicar reglas antes de deploy.

## Notas de implementación frontend (2026-07-13)
Decisiones de UI no cubiertas arriba, tomadas al construir los componentes:

- **`ConductoresDisponiblesLista` usa los tokens `--vt-*`** (definidos en
  `ViajeTrackingPage.css`, scope `.viaje-track`), no los tokens crudos de
  `src/index.css`. Mismo criterio que `IlustracionBuscando`/
  `ViajeResumenDetalle`, que ya viven ahí: el componente solo se monta dentro
  de `BuscandoConductorPanel`. Además es necesario por contraste — el fondo
  del panel (`.viaje-panel`) ya usa el mismo valor que `--surface-2` global,
  así que una card con `background: var(--surface-2)` se fundiría con el
  panel; `--vt-surface-2` (un tono más claro, reservado para "relleno sutil")
  sí contrasta.
- **La lista tiene su propio scroll acotado** (`max-height: 260px` en
  `.conductores-lista`) en vez de dejar que crezca sin límite: con el tope de
  20 conductores del backend, una lista sin límite empujaría el botón
  "Cancelar viaje" fuera de la pantalla en mobile. Solo esa sección scrollea;
  el resto del panel (header, ilustración/resumen, acciones) queda estable.
- Cada card muestra **3 líneas separadas** bajo el nombre (puntos / distancia
  / ETA), no combinadas en una sola — más fácil de escanear de un vistazo que
  un párrafo corrido.
- **Panel admin**: el form de editar perfil (placa/fotos/vehículo) vive
  colapsado dentro de `AdminConductorRow` con estado propio (no sube al padre
  `AdminPage`) porque no necesita coordinarse con nada más del tab — al
  guardar, `useAllConductores` (que es `onSnapshot`) refleja el cambio solo.
  Se agregó un preview en vivo de las URLs de foto pegadas (mismo patrón
  `onError`/`onLoad` que `Avatar`), para que el admin note una URL rota antes
  de guardarla en vez de descubrirlo después en la pantalla del conductor.
