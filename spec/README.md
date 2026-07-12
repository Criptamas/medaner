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

## Regla para agregar un nuevo spec
1. Revisa este índice para el siguiente número disponible.
2. Nombra el archivo `NN-nombre-descriptivo.md`.
3. Usa la estructura: Contexto → Alternativas consideradas (si aplica) →
   Decisión → Consecuencias.
4. Agrega una fila a la tabla de arriba.