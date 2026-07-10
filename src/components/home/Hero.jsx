import { Link } from 'react-router-dom'
import HeroCarousel from './HeroCarousel'
import './Hero.css'

// Hero de la Home.
// - Desktop: carrusel grande a la izquierda + dos banners estáticos apilados
//   a la derecha (layout de 2 columnas).
// - Móvil: todo apilado, priorizando el carrusel (va primero).
export default function Hero() {
  return (
    <section className="hero" aria-label="Destacados">
      <div className="hero__carousel">
        <HeroCarousel />
      </div>

      <div className="hero__banners">
        {/* Banner estático 1: captación de conductores (modelo de negocio —
            los conductores pagan la cuota semanal). Lleva al formulario de
            postulación /ser-conductor. */}
        <Link to="/ser-conductor" className="promo-banner promo-banner--conductor">
          <span className="promo-banner__titulo">🛵 Hazte conductor</span>
          <span className="promo-banner__texto">Genera ingresos con Medaner →</span>
        </Link>

        {/* Banner estático 2: captación de tiendas (modelo de negocio). Enlaza
            a la sección de soporte del footer (ancla interna, no URL externa). */}
        <a href="#home-soporte" className="promo-banner promo-banner--negocio">
          <span className="promo-banner__titulo">¿Tienes un negocio?</span>
          <span className="promo-banner__texto">Vende con Medaner en Punto Fijo →</span>
        </a>
      </div>
    </section>
  )
}
