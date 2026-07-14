# Patrones de uber.com (sin su paleta), set de iconos SVG propio, y fix de viewport mobile del Hero

**Fecha:** 2026-07-14 (Parte 4 agregada el mismo día, ronda siguiente)
**Estado:** implementado — con una reversión parcial, ver Parte 4

## Contexto

El dueño del producto pidió tres cosas en una misma sesión de frontend:

1. En smartphone, el primer pantallazo de la Home (sin scroll) debe mostrar
   exactamente Header + Hero completo (banner principal + los 2 banners de
   acceso directo) — pendiente que ya estaba anotado en `07-pendientes.md` y
   en `14-hero-banner-estatico.md` como abierto.
2. Adoptar ciertos patrones de UI de **uber.com** (combobox de origen/destino
   tipo píldora + CTA único, franja de accesos rápidos por ícono) — **la
   paleta de Medaner (amarillo/blanco/negro sobre tema oscuro) no cambia**,
   solo la forma/practicidad de esos patrones.
3. Reemplazar los emojis nativos que representan objetos/conceptos (🚗🏍️🛒🏠
   etc.) por iconos SVG propios, en vez de descargar assets de un sitio como
   undraw.co (mencionado solo como referencia de estilo, no como fuente real).

Las tres partes son 100% frontend, sin estructura de datos nueva ni cambios
de contrato con el backend.

## Parte 1 — Viewport mobile: Header + Hero llenan la pantalla sin scroll

### El problema real (no es solo CSS)

`Header` y la sección del Hero (`Hero.jsx`) vivían en dos contenedores
distintos: `Header` como hermano directo de `<main className="home">`, y el
hero como el PRIMER hijo de ese `<main>`, junto con el resto de las
secciones de la Home (QuickAccessStrip, MisActividadReciente, ProductRail,
tiendas). Envolver "Header + `<main>` completo" en un solo `min-height:100dvh;
display:flex` (la solución ingenua) **no funciona** cuando el contenido total
de `<main>` es más alto que el viewport (que es el caso normal, con
categorías + rieles + grilla de tiendas + footer más abajo): en ese caso el
`flex-grow` no tiene espacio libre que repartir (el contenedor ya creció más
allá del `min-height` solo por el contenido), así que el hero NO se estira,
queda a su alto natural (~400px) y el resto del contenido se ve igual de
"pegado" que antes.

### Alternativas consideradas
- **Medir el alto del header con JS y restarlo del 100vh a mano.** Descartado
  explícitamente: el header no tiene alto fijo (1 o 2 filas según haya sesión
  y buscador), medirlo a mano es frágil y agrega JS innecesario a un problema
  de layout.
- **Envolver todo `<main>` en el flex de altura completa.** Descartado por lo
  explicado arriba: no funciona cuando el contenido total excede el viewport,
  que es el caso normal.
- **Sacar el Hero de `<main>` y agruparlo con `Header` en su propio wrapper
  flex** (la elegida): así el cálculo de "espacio libre" del flex-grow solo
  tiene que lidiar con Header + Hero, nunca con el resto de la Home.

### Decisión

En `HomePage.jsx`, `Header` y la sección `home__hero-section` (con `<Hero/>`
adentro) se movieron a un `<div className="home__viewport">` que envuelve
solo a esos dos, **antes** de `<main className="home">` (que ahora arranca
directo en QuickAccessStrip/MisActividadReciente/etc., sin el hero).

Puntos importantes de la implementación:

- **`Header` nunca cambia de posición en el árbol** al alternar
  `buscando` (búsqueda activa vs. Home normal): si se desmontara/remontara en
  cada tecla escrita, perdería el foco del input. Por eso el div
  `.home__viewport` SIEMPRE envuelve a `Header`; lo único condicional es si
  el hero se renderiza adentro (`!buscando`) y si se agrega la clase
  modificadora `--hero`.
- **`.home__viewport` es `display:contents` por defecto** (desktop/tablet, y
  mobile en modo búsqueda): esto hace que sus hijos se comporten como si
  fueran hijos directos de `#root` (que ya es `display:flex;flex-direction:
  column` global, ver `src/index.css`), exactamente igual que antes de
  introducir el wrapper — **cero cambio de layout fuera del caso hero**.
- Solo dentro de `@media (max-width:767px)` (mismo breakpoint que
  `Header.css`) y con la clase `--hero` presente, el wrapper pasa a
  `display:flex;flex-direction:column;min-height:100vh;min-height:100dvh`
  (100vh de fallback primero, 100dvh después para ajustar al alto real
  cuando la barra de direcciones de Chrome/Safari cambia de tamaño). `Header`
  queda `flex-shrink:0`; `.home__hero-section` pasa a `flex:1` — ahora SÍ hay
  espacio libre real que repartir, porque el wrapper no contiene nada más.
- Dentro de `Hero.css`, mismo breakpoint: `.hero` pasa a `flex:1`,
  `.hero__principal` (banner-foto) queda `flex-shrink:0` (mantiene su alto
  natural, nunca se estira), `.hero__banners` pasa a `flex:1` con
  `grid-template-rows:1fr` (fuerza que la única fila de la grid use el 100%
  del alto disponible — sin esto, un row "auto" de grid no necesariamente se
  estira al alto del contenedor), y `.promo-banner` pasa de `min-height:152px`
  fijo a `height:100%` para llenar esa fila. Piso de seguridad:
  `min-height:88px` en `.promo-banner` para pantallas muy bajas (celular en
  horizontal) — ahí es aceptable un poco de scroll, no se sacrifica
  legibilidad por cumplir el 100% a rajatabla.
- **Efecto colateral que hubo que corregir:** al sacar el hero de `<main
  class="home">`, perdió el padding horizontal (16px/24px) y el
  `max-width:var(--container)` que ese contenedor le daba — verificado en
  el navegador (el banner quedó pegado a los bordes de pantalla, ancho
  completo). Se repuso ese mismo padding/max-width directamente en
  `.home__hero-section`. También perdió el `gap:28px/36px` que el flex de
  `.home` aplicaba entre el hero y la sección siguiente (QuickAccessStrip):
  se repuso con una clase `.home--hero-arriba` (`margin-top:12px` en
  `<main>`, que sumado al `padding-top` que `.home` ya tenía —16px mobile/
  24px desktop— da el mismo total de 28px/36px de antes). Verificado con
  medición real en el navegador en 390px y 1280px: el hero llena exactamente
  el viewport en mobile, y en desktop el gap hero→QuickAccessStrip da
  exactamente 36px, igual que antes del cambio.

Archivos tocados: `src/pages/HomePage.jsx`, `src/pages/HomePage.css`,
`src/components/home/Hero.css`. `Hero.jsx` no cambió su estructura, solo se
le agregaron los iconos SVG de la Parte 3.

## Parte 2 — Patrones de uber.com (NO su paleta)

Referencia tomada de la versión mobile de uber.com: combobox de origen/
destino como elemento prominente tipo píldora + un solo CTA claro, y una
franja de accesos rápidos por ícono justo debajo del hero. **Se toma la
forma/practicidad de estos patrones, nunca los colores** — Medaner sigue en
tema oscuro con acento amarillo de marca (ver memoria `design-system-
rollout` y tokens en `src/index.css`).

### `PedirViajePage` (combobox de origen/destino)

El pendiente "rediseño del flujo de solicitud de viaje en una sola página
consolidada" (anotado en `07-pendientes.md`) ya estaba prácticamente
resuelto: `PedirViajePage.jsx` orquesta una sola página con vistas internas
(`solicitud`/`mapa`/`favorita-form`/`conductores`) sin rutas ni pasos
separados, y `SolicitudViajeView.jsx` ya tenía la forma correcta (card con
origen/destino + un único botón "Continuar" fijo abajo). No hizo falta
reescribir nada — solo refinar el estilo para que se sienta más "píldora":

- `.solicitud-viaje-view__card` (el combobox origen/destino) pasa a
  `background: var(--surface-2); border: 1px solid var(--line); border-
  radius: var(--radius-xl)` — mismo lenguaje visual que `.home-search` en
  `Header.css` (que ya usa `--surface-2`/pill), en vez de un radio de
  16px hardcodeado. No se usa el pill completo (999px) porque el combobox
  tiene 2 filas apiladas (origen/destino), no una sola línea — un radio
  grande (24px) da la sensación "píldora" sin verse raro con esa
  proporción.
- El CTA "Continuar" pasa a `border-radius: var(--radius-pill)` (999px,
  pill real: es un botón de una sola línea, ahí sí funciona).
- Padding interno de cada campo (origen/destino) un poco más generoso
  (14px→16px vertical, 16px→18px horizontal), con el conector punteado
  reposicionado para seguir alineado con los pines.

Esta página se marca como **completa** en `07-pendientes.md` (ya no "en
progreso"): el rediseño consolidado en una sola página ya estaba hecho de
antes, y ahora además tiene el estilo de patrón de referencia.

### `QuickAccessStrip` (franja de accesos rápidos)

Mismo dato (`categorias`), solo estilo: los tiles pasan de círculo
(`border-radius:50%`) a cuadrado de radio grande (`var(--radius-lg)`, 16px)
— el patrón visual de la franja Ride/Reserve/Food de uber.com usa tiles
redondeados, no círculos — con más aire (64px en vez de 60px, gap 16px en
vez de 14px). Estado activo: mismo criterio de color que ya existía
(fondo `--blue-100`, borde `--blue`), ahora también aplicado al color del
ícono (antes el emoji traía su propio color; el ícono SVG ahora hereda
`color` vía `currentColor`).

### Cards (`TiendaCard`, `HomeProductCard`)

Radio de borde de `var(--radius)` (12px) a `var(--radius-lg)` (16px) y
padding un poco más generoso, mismo espíritu de "practicidad sin
decoración innecesaria" que pide `CLAUDE.md`. El CTA ya existía en ambas
(chevron `›` en TiendaCard, botón `+` circular en HomeProductCard) — no
se agregó ninguno nuevo, ya cumplían "un CTA claro".

## Parte 3 — Set de iconos SVG propio (reemplaza emojis funcionales)

### Por qué SVG propio y no undraw.co

undraw.co se mencionó solo como referencia de estilo (ilustraciones planas,
no literalmente sus assets). Descargar de ahí requeriría: (a) permiso
explícito por archivo (regla de este agente: descargar archivos requiere
confirmación), y (b) recolorearlos igual para que hereden la paleta de
Medaner, ya que undraw usa su propia paleta por defecto. Un set propio con
`currentColor` resuelve el recoloreo gratis (hereda del CSS del lugar donde
se usa) y no depende de una descarga externa ni de licencias de terceros.

### Arquitectura

- `src/components/icons/IconBase.jsx` — wrapper compartido: define
  `viewBox="0 0 24 24"`, `stroke="currentColor"`, `fill="none"`,
  `strokeWidth="1.8"`, tamaño vía prop `size` (default 20). Cada ícono
  concreto es solo su `<path>`/`<circle>`/`<rect>` — ningún ícono repite el
  boilerplate de stroke/viewBox.
- `src/components/icons/Icons.jsx` — ~17 componentes concretos (`IconCar`,
  `IconMoto`, `IconShoppingBag`, `IconCart`, `IconHome`, `IconBriefcase`,
  `IconGraduationCap`, `IconHeart`, `IconCash`, `IconPhone`,
  `IconTransfer`, `IconMedicalCross`, `IconUtensils`, `IconCloche`,
  `IconDrink`, `IconStorefront`, `IconCompass`). Estilo plano/geométrico
  simple a propósito (no ilustraciones detalladas): se leen bien a 16-28px
  sin competir con la tipografía de al lado.
- `src/components/icons/CategoriaIcon.jsx` — traduce la CLAVE de
  `iconoDeCategoria` (ver abajo) al componente SVG concreto. Separado de
  `utils/categorias.js` a propósito: los utils son lógica pura sin React,
  los componentes viven en `components/`.
- `src/components/icons/FavoritaTituloIcon.jsx` — mismo patrón para
  Hogar/Trabajo/Universidad/Personalizado, consolidando el objeto
  `ICONOS_TITULO` que antes estaba **duplicado** en
  `DireccionesFavoritasList.jsx` y `FavoritaForm.jsx`.

Accesibilidad: todos los usos son decorativos (`aria-hidden="true"`) porque
van junto a texto que ya dice lo mismo (ej. "Pedir viaje", el nombre de la
categoría, el label del método de pago), o dentro de un botón que ya tiene
su propio `aria-label` (`CartIcon`). Ninguno de los reemplazos de esta
ronda es el ÚNICO contenido informativo de su elemento, así que no hizo
falta `role="img"` + `aria-label` en ningún ícono nuevo.

### `utils/categorias.js`: de emoji a clave de ícono

`iconoDeCategoria(categoria)` antes devolvía un emoji directo; ahora
devuelve una **clave** (string) que `CategoriaIcon` traduce a un
componente. Solo 5 categorías tienen ícono dedicado (las que el dueño del
producto priorizó explícitamente): `comida`, `restaurante`,
`mercado`/`supermercado` (comparten `IconCart`), `farmacia`, `bebidas`.
Todas las demás (`comidarapida`, `abasto`, `ferreteria`, `licoreria`,
`panaderia`, `reposteria`, `carniceria`, `fruteria`, `verduleria`, `ropa`,
`tecnologia`, `electronica`, `belleza`, `mascotas`, `flores`, `libreria`,
`juguetes`, `hogar`, y cualquier categoría nueva no listada) caen en
`IconStorefront` (vitrina genérica) — la instrucción explícita fue
priorizar esas 5 y usar un ícono neutro simple para el resto en vez de
ilustrar las ~20 categorías una por una.

### Reemplazos hechos (uno por archivo)

| Archivo | Antes | Ahora |
|---|---|---|
| `VehiculoSeleccionSheet.jsx` | `icono="🚗"` / `icono="🏍️"` | prop `Icono` recibe el componente (`IconCar`/`IconMoto`) directo, no un string |
| `ConductorAsignadoPanel.jsx` | `VEHICULO_ICON` con emoji | mismos `IconCar`/`IconMoto` reusados (no un SVG nuevo) |
| `MisPedidosRecientes.jsx` | `🛵` pedido / `🚕` viaje | `IconMoto` (pedido) / `IconCar` (viaje) — se reusa `IconMoto` para el scooter de delivery en vez de un tercer ícono casi idéntico |
| `Hero.jsx` | `🚕 Pedir viaje` / `🛒 Comprar` | `IconCar`/`IconShoppingBag` junto al texto (no lo reemplazan) |
| `QuickAccessStrip.jsx` (vía `categorias.js`) | emoji por categoría | `CategoriaIcon`, ver tabla de arriba. Bonus fuera de la lista original: el ícono "Todas" (🧭) también se reemplazó por `IconCompass`, mismo archivo, mismo criterio |
| `Footer.jsx` | `💵`/`📱`/`💸` | `IconCash`/`IconPhone`/`IconTransfer` — Transfer es genérico a propósito, NO el logo de Zelle (marca de terceros); el texto "Zelle" ya identifica el método |
| `CartIcon.jsx` | `🛒` | `IconCart`, decorativo (el botón ya tiene su `aria-label`) |
| `DireccionesFavoritasList.jsx` / `FavoritaForm.jsx` | `ICONOS_TITULO` duplicado (Hogar🏠/Trabajo💼/Universidad🎓/Personalizado❤️) | `FavoritaTituloIcon` compartido — con una excepción, ver abajo |

### Excepción encontrada: el `<select>` de `FavoritaForm.jsx`

Un `<option>` nativo de HTML **solo puede mostrar texto** — cualquier
elemento hijo (incluido un `<svg>`) se ignora en el render del navegador.
El ícono no puede meterse ahí sin reemplazar el `<select>` nativo por un
listbox custom, lo que habría sido un cambio de UX/accesibilidad bastante
más grande que "cambiar un ícono" (afecta comportamiento móvil nativo,
teclado, etc.) y fuera de alcance de esta tarea. Se optó por quitar el
emoji de las opciones y dejarlas en texto plano (`Hogar`, `Trabajo`,
`Universidad`, `Personalizado`) — cumple el pedido real ("no dejar el
emoji nativo") sin inventar un workaround riesgoso. El ícono para este
mismo concepto sigue existiendo donde SÍ puede renderizarse:
`DireccionesFavoritasList.jsx` (tarjetas custom, no un `<select>`).

### Casos deliberadamente NO tocados en esta ronda

- **`MapaConductoresView.jsx`** (`ICONO_VEHICULO`, usado como
  `el.textContent` de un marcador HTML de Mapbox, no JSX) — mismo criterio
  que el hex de `--green` en ese archivo (ver `07-pendientes.md`): no
  meterse con lógica de mapas/marcadores fuera del alcance pedido. Queda
  como candidato futuro si se decide invertir en iconografía dentro de los
  marcadores del mapa.
- **`HeroCarousel.jsx`/`.css`** — explícitamente fuera de alcance por
  `14-hero-banner-estatico.md` (archivo sin importar en ningún lado,
  conservado "hasta nuevo aviso"; no se toca aunque tenga emoji).
- Símbolos abstractos de UI (no representan objetos/conceptos): `✕`
  (cerrar), `✓`/`+` (botones), `📍` (ubicación), `💬` (WhatsApp), `🔒`,
  `⚠️`, `📲` — quedan igual, tal como pidió el dueño del producto. Candidatos
  a revisar en una futura ronda si se decide ampliar el sistema de iconos
  a símbolos de UI además de objetos/conceptos.

## Consecuencias

- Bundle: el set de iconos son componentes React livianos (SVG inline, sin
  librería externa tipo lucide-react/heroicons) — cero dependencia nueva,
  alineado con la restricción de hardware local (4GB RAM) y con minimizar
  bundle size.
- `iconoDeCategoria()` cambió de contrato (emoji string → clave string):
  sus únicos 2 consumidores (`TiendaCard.jsx`, `QuickAccessStrip.jsx`) se
  migraron a `<CategoriaIcon>` en el mismo cambio, no queda ningún caller
  usando el valor viejo.
- Verificación: `npm run build` (Vite) sin errores, `npx oxlint` sin
  warnings sobre los archivos tocados, y verificación manual en navegador
  (mobile 390×844 y desktop 1280×900) confirmando con medición real del DOM
  que el hero llena el viewport exacto en mobile y que el layout desktop no
  cambió un píxel en los puntos medidos (header, hero, gap a
  QuickAccessStrip). `PedirViajePage` requiere sesión de cliente
  (`RutaClienteProtegida`) — sin Supabase configurado localmente no se pudo
  verificar visualmente el combobox/VehiculoSeleccionSheet en el navegador
  en esta sesión, pero `vite build` compiló esos módulos sin errores
  (incluidos en el chunk `PedirViajePage-*.js`), que es el nivel de
  verificación que esta tarea pedía sin backend real disponible.

## Parte 4 — Reversión del viewport-fill mobile + ilustraciones planas propias

El dueño del producto revisó el resultado de la Parte 1 (Header+Hero llenando
el viewport en mobile) y de los iconos de línea simple en dos superficies
puntuales, y pidió dos cambios sobre lo ya implementado.

### 4.a — El viewport-fill de la Parte 1 se revirtió

**Motivo:** los 2 banners secundarios (`.promo-banner`), al estirarse con
`flex:1` para llenar el espacio restante del viewport, quedaban "enormes y
vacíos" — mucho espacio en blanco alrededor de un título + subtítulo cortos.
El dueño del producto rechazó explícitamente que estos banners fueran
flexibles/estirados. Como el mecanismo de la Parte 1 dependía enteramente de
que `.hero__banners`/`.promo-banner` tuvieran `flex:1` (ver Parte 1 arriba),
no había forma de mantener "Header+Hero llenan el viewport exacto" sin
banners flexibles — **se descartó el objetivo de llenado exacto del
viewport**, no solo su implementación.

**Reversión (limpia, sin dejar código muerto):**
- `HomePage.jsx`: se quitó el wrapper `<div className="home__viewport...">`
  que sacaba `Header` + la sección del hero de `<main>`. `Header` volvió a
  ser hermano directo de `<main className="home">` (posición fija en el
  árbol, igual que antes — sigue sin desmontarse al escribir en el buscador).
  La sección del hero (`<section className="home__section
  home__hero-section"><Hero /></section>`) volvió a ser el primer hijo
  condicional (`!buscando`) de `<main>`, antes del ternario que decide entre
  resultados de búsqueda y el resto de la Home.
- `HomePage.css`: se eliminaron `.home__viewport`, `.home__viewport--hero` (y
  su bloque `@media (max-width:767px)`), `.home--hero-arriba`, y el bloque de
  `.home__hero-section` que le daba padding/max-width propios (ya no hace
  falta: al volver el hero dentro de `.home`, ese contenedor ya le da
  padding horizontal, `max-width:var(--container)` y el `gap` respecto a la
  siguiente sección, gratis).
- `Hero.css`: se eliminó el `@media (max-width:767px)` que ponía `.hero
  {flex:1}`, `.hero__banners {flex:1; grid-template-rows:1fr}` y
  `.promo-banner {height:100%; min-height:88px}` — todo el mecanismo de
  estiramiento.

`HeroCarousel.jsx`/`.css` no se tocaron (siguen sin importarse en ningún
lado, ver `14-hero-banner-estatico.md`).

### 4.b — Banners: alto fijo mayor + ilustración de fondo (reemplaza el estiramiento)

En vez de estirarse al viewport, `.promo-banner` pasó a tener **alto fijo**
(`height: 220px` en mobile — no `min-height`, a propósito, para que quede
claro que no es negociable/flexible; en desktop, `900px+`, vuelve a
`height:auto; min-height:190px` como estaba antes de la Parte 1, ahí sí hay
aire de sobra alrededor y no hace falta forzarlo). Para que ese alto se vea
"lleno" y no vacío, cada banner ahora tiene su propia ilustración de fondo:

- `.promo-banner--viaje` (Pedir viaje) → `IllustrationMoto`.
- `.promo-banner--comprar` (Comprar) → `IllustrationFood`.

Implementación: la ilustración se renderiza como hijo del `<Link>`/`<a>` del
banner, `position:absolute` en la esquina inferior derecha con un pequeño
"sangrado" negativo (`right:-12px; bottom:-12px`) para que se sienta parte
del fondo y no un ícono flotando centrado; `overflow:hidden` en
`.promo-banner` recorta lo que sobra a las esquinas redondeadas.
`pointer-events:none` en la ilustración para que no capture el click/tap del
banner completo (`.promo-banner` sigue siendo el único elemento clickeable).
Encima va un `<span className="promo-banner__overlay">` con un gradiente
lineal (sólido del lado del texto → transparente hacia la esquina de la
ilustración) para que el título/subtítulo sigan legibles sobre la
ilustración; cada variante usa el gradiente en su propio tono (réplica en
rgba() del hex de `--blue-100`/`--surface-2` — un `linear-gradient` no puede
tomar la opacidad de un `var()` hex directo sin `color-mix()`, que todavía no
tiene soporte universal en navegadores Android/iOS de gama baja, así que se
hardcodeó el rgba equivalente en vez de depender de esa función). El texto
(`.promo-banner__titulo`/`__texto`) se reposicionó con `position:relative;
z-index:2` para quedar por encima de la ilustración y el overlay a pesar de
venir antes en el DOM — un elemento `position:static` NO gana automáticamente
por orden de DOM frente a elementos `position:absolute` sin z-index
explícito, hay que forzarlo. Los iconos chicos del título (`IconCar` /
`IconShoppingBag`, junto al texto "Pedir viaje"/"Comprar") se mantuvieron sin
cambios: son pequeños y quedan sobre la zona sólida del gradiente, no
compiten con la ilustración de fondo.

### 4.c — Ilustraciones planas propias (reemplazan los iconos de línea en 2 superficies puntuales)

El dueño del producto también rechazó los iconos de línea simple (Parte 3,
`IconCar`/`IconMoto`) en dos superficies concretas — la tarjeta de selección
de vehículo y los banners del home — pidiendo en su lugar **ilustraciones
planas detalladas estilo undraw.co** (formas rellenas con 2-3 tonos de
sombreado, ventanas/reflejos, no un trazo de un solo color). El resto de las
superficies con iconos de línea (Footer, CartIcon, favoritos, categorías del
QuickAccessStrip, `ConductorAsignadoPanel`, `MisPedidosRecientes`) **no se
tocaron** — el reclamo fue específico a estas dos superficies, no un rechazo
general al set de iconos de la Parte 3.

**Origen de las ilustraciones — se intentó primero la opción de licencia
abierta, según el orden de preferencia pedido:** se probó `undraw.co` por
navegador (buscar "car" en su buscador). El buscador de ese sitio depende de
Algolia y no llegó a renderizar resultados utilizables en la sesión: la
herramienta de captura de pantalla del navegador dio timeout repetidas veces
(en esa página y también después, en la propia app, así que no era un
problema del sitio sino de la herramienta de captura en este entorno), y
`read_page`/`get_page_text` tras enviar la búsqueda no mostraron ningún
resultado en el DOM (solo quedó el formulario de búsqueda vacío). Ante una
fuente poco confiable y sin poder confirmar visualmente qué se estaba
descargando, se optó por la alternativa explícitamente autorizada para este
caso: **ilustraciones propias, dibujadas a mano en SVG inline**, en el mismo
espíritu undraw (planas, con volumen/sombreado, no fotografía) — sin
depender de un asset ni una licencia de terceros.

Nuevo archivo `src/components/icons/Illustrations.jsx` —
`IllustrationCar`, `IllustrationMoto`, `IllustrationFood`. Mismo contrato de
props que los íconos de `Icons.jsx` (`className` + cualquier prop de `<svg>`
vía spread), pero sin wrapper `IconBase` compartido: a diferencia de los
íconos (un solo `stroke="currentColor"`), estas son ilustraciones
**multicolor** (varios `fill` distintos por forma), así que no hay un
"color heredado" único que centralizar. Técnica reusada en las 3 piezas para
lograr sombreado sin degradés ni filtros: dos formas superpuestas por cada
"cuerpo" (carrocería del auto, tanque de la moto, pan de la hamburguesa) —
la de atrás un poco más grande y en tono oscuro (`var(--blue-700)`), la de
adelante en el tono principal (`var(--yellow)`) tapando casi todo menos un
borde/banda que queda como sombra. Paleta:
- Tono principal / sombra de cada "carrocería": `var(--yellow)` /
  `var(--blue-700)` (tokens existentes de `src/index.css`).
- Vidrios/faros/reflejos: blancos o cremas claros nuevos (`#e8f1f8`,
  `#fff6dd`) — no hay token de "vidrio de auto" o "luz cálida", inevitable.
- Llantas: grises oscuros neutros nuevos (`#0c141b`, `#2e3a47`, `#4b5563`,
  `#9aa5b1` para el caño de escape) — no hay token de "metal/caucho".
- Comida: la lechuga reusa `var(--green)` (ya es el único acento fuera de la
  paleta de marca que existe en el proyecto, ver `src/index.css` y
  `12-badge-conductores-precio.md`); tomate y carne usan tonos realistas
  nuevos (`#c0453f`, `#7a4b23`) inevitables para que se lea como comida de
  verdad y no como un ícono monocromo.

**Dónde se usan:**
- `VehiculoSeleccionSheet.jsx` / `.css`: la prop `Icono` de `TarjetaVehiculo`
  se renombró a `Ilustracion` (recibe `IllustrationCar`/`IllustrationMoto`
  directo, mismo patrón que antes con los iconos). Se eliminó el `<span
  className="...tarjeta-icono">` que envolvía un ícono de 28px y se
  reemplazó por la ilustración sola con su propia clase
  (`.vehiculo-seleccion-sheet__tarjeta-ilustracion`): alto fijo 76px +
  `max-width:138px`, sin distorsión (el SVG escala con
  `preserveAspectRatio` por defecto y se centra solo dentro de esa caja,
  aunque el auto y la moto tengan proporciones de `viewBox` distintas). Se
  ajustó el padding de la tarjeta (`18px 10px 16px`) para la ilustración más
  grande. El resto de la lógica (precio, badge de conductores, tooltip,
  selección, aria) no se tocó.
- `Hero.jsx` / `Hero.css`: ver 4.b arriba — `IllustrationMoto` de fondo en
  el banner "Pedir viaje", `IllustrationFood` en "Comprar".

**Verificación:** `npm run dev` (Vite) + navegador en mobile (390×844) y
desktop (1280×900). La herramienta de captura de pantalla del navegador dio
timeout de forma consistente en toda la sesión (no solo en undraw.co), así
que la verificación visual se hizo leyendo el DOM/estilos computados en vez
de una captura: se confirmó por JS (`getBoundingClientRect` +
`getComputedStyle`) que en mobile ambos `.promo-banner` miden exactamente
220×173px (alto fijo, no estirado), que las ilustraciones de fondo (`<svg>`)
están presentes, visibles y con sus dimensiones esperadas (moto 176×120,
comida 133×120, proporciones consistentes con sus `viewBox`), que los
gradientes de overlay se aplican con el color correcto por variante, que el
hero vuelve a heredar el padding/max-width de `.home` (sección del hero en
`x:16..374` de un viewport de 390, igual que el resto de las secciones), y
que no hay scroll horizontal (`body.scrollWidth === window.innerWidth`). En
desktop se confirmó que `.promo-banner` vuelve a `height:auto;
min-height:190px` (no se queda con el alto fijo de mobile) y que
`.hero__principal` sigue en 340px como antes. Sin errores de consola ni
requests fallidos (`bannerImg.jpg` y todos los módulos cargan 200 OK). `npm
run build` (vite build) compiló sin errores, incluyendo el chunk
`PedirViajePage-*.js` (donde vive `VehiculoSeleccionSheet`).

**No se pudo verificar visualmente:** las tarjetas de
`VehiculoSeleccionSheet` con las ilustraciones — esa vista vive detrás de
`RutaClienteProtegida` (requiere sesión de cliente) y no hay Supabase
configurado localmente, mismo límite ya documentado en la Parte 3 de este
spec para el combobox de `PedirViajePage`. Tampoco se pudo probar el flujo de
búsqueda (`buscando=true`) en el navegador: el buscador del header solo se
renderiza con sesión de cliente activa (ver comentario en `Header.jsx`), así
que no había forma de escribir en él sin login. La lectura del código (la
condición `{!buscando && (...)}` para el hero y el ternario de resultados se
mantuvieron intactos, solo se movió su posición en el árbol) da confianza de
que el comportamiento no cambió, pero queda como verificación manual
pendiente cuando haya sesión de cliente disponible.
