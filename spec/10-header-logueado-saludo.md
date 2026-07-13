# 10 — Header logueado: saludo con avatar reemplaza logo

## Contexto

El header de la Home (`src/components/home/Header.jsx`) tiene dos estados
según la sesión de cliente (Supabase Auth, `useClienteAuth()`):

- **Sin sesión:** logo Medaner (PNG "m." + wordmark) a la izquierda, menú
  hamburguesa (`HeaderMenu`) a la derecha.
- **Con sesión (antes de este cambio):** el mismo logo a la izquierda, y a la
  derecha dos elementos apilados: `TasaCambioWidget` (tasa BCV del día) +
  `ProfileChip` (avatar + nombre, link a `/perfil`).

Además, `TasaCambioWidget.css` tenía un bug de color: `.tasa-cambio-widget__valor`
usaba `color: var(--navy)`. En el tema oscuro actual, `--navy` vale `#0c141b`
(el fondo más oscuro de toda la app), y el widget se renderiza sobre
`--surface-2` (`#1a222a`, fondo del header) — el resultado era texto
prácticamente negro sobre un fondo casi igual de oscuro, ilegible. Es un
remanente de la migración del tema claro al oscuro (`--navy` cambió de valor
pero no todos sus usos se revisaron uno por uno).

## Decisión

1. **El saludo (avatar + "Hola, `<nombre>`") reemplaza al logo** en la
   posición izquierda del header, únicamente en el estado logueado. El logo
   ya no se muestra ahí cuando hay sesión: a alguien que ya está adentro no
   hace falta mostrarle la marca en cada visita a la Home, y el saludo
   personalizado aporta más contexto ("sé quién sos") en ese mismo espacio.
   - `ProfileChip.jsx` se reescribió para renderizar este bloque (mismo
     nombre de componente y de archivo — sigue siendo el link a `/perfil`,
     solo cambió su contenido visual). Usa `Avatar` (ya existente,
     `src/components/Avatar.jsx`) a 48px, sin duplicar lógica de
     fallback/onError de imagen.
   - Todo el bloque (avatar + texto) es un único `<Link to="/perfil"
     aria-label="Mi perfil">` — mismo patrón de accesibilidad que ya tenía
     el chip viejo.
2. **La tasa de cambio queda sola a la derecha**, ya no comparte esa zona con
   `ProfileChip` (que se movió a la izquierda). Sigue siendo el mismo
   `TasaCambioWidget` (mismo componente, mismo `<button>`, mismo
   `TasaCambioSheet` al hacer tap) — no se tocó su comportamiento, solo su
   color.
3. **Fix del bug de color:** se agregó el token `--green: #22c55e` en
   `src/index.css`, mismo tono que ya usaba el pin de "destino" en
   `MapaConductoresView.jsx` (`mapboxgl.Marker({ color: '#22C55E' })`) — se
   reutiliza el verde ya establecido en la app en vez de inventar uno nuevo.
   `.tasa-cambio-widget__eyebrow`, `__valor` y `__chevron` ahora usan
   `var(--green)`, legible sobre `--surface-2`.
4. **Bug de layout encontrado y corregido durante la verificación:** con
   `flex: 0 1 auto` (basis por defecto), un nombre muy largo hacía que el
   navegador calculara el tamaño "hipotético" del chip usando el ancho
   completo del texto sin truncar (el `text-overflow: ellipsis` recién actúa
   después de que el layout ya decidió cuánto espacio darle a cada elemento
   en la fila). Eso empujaba la tasa de cambio a una segunda fila en vez de
   compartir la de arriba — sin overflow horizontal, pero rompiendo el diseño
   de una sola fila. Se resolvió con `flex: 1 1 0` + `min-width: 0` +
   `max-width: 240px` en `.profile-chip`: basis en 0 evita que el texto largo
   infle el cálculo de wrap, `grow: 1` deja que el bloque ocupe el espacio
   libre, y el `max-width` evita que en desktop (con mucho espacio disponible
   junto al buscador) el link termine con un área clickeable enorme e
   invisible entre el nombre corto y el buscador.

## Consecuencias

- La marca Medaner (logo + wordmark) sigue presente en: el estado NO
  logueado del header (primera impresión de alguien que no entró todavía) y
  en el resto del sitio (footer, páginas de auth, etc. — no se tocó nada
  fuera de este header). No desaparece de la app, solo de este lugar
  puntual donde ya no aporta.
- `ProfileChip.jsx`/`.css` cambiaron de propósito visual (de "chip con
  nombre en una línea" a "saludo en dos líneas") pero mantienen el mismo rol
  funcional (link a `/perfil`, mismo `aria-label`) y el mismo punto único de
  uso (`Header.jsx`). Cualquier cambio futuro al "quién soy / a dónde voy"
  del header logueado debe seguir viviendo acá, no duplicarse en otro
  componente.
- El token `--green` queda disponible para cualquier otro caso de "dato en
  vivo / estado positivo" en la app (ver nota en `07-pendientes.md` sobre
  consolidarlo con el uso hardcodeado en `MapaConductoresView.jsx`).
- El patrón `flex: 1 1 0` + `min-width: 0` + `max-width` en un elemento que
  debe convivir con texto de longitud variable en una fila flex es
  reutilizable: si aparece otro caso similar (nombre/texto dinámico +
  elemento fijo en la misma fila), preferir este patrón sobre `flex: 0 1
  auto`, que es el que causó el bug de wrap acá.
