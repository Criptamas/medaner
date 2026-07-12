# Arquitectura general — Medaner

**Fecha:** 2026-07-12
**Estado:** decidido

## Contexto
Medaner (medaner.com) es una app web de delivery y taxi/mototaxi para Punto Fijo, estado Falcón, Venezuela. Este documento centraliza el stack y las decisiones estructurales que no cambian seguido.

## Stack
- **Frontend:** React + Vite (PWA)
- **Backend/DB:** Firebase (plan Spark) — Firestore, Auth, FCM. Storage NO disponible (restricción de facturación de Google Cloud en Venezuela) → imágenes vía URL externa (Cloudinary/LoremFlickr).
- **Mapas:** Mapbox (confirmado correcto frente a cambios de pricing 2026 de Google Maps; además Google Maps Geocoding exige Cloud Billing, no soportado en Venezuela — mismo motivo que Storage).
- **Hosting:** Vercel. Dominio comprado en Cloudflare (registrar), DNS only (proxy desactivado), apunta a Vercel.
- **Editor:** VS Code + Claude Code.
- **Migración en curso (híbrida):** Supabase para datos relacionales (usuarios, catálogo de tiendas), Firebase se mantiene exclusivamente para FCM.

## Restricción de hardware del desarrollador
Laptop con 4GB RAM, i3 11va gen, 128GB almacenamiento. Evitar dependencias o procesos de build pesados cuando exista una alternativa más liviana. Cualquier recomendación de herramienta/dependencia debe considerar esto.

## Pagos
Efectivo o pago móvil directo cliente-conductor. Sin Stripe (no soportado en Venezuela). Sin comprobante obligatorio.

## Modelo de negocio
- Conductores: $5/semana fijo (modelo piloto).
- Tiendas: sin comisión por ahora. A futuro: 10–15% por pedido al escalar, o tarifa mensual fija.
- Negociación con inversores: vía SAFE notes. Pricing a validar con 10 tiendas piloto antes de comprometer modelo definitivo.
- Breakeven estimado: ~20 conductores activos.

## Competencia local conocida
**Colex** — competidor en Falcón. También opera sin comprobante de pago obligatorio, pago efectivo/móvil directo.

## Reglas de escalabilidad (aplican a toda decisión futura)
- Toda decisión de desarrollo debe considerar que el proyecto escalará (más tiendas, más conductores, más ciudades de Falcón a futuro).
- Evitar soluciones "quick fix" que compliquen crecer después (estructuras de datos rígidas, lógica hardcodeada, acoplamiento innecesario).
- Estructurar Firestore/Supabase y el código pensando en que el volumen de datos y usuarios va a crecer.
- No romper lo que ya funciona: antes de refactorizar, confirmar que no se rompe el flujo de pago o el matching conductor-cliente.

## Riesgos clave identificados
- GPS en background no confiable en PWA. Mitigación por etapas: Screen Wake Lock → TWA → Capacitor (app nativa).
- Bug de concurrencia en Firestore al asignar viajes — requiere `runTransaction`.

## Consecuencias
- Cualquier feature nueva que toque persistencia debe decidir explícitamente si va en Supabase o Firebase, y documentarlo en `01-firestore-schema.md` o el spec correspondiente.
- No introducir Stripe, Firebase Storage, ni Google Maps Geocoding en ningún flujo nuevo.