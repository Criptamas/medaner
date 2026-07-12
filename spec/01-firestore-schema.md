# Esquema de Firestore, estados y roles — Medaner

**Fecha:** 2026-07-12
**Estado:** decidido (con pendientes marcados abajo)

## Contexto
Estructura de datos actual en Firestore, convenciones de nombres exactos, esquema de estados de pedidos/viajes, y el manejo (ausente por ahora) de roles/admin.

## Estructura de Firestore

```
tiendas/
  {tiendaId}/
    nombre: string
    categoria: string
    descripcion: string
    telefono: string
    activa: boolean
    productos/
      {productoId}/
        nombre: string
        descripcion: string
        precio: number (double)
        imagen: string (URL externa — LoremFlickr u otro)
        disponible: boolean

conductores/
  {conductorId}/
    activo: boolean          ← disponibilidad, ver nota abajo
    nombre: string           ← solo-lectura para el conductor, lo gestiona el admin
    telefono: string         ← solo-lectura para el conductor, lo gestiona el admin
    ubicacion: { lat, lng }  ← matching de proximidad, el cliente NO puede leerlo
    fcmToken: string
    cuotaSemanalPagada: boolean ← admin-write-only

configuracion/
  tarifas/                  ← ID de documento fijo, exacto "tarifas"
    tarifaBaseMoto: number
    tarifaPorKmMoto: number
    tarifaBaseCarro: number
    tarifaPorKmCarro: number
    tarifaMinima: number
    incrementoAjuste: number
```

## Convención crítica: nombres exactos
- El campo de disponibilidad del conductor es **`activo`** (boolean), **NO** `disponible`. Lo escribe `ConductorPage` (switch) vía `useDocToggle`; lo lee `api/notificar-viaje.js` (`where('activo', '==', true)`). No renombrar sin tocar frontend + función + reglas a la vez.
- `precio` siempre como `double`, nunca string.
- El documento del conductor DEBE crearse con **ID = UID de Firebase Auth**. Si no coincide, el conductor ve "perfil no configurado" (la pantalla muestra el UID exacto para facilitar la creación).

## Reglas de Firestore relevantes
- Conductor solo puede escribir `activo`, `ubicacion` y `fcmToken` en su propio doc.
- Admin solo puede escribir `cuotaSemanalPagada`.
- `configuracion`: `allow read: if true`, `allow write: if false` (se carga a mano desde la consola).
- Cambios a `firestore.rules` NO tienen efecto hasta publicarlas (`firebase deploy --only firestore:rules` o consola).

## Esquema de estados (nombres exactos en Firestore)
- **Pedidos:** `pendiente → confirmado → en_camino → entregado` (final: `entregado`). No existe `cancelado` todavía.
- **Viajes:** `pendiente → confirmado → en_curso → completado` (final: `completado`).
- Las etiquetas legibles viven centralizadas en `src/utils/pedidoLabels.js` (`ESTADO_BADGE_LABELS` para pedidos, `VIAJE_ESTADO_LABELS` para viajes). Al agregar un estado nuevo: actualizar ahí y revisar componentes que marcan estados "finales" (`MisPedidosRecientes`).

## Identidades, admin y sesión (sin sistema de roles todavía)
- **Admin real:** criptamas@gmail.com → UID `y1AyjaLn7xeL1mfAiDTNu7nNhfV2` ("Juan Rojas"). Único UID en `isAdmin()` de `firestore.rules`.
- **Conductor de prueba:** conductor@prueba.com → UID `vJVgS8PZpSOro7OmcRLtOxMowXy1` ("Carlos Alejandro"); NO es admin.
- No hay sistema de roles: `ProtectedRoute` solo verifica sesión; cualquier usuario logueado puede abrir `/admin` y `/conductor` en el frontend (las reglas de Firestore limitan qué puede escribir cada uno). **Pendiente a propósito** (decisión 2026-07-08).
- `src/components/SesionUsuario.jsx` resuelve el nombre mostrado: prop `nombre` → mapa UID→nombre de `src/utils/nombresUsuarios.js` (solo personal interno) → email. Al implementar roles, reemplazar el mapa por perfiles reales.

## Variables de entorno (.env)
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_MAPBOX_TOKEN
```
Nunca commitear valores reales al repo. Deben estar en `.env` local **y** en Vercel.

## Consecuencias
- Cualquier feature que necesite `list` sobre `pedidos` debe revisar la regla actual (hoy cualquier conductor autenticado puede listar todos los pedidos con datos de clientes — pendiente de restringir a escala, ver `07-pendientes.md`).
- No introducir un segundo nombre para el campo de disponibilidad del conductor.