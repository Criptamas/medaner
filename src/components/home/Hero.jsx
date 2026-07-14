import { Link } from 'react-router-dom'
import { IconCar, IconShoppingBag } from '../icons/Icons'
import { IllustrationMoto, IllustrationFood } from '../icons/Illustrations'
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
      <Link to="/ser-conductor">
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
        </Link>

      
      </div>

      <div className="hero__banners">
        {/* Acceso directo a pedir un viaje: mismo destino que ya usaba el
            slide "viaje" del carrusel anterior. Ilustración de moto de fondo
            (ver spec/15-*.md) + overlay para legibilidad; ícono del título
            decorativo (aria-hidden): el texto ya dice "Pedir viaje", no es el
            único contenido informativo. */}
        <Link to="/pedir-viaje" className="promo-banner promo-banner--viaje">
          <IllustrationMoto className="promo-banner__ilustracion" aria-hidden="true" />
          <span className="promo-banner__overlay" aria-hidden="true" />
          <span className="promo-banner__titulo">
            <IconCar size={20} aria-hidden="true" className="promo-banner__icono" />
            Pedir viaje
          </span>
          <span className="promo-banner__texto">Mototaxi o taxi al instante →</span>
        </Link>

        {/* Acceso directo a la sección de tiendas del home (ancla interna:
            id="home-tiendas" en HomePage.jsx). Ilustración de comida de fondo,
            mismo criterio que el banner de viaje. */}
        <a href="#home-tiendas" className="promo-banner promo-banner--comprar">
          <IllustrationFood className="promo-banner__ilustracion" aria-hidden="true" />
          <span className="promo-banner__overlay" aria-hidden="true" />
          <span className="promo-banner__titulo">
            <IconShoppingBag size={20} aria-hidden="true" className="promo-banner__icono" />
            Comprar
          </span>
          <span className="promo-banner__texto">Tiendas locales con delivery →</span>
        </a>
      </div>
    </section>
  )
}
