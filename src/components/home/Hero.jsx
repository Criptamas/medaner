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
        {/* Banner estático 1: refuerza el modelo de pago real de Medaner. */}
        <div className="promo-banner promo-banner--pago">
          <span className="promo-banner__titulo">Paga fácil</span>
          <span className="promo-banner__texto">Efectivo · Pago móvil · Zelle</span>
        </div>

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
