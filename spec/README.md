# Índice de spec/ — Medaner

Cada archivo documenta una decisión o área de arquitectura, con contexto de
por qué se decidió así (no solo el qué). Formato: `00-nombre-descriptivo.md`.

| Archivo | Contenido |
|---|---|
| `00-arquitectura-general.md` | Stack, hardware, pagos, modelo de negocio, reglas de escalabilidad, riesgos |
| `01-firestore-schema.md` | Estructura de Firestore, esquema de estados, roles/admin, env vars |
| `02-fcm-notificaciones.md` | Service worker, push data-only, debugging de FCM |
| `03-ubicacion-tracking.md` | Los dos campos de ubicación, throttle GPS |
| `04-tarifas-cotizacion.md` | `configuracion/tarifas`, cálculo de precio de viaje |
| `05-identidad-contacto.md` | Geocoding en Falcón, referencia manual, WhatsApp, roles admin |
| `06-seguimiento-sin-login.md` | localStorage + recuperación por teléfono |
| `07-pendientes.md` | TODO vivo — se actualiza seguido, no es una "decisión" fija |
| `08-conductores-perfil-y-lista.md` | Campos foto/placa/moto del conductor, lista de disponibles en la espera |
| `09-puntos-conductores.md` | Puntos por carreras baratas, ranking, primer derecho, reset semanal |
| `10-header-logueado-saludo.md` | Header logueado: saludo con avatar reemplaza logo, fix de color de la tasa de cambio |
| `11-limite-funciones-vercel.md` | Tope de 12 funciones (Hobby), router `api/admin.js` que consolida los 6 endpoints admin |
| `12-badge-conductores-precio.md` | Badge de conductores disponibles junto al precio, modo conteo del endpoint, fix del token `--green` |
| `13-conductor-solicitud-cuenta-unica-y-fotos-publicas.md` | Cuenta única al postular a conductor, `tipo_usuario` solo cambia en la aprobación, bucket público `conductor-publico` para selfie/vehículo |

## Regla para agregar un nuevo spec
1. Revisa este índice para el siguiente número disponible.
2. Nombra el archivo `NN-nombre-descriptivo.md`.
3. Usa la estructura: Contexto → Alternativas consideradas (si aplica) →
   Decisión → Consecuencias.
4. Agrega una fila a la tabla de arriba.