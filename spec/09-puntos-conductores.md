# Sistema de puntos de conductores (premio por carreras baratas)

**Fecha:** 2026-07-13
**Estado:** decidido (implementación en curso)

## Contexto
Los conductores tienden a rechazar las carreras de bajo monto (las que nadie
quiere). Para equilibrarlo, se los premia con **puntos** al completar carreras
baratas; esos puntos (a) ordenan la lista de conductores disponibles que ve el
cliente (más puntos = más arriba, ver `08`) y (b) les dan **primer derecho a
aceptar** en carreras más caras. Los puntos se reinician **semanalmente** (misma
cadencia que `cuotaSemanalPagada`), para que midan esfuerzo reciente y no
antigüedad — así un conductor nuevo puede competir.

## Decisiones

### 1. Config: `configuracion/puntos` (crear a mano, como `tarifas`)
```
tramos: [ {hasta: 1, puntos: 20}, {hasta: 2, puntos: 10}, {hasta: 3, puntos: 5} ]  // precioFinal > 3 → 0
topeDiario: 60
umbralPrioridad: 2          // viajes con precioFinal > 2 activan push escalonado
ventanaPrioridadSegundos: 8
topPrioridad: 3
```
Lectura pública (regla `configuracion` ya lo permite), escritura `if false`.
Puntos ganados = primer `tramo` cuyo `hasta >= precioFinal`; si ninguno, 0.

### 2. Ganancia: endpoint dedicado `POST /api/otorgar-puntos`
Endpoint aparte de `notificar-cambio-estado` (dominios distintos; ese tiene
early-returns y su responsabilidad es notificar). Se dispara con un
fire-and-forget extra en `advanceViajeStatus` **solo** cuando
`nuevoEstado === 'completado'`. El `await updateDoc` del cliente resuelve después
del commit, así que el endpoint, al releer con Admin SDK, ya ve `completado`.

**No se confía en el cliente:** el endpoint relee el viaje y solo otorga si
`estado === 'completado'` y `conductorId` no vacío (el destinatario sale del
doc, no del caller). Transacción idempotente + reset perezoso + tope diario:
```
ledger = conductores/{viaje.conductorId}/puntosHistorial/{viajeId}
runTransaction:
  si ledger existe → { ok:true, yaOtorgado:true }               // idempotente por viajeId
  base    = (conductor.semanaPuntos === semanaISOActual) ? conductor.puntos : 0
  hoyPrev = (conductor.fechaPuntosHoy === hoy)            ? conductor.puntosHoy : 0
  ganados = min(puntosSegunTramos(viaje.precioFinal), max(0, topeDiario - hoyPrev))
  update conductor: { puntos: base+ganados, semanaPuntos: semanaISOActual,
                      puntosHoy: hoyPrev+ganados, fechaPuntosHoy: hoy }
  set ledger: { puntos: ganados, precio: viaje.precioFinal, fecha: serverTimestamp() }
```
Respuestas: `{ok:true, otorgados:20}` | `{ok:true, yaOtorgado:true}` | `{ok:true, otorgados:0}`.

### 3. Reset semanal: **reset perezoso** (sin cron)
Se guarda `semanaPuntos` (semana ISO `'AAAA-Www'`); los **puntos efectivos** se
calculan en lectura: `semanaPuntos === semanaISOActual ? puntos : 0`. El reset
"real" del acumulador ocurre dentro de la transacción de otorgamiento.
- Frente a Vercel Cron (puede fallar en silencio, limitado en Hobby) y a guardar
  puntos por semana (más complejo), el reset perezoso es cero-infra y hace que la
  lista ordene bien aunque el conductor no haya escrito nada esta semana.
- Helper `api/_lib/semana.js` → `semanaISOActual()` (`'AAAA-Www'`, ISO-8601).
  Usado en `otorgar-puntos`, `conductores-disponibles` y `notificar-viaje`.

### 4. Primer derecho a aceptar: **push escalonado** (soft priority)
Se descarta un gate de aceptación server-side (reescribiría el matching y las
reglas de Firestore no expresan bien "tiempo desde creación"). En su lugar, se
escalona el push en `api/notificar-viaje.js` (aditivo, **no toca `acceptViaje`**):
```
si viaje.precioFinal <= umbralPrioridad:  enviar a TODOS de una (comportamiento actual)
si no (viaje caro):
    ordenar destinatarios por puntosEfectivos desc
    push a top-N (topPrioridad) ahora
    sleep(ventanaPrioridadSegundos)
    releer viaje; si ya no está 'pendiente' → fin
    si no → push al resto
```
El delay vive dentro de la misma invocación (`sleep` + `maxDuration ~15s`); solo
aplica a viajes caros (baja frecuencia). Es soft priority (no candado): a escala,
migrar la fase 2 a un webhook diferido (anotado en `07`).

### 5. Anti-abuso
- **v1:** solo viajes `completado` otorgan; **tope diario** por conductor;
  **ledger** `puntosHistorial/{viajeId}` (idempotencia + auditoría).
- **Diferido (`07`):** solo clientes distintos (hoy no hay identidad estable de
  cliente sin login); detección de auto-trato (mitigado parcial por el tope).

### 6. `firestore.rules` (bloque exacto de `conductores`)
```
match /conductores/{conductorId} {
  allow get: if isAdmin() || request.auth.uid == conductorId;
  allow list: if isAdmin();
  allow update: if
    (isAdmin()
      && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['cuotaSemanalPagada']))
    || (request.auth.uid == conductorId
      && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['activo', 'ubicacion', 'fcmToken']));
  allow create, delete: if false;

  match /puntosHistorial/{registroId} {
    allow read: if isAdmin() || request.auth.uid == conductorId;
    allow write: if false;   // solo Admin SDK
  }
}
```
`puntos/semanaPuntos/puntosHoy/fechaPuntosHoy` quedan FUERA de todo `hasOnly` a
propósito → server-write-only (ni el conductor ni el admin los tocan por reglas).
`placa/fotoPerfilUrl/motoFotoUrl/vehiculo` tampoco están en `hasOnly`: se escriben
con Admin SDK (`admin-editar-conductor`).

## Consecuencias
- El push de viajes caros tarda ~8 s en llegar a los conductores de menos puntos.
- Requiere crear `configuracion/puntos` a mano y publicar reglas antes de deploy.
- El ledger `puntosHistorial` habilita una futura pantalla de historial para el
  conductor (ya tiene permiso de lectura de su propio historial).

## Nota de implementación (no cambia el contrato de arriba)
`otorgar-puntos.js` y `notificar-viaje.js` comparten la lectura de
`configuracion/puntos` con sus defaults (mismo doc, campos distintos: uno usa
`tramos`/`topeDiario`, el otro `umbralPrioridad`/`ventanaPrioridadSegundos`/
`topPrioridad`). Para no duplicar la lógica de "si el doc no existe o le
falta un campo, caer al default" en los dos endpoints, se agregó
`api/_lib/configPuntos.js` (`getConfigPuntos(db)` + `puntosSegunTramos`). No
es una decisión de diseño nueva, solo evita repetir el mismo bloque de
defaults dos veces.

`notificar-viaje.js` además clampea `ventanaPrioridadSegundos` a un máximo de
10 s antes de dormir (el campo se carga a mano en consola sin validación de
rango): sin el clamp, un valor mal cargado se comería el `maxDuration` de 15 s
y la tanda "resto" nunca saldría, sin ningún error visible. El clamp no
cambia el comportamiento documentado arriba mientras el valor cargado sea
razonable (8 s por default).
