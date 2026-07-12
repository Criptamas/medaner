# CLAUDE.md — Proyecto Medaner

Este archivo define las reglas que Claude Code debe seguir siempre al trabajar
en este repositorio. Es intencionalmente corto — el detalle técnico y las
decisiones ya tomadas viven en `/spec/` (ver índice en `spec/README.md`).
Consulta el spec relevante antes de tocar esa área; no asumas que ya la conoces.

## Contexto del proyecto
Medaner (medaner.com) es una app web de delivery y taxi/mototaxi para Punto
Fijo, estado Falcón, Venezuela. Stack, restricciones y modelo de negocio
completos en `spec/00-arquitectura-general.md`.

## Reglas de estilo UI/Frontend
- Diseño moderno, minimalista y simple, pero NO insípido ni genérico.
- Priorizar practicidad y usabilidad sobre decoración innecesaria.
- Detalles de diseño con intención (tipografía, espaciado, color), sin exceso.
- Mobile-first: la mayoría de usuarios finales usan esto desde el celular.

## Reglas de comunicación
- Responder siempre en español.
- Explicaciones claras, sencillas y concisas.
- No sacrificar información relevante por brevedad: ser directo, no incompleto.

## Reglas de arquitectura y escalabilidad
Ver `spec/00-arquitectura-general.md`. En resumen: toda decisión debe
considerar que el proyecto va a escalar (más tiendas, conductores, ciudades),
evitando tanto "quick fixes" rígidos como sobre-ingeniería prematura.

## Reglas de documentación de código
- Comentar las partes importantes del código, no todo — el comentario debe
  aportar el "por qué", no solo el "qué".
- Nombres de funciones/variables descriptivos para reducir comentarios obvios.
- Claridad en archivos clave (config, integraciones, lógica de negocio).

## Reglas técnicas no negociables
- No usar Stripe ni asumir pagos con tarjeta — el flujo es efectivo/pago móvil manual.
- No usar Firebase Storage — imágenes siempre vía URL externa.
- No usar Google Maps Geocoding (Cloud Billing no soportado en Venezuela) — usar Mapbox.
- Considerar las limitaciones de hardware del entorno local (4GB RAM, i3 11va gen) al sugerir dependencias o procesos de build.
- Nunca subir `.env` ni API keys al repo. Reglas de seguridad de Firestore explícitas antes de cada deploy.
- Convención de commits: `feat:`, `fix:`, `docs:`.
- Manejo de errores consistente y visible al usuario (toasts/mensajes uniformes) — crítico en delivery/taxi donde fallos de red son comunes.
- Offline-first / PWA: considerar estados offline/carga lenta en cada feature.
- No romper lo que ya funciona: antes de refactorizar, confirmar que no se rompe el flujo de pago o el matching conductor-cliente.

## Índice de specs (detalle técnico y decisiones ya tomadas)
Ver `spec/README.md`. Resumen:
- `00` Arquitectura general y stack
- `01` Esquema de Firestore, estados, roles/admin
- `02` Notificaciones push (FCM)
- `03` Ubicación en vivo / tracking
- `04` Tarifas y cotización de precio
- `05` Identidad, geocoding y contacto (WhatsApp)
- `06` Seguimiento de pedidos sin login
- `07` Pendientes (TODO vivo)

## Regla de documentación de subagentes
Todo subagente que tome una decisión de diseño, resuelva un bug no trivial, o
implemente una feature nueva, debe documentar su trabajo en `/spec/` con el
formato `NN-nombre-descriptivo.md` (numeración según `spec/README.md`).
Bugfixes triviales (un typo, un campo mal escrito) no requieren spec nuevo,
pero sí una línea en `spec/07-pendientes.md` si quedó algo relacionado abierto.

## Agent Delegation Rules
Antes de empezar cualquier tarea:
- Determinar siempre si un subagente especializado debe encargarse de parte del trabajo.
- Decisiones de arquitectura, modelado de datos o trade-offs estructurales → **Architect** (ver `.claude/agents/architect.md`). Debe consultarse ANTES de que Frontend/Backend empiecen algo con estructuras de datos nuevas o cambios estructurales.
- Trabajo de frontend → **Frontend Expert**.
- Trabajo de backend → **Backend Expert**.
- Validación y testing → **QA Testing Expert**.
- Para tareas que cruzan varios dominios: descomponer el trabajo y delegar cada parte al subagente correspondiente antes de producir el resultado final.
- No hacer trabajo especializado directamente si existe un subagente que coincide.