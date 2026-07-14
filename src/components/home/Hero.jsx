import { Link } from 'react-router-dom'
import './Hero.css'

// Hero de la Home.
// - Banner principal grande y horizontal (imagen de fondo + overlay), sin
//   mecánica de carrusel. Reemplaza al HeroCarousel de 3 slides: el carrusel
//   se dejó de usar "hasta nuevo aviso" (decisión del dueño del producto), no
//   se borró — ver HeroCarousel.jsx/.css, que quedan sin importar en ningún
//   lado por ahora, listos para retomarse si se revierte la decisión.
// - Debajo, 2 banners de acceso directo: pedir un viaje y comprar en tiendas.
//   Los banners anteriores ("Hazte conductor" / "¿Tienes un negocio?") se
//   quitaron del home por decisión del dueño del producto "hasta nuevo aviso"
//   (/ser-conductor sigue existiendo como ruta, solo perdió su promo acá).
export default function Hero() {
  return (
    <section className="hero" aria-label="Destacados">
      <div className="hero__principal">
        {/* Imagen de fondo vía <img> (no CSS background-image) a propósito:
            así podemos degradar con onError igual que Avatar.jsx — si
            /bannerImg.jpg todavía no existe o la URL se rompe, ocultamos el
            <img> y queda el fondo sólido de --surface-2 del contenedor,
            nunca un ícono de imagen rota. Es puramente decorativa (el
            mensaje real va en el texto de al lado), por eso alt="". */}
        <img
          className="hero__principal-img"
          src="/bannerImg.jpg"
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          onError={(e) => {
            e.currentTarget.style.visibility = 'hidden'
          }}
        />
        {/* Overlay oscuro degradado: garantiza contraste del texto sin
            importar qué imagen se suba después. */}
        <div className="hero__principal-overlay" aria-hidden="true" />
        <div className="hero__principal-contenido">
          <span className="hero__principal-eyebrow">Punto Fijo, Falcón</span>
          <h2 className="hero__principal-titulo">Todo lo que necesitas, en un solo lugar</h2>
          <p className="hero__principal-texto">
            Delivery de tiendas locales y viajes en mototaxi o taxi, pagando como prefieras.
          </p>
        </div>
      </div>

      <div className="hero__banners">
        {/* Acceso directo a pedir un viaje: mismo destino e ícono (🚕) que ya
            usaba el slide "viaje" del carrusel anterior. */}
        <Link to="/pedir-viaje" className="promo-banner promo-banner--viaje">
          <span className="promo-banner__titulo">🚕 Pedir viaje</span>
          <span className="promo-banner__texto">Mototaxi o taxi al instante →</span>
        </Link>

        {/* Acceso directo a la sección de tiendas del home (ancla interna:
            id="home-tiendas" en HomePage.jsx). */}
        <a href="#home-tiendas" className="promo-banner promo-banner--comprar">
          <span className="promo-banner__titulo">🛒 Comprar</span>
          <span className="promo-banner__texto">Tiendas locales con delivery →</span>
        </a>
      </div>
    </section>
  )
}
