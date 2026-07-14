# Hero: banner estático reemplaza al carrusel de 3 slides

**Fecha:** 2026-07-14
**Estado:** decidido e implementado (banner); pendiente el ajuste de altura mobile (ver `07-pendientes.md`)

## Contexto
El home usaba `HeroCarousel.jsx`/`.css` (3 slides con mecánica de carrusel).
El dueño del producto pidió reemplazarlo por un banner principal estático,
usando una imagen fija servida desde `public/bannerImg.jpg` (regla de
`00-arquitectura-general.md`: nada de Firebase Storage, imágenes vía URL/asset
directo).

## Decisión

### 1. `Hero.jsx` nuevo reemplaza el import en `HomePage.jsx`
`HomePage.jsx` ya no importa `HeroCarousel` — importa `Hero`
(`src/components/home/Hero.jsx`), que renderiza:
- Banner principal: `<img>` de fondo (`/bannerImg.jpg`) con overlay de
  gradiente para legibilidad, sin JS de carrusel (autoplay/dots/swipe).
- Debajo, 2 banners de acceso directo en grid 2 columnas: "🚕 Pedir viaje"
  (→ `/pedir-viaje`) y "🛒 Comprar" (→ ancla `#home-tiendas`).

Los banners anteriores de esa fila ("Hazte conductor" / "¿Tienes un
negocio?") se quitaron del home por decisión del dueño del producto "hasta
nuevo aviso" — `/ser-conductor` sigue existiendo como ruta, solo perdió su
promo en el home.

### 2. `HeroCarousel.jsx`/`.css` NO se borran — decisión explícita, no descuido
Quedan en `src/components/home/` sin ningún import en el resto de `src/`
(confirmado por grep). Es intencional: el dueño del producto pidió dejar el
carrusel "hasta nuevo aviso" por si se revierte la decisión, no borrarlo.
Reconfirmado 2026-07-14 al preguntarlo directamente ("NO, deja los archivos
del carrusel tal y como estan").

**Regla para quien toque este código después:** no borrar estos dos archivos
sin autorización explícita del dueño del producto, aunque el linter/build los
marque como no usados.

## Consecuencias
- Sin impacto en el bundle de producción: Vite no empaqueta archivos sin
  importar. El "costo" es solo cosmético (dos archivos sin uso visibles en el
  editor/repo), no de performance.
- Pendiente abierto (no cubierto por este spec, ver `07-pendientes.md`): en
  smartphone, el banner principal + los 2 banners secundarios deben ocupar
  exactamente el viewport restante después del header (primer pantallazo sin
  scroll = Header + Hero completo, nada más). Hoy `.promo-banner` usa
  `min-height: 152px` fijo — no se ajusta al alto real del dispositivo. Ese
  ajuste se planea aparte, no se implementó todavía.
