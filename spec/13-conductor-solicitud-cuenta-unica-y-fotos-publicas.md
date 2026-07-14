# Solicitud de conductor: cuenta única, transición de rol en la aprobación, fotos públicas

**Fecha:** 2026-07-14
**Estado:** decidido (diseño de Architect, implementación en curso)

## Contexto
`SerConductorPage.jsx` creaba SIEMPRE una cuenta nueva de Supabase aunque el
usuario ya tuviera sesión de cliente activa (2 cuentas para la misma persona),
y seteaba `tipo_usuario: 'conductor'` desde el signup (antes de aprobación).
`aprobarConductor` no escribía ese rol, y las fotos públicas del conductor
(`fotoPerfilUrl`/`motoFotoUrl`) las pegaba el admin a mano, aunque la selfie ya
subida durante el registro podría servir como foto de perfil.

## Decisiones de producto (fijas, confirmadas por el dueño del producto)
1. Rol exclusivo: cliente → conductor es una transición, no un modelo dual.
   Una vez aprobado, la cuenta es solo conductor.
2. Reusar cuenta/uid existente si hay sesión de cliente activa al postularse.
3. `tipo_usuario` pasa a `'conductor'` SOLO en la aprobación del admin, nunca
   en el momento de la solicitud (si rechazan, sigue siendo cliente normal).
4. Se agrega un 3er upload (foto del vehículo) al formulario de registro.
5. Al aprobar, `fotoPerfilUrl`/`motoFotoUrl` se auto-pueblan desde la selfie y
   la foto de vehículo ya subidas — el admin sigue pudiendo corregirlas
   después vía `AdminConductorRow` si hace falta.

## Alternativas consideradas (cómo exponer fotos privadas como públicas)
- **Signed URLs de larga duración sobre `conductor-verificacion`** — rechazada:
  acopla contenido "para siempre público" (avatar que ve cualquier cliente sin
  login) a un bucket cuyo propósito es verificación interna tipo KYC. Si a
  futuro hace falta purgar/rotar fotos de verificación, rompería avatares en
  producción.
- **Policy de SELECT público scopeada por nombre de archivo** en el mismo
  bucket (excluyendo `placa.*`) — rechazada: seguridad por convención de
  nombre, frágil, mezcla contratos de privacidad opuestos en un solo bucket
  (mismo espíritu que `spec/08` ya rechazó al decidir no reusar ese bucket
  para fotos públicas).
- **Copiar selfie + foto de vehículo a un bucket NUEVO público
  (`conductor-publico`)** con `service_role`, en el momento de la aprobación,
  dejando la placa intacta en `conductor-verificacion` — **elegida**.
  Consistente con el patrón ya existente del bucket `avatars` (público,
  `getPublicUrl()`, usado en `ClienteAuthSheet.jsx`). No agrega ninguna
  función serverless nueva (todo vive dentro de `aprobarConductor`, en
  `_lib/adminHandlers.js`, fuera del tope de 12 de Vercel Hobby, ver `11`).

## Decisión: storage
- Bucket nuevo `conductor-publico`: público, solo lectura pública, sin policy
  de insert/update/delete para `anon`/`authenticated` (solo escribe
  `service_role`, que bypasea RLS, igual que el resto de escrituras admin).
  SQL a ejecutar a mano en el SQL editor de Supabase (escribir a producción es
  decisión del usuario, mismo criterio que `configuracion/tarifas` en `04`):
  ```sql
  insert into storage.buckets (id, name, public)
  values ('conductor-publico', 'conductor-publico', true)
  on conflict (id) do nothing;

  create policy "conductor_publico_select_publico"
  on storage.objects for select
  to public
  using (bucket_id = 'conductor-publico');
  ```
- Rutas destino: `{uid}/perfil.<ext>` (copiado desde la selfie),
  `{uid}/vehiculo.<ext>` (copiado desde la nueva foto de vehículo). La placa
  **nunca** se copia.
- Mecanismo: descargar de `conductor-verificacion` + subir a
  `conductor-publico` con `upsert: true` (no `.copy()` cross-bucket — evita
  depender de un comportamiento de overwrite no verificado en la versión
  instalada de `storage-js`; download+upload es idempotente y seguro ante
  reintentos de `aprobarConductor`).
- Best-effort por archivo (mismo patrón que las signed URLs de
  `solicitudesConductor`): si falla una copia, se loguea y esa URL pública
  queda `''` — degrada igual que hoy cuando el admin no ha cargado la foto.
  Nunca bloquea la aprobación completa.
- No se toca la policy de `conductor-verificacion`: restringe por carpeta
  (`{uid}/...`), no por nombre de archivo — el 3er archivo cae bajo la misma
  carpeta del owner y ya está permitido. **Verificar en el dashboard antes de
  asumirlo** (la policy SQL real no está versionada en el repo).
- No se toca `firestore.rules`: `fotoPerfilUrl`/`motoFotoUrl` ya eran
  server-write-only vía Admin SDK.

## Decisión: columna nueva en `solicitudes_conductor`
SQL a ejecutar a mano:
```sql
alter table public.solicitudes_conductor
  add column if not exists foto_vehiculo_url text;
```
Nullable a propósito (no romper filas existentes/pendientes al migrar). La
obligatoriedad para solicitudes nuevas se valida en capa de aplicación, igual
que ya pasa con `foto_placa_url`/`foto_selfie_url`.

## Decisión: transición de `tipo_usuario`
No se toca el trigger `on_auth_user_created` de Supabase (su existencia está
confirmada solo indirectamente, por un comentario de código en
`ClienteAuthSheet.jsx:137` — no verificada contra el SQL real, que vive solo
en el dashboard y no está versionado en el repo. **Pendiente**: confirmar y
exportar ese SQL al repo, ver `07-pendientes.md`).

`SerConductorPage.jsx` deja de mandar `tipo_usuario: 'conductor'` en el
`signUp()` y manda `'cliente'` explícito (igual que el signup normal de
`ClienteAuthSheet.jsx`) — mientras la solicitud está pendiente, la cuenta *es*
una cuenta cliente normal, así que `'cliente'` es el valor conceptualmente
correcto, no un placeholder temporal.

`aprobarConductor` agrega un paso nuevo y explícito:
```sql
update public.usuarios set tipo_usuario = 'conductor' where id = :usuario_id;
```
vía `getSupabaseAdmin()` (service_role).

**Orden exacto dentro de `aprobarConductor`** (importante para que un
reintento tras fallo parcial sea seguro):
1. Fetch solicitud + guard `estado === 'pendiente'` (ya existe).
2. Fetch usuario (nombre/telefono) (ya existe).
3. Copiar selfie → `conductor-publico` (best-effort, nuevo).
4. Copiar foto de vehículo → `conductor-publico` (best-effort, nuevo; si
   `foto_vehiculo_url` es `null` por ser una solicitud previa a este cambio,
   saltar y dejar `''`).
5. `conductores/{uid}.set(...)` en Firestore (ya existe; cambian los defaults
   de `fotoPerfilUrl`/`motoFotoUrl` — ya no `''` fijo, sino la URL pública
   recién copiada o `''` si falló la copia).
6. **Nuevo, falla duro (throw) si falla**: `UPDATE usuarios SET
   tipo_usuario='conductor'`.
7. `solicitudes_conductor.update({estado:'aprobada', ...})` (ya existe).

El paso 6 va **antes** del 7 a propósito: si falla, `estado` de la solicitud
queda en `'pendiente'` y el admin puede reintentar con seguridad (la
re-ejecución completa es idempotente). Si fuera después del 7, un fallo
dejaría la solicitud marcada `'aprobada'` con el rol sin cambiar y sin forma
de reintentar (el guard del paso 1 bloquea reprocesar una solicitud ya
`'aprobada'`).

## Decisión: `SerConductorPage.jsx` reusa sesión existente
Se reusa el estado `userId` que ya existe (`cuentaYaCreada = userId !== null`)
en vez de un flujo paralelo: con un efecto que corre cuando `useClienteAuth()`
resuelve, `setUserId(user.id)` hace que el resto de `handleSubmit` (el
`if (!uid) { signUp… }`) se salte solo.

Matriz de comportamiento según `useClienteAuth()`:

| Estado de sesión | Comportamiento |
|---|---|
| `loading === true` | Loading breve (evita parpadeo de campos que luego se ocultan) |
| `!user` | Flujo actual sin cambios: formulario completo + 3 uploads |
| `user` con `tipoUsuario === 'cliente'` | **Reuso**: pre-seedear `userId = user.id`. Ocultar (no deshabilitar) email/password. Nombre/teléfono de solo lectura si ya vienen no-vacíos; teléfono editable si viene vacío. Cédula sigue siendo obligatoria. Los 3 uploads sin cambios. Copy/CTA distinto al de "reintentar tras fallo parcial" |
| `user` con `tipoUsuario === 'conductor'` | Bloquear formulario: "ya tenés una cuenta de conductor", link a `/conductor` (rol exclusivo, evita solicitud sin sentido) |
| `user` con `tipoUsuario === 'admin'` | Bloquear formulario (safety rail: sin esto, el admin podría auto-degradar su única cuenta a conductor) |

El `update` best-effort de `telefono` corre en ambos flujos (nuevo o
reusado) si `telefono.trim()` no está vacío.

`RedireccionPorRol`/`RutaRolProtegida`/`useFirebaseBridge` **no necesitan
cambios**: `tipo_usuario` se queda en `'cliente'` durante todo el
`pendiente`/`rechazada`, así que esos componentes ven una cuenta cliente
normal, cero casuística nueva.

## Decisión: `rechazarConductor`
Sin cambios: como `tipo_usuario` nunca se toca hasta la aprobación, no hay
nada que revertir al rechazar — la cuenta ya era y sigue siendo `'cliente'`.

## Consecuencias
- Nuevo bucket público `conductor-publico` a crear a mano en Supabase antes
  de deploy (bucket + policy de arriba) — decisión del usuario, no
  automatizada (mismo criterio que `configuracion/tarifas` en `04`).
- Columna nueva `foto_vehiculo_url` a migrar a mano en `solicitudes_conductor`.
- Sin funciones serverless nuevas — dentro del tope de 12 (ver `11`).
- Pendientes no bloqueantes anotados en `07`: documentar el trigger
  `on_auth_user_created` en el repo; decidir retención de fotos de
  verificación de solicitudes rechazadas.
