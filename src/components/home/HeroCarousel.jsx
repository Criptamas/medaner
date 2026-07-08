import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './HeroCarousel.css'

// Carrusel liviano SIN librería (scroll-snap nativo + un poco de JS para los
// puntos y el auto-avance). Evita sumar Embla/Swiper al bundle, importante por
// la laptop de 4GB y por no cargar peso extra a usuarios con conexión
// inestable en Falcón.
//
// Slides estáticos (promocionales, placeholder). El slide "Pide un viaje"
// navega por React Router (Link -> /pedir-viaje), NUNCA a una URL externa
// hardcodeada.
const SLIDES = [
  {
    id: 'viaje',
    to: '/pedir-viaje', // ruta interna existente (useCreateViaje)
    variante: 'viaje',
    eyebrow: '🚕 Mototaxi y taxi',
    titulo: 'Pide un viaje',
    texto: 'Llega rápido a donde necesites en Punto Fijo. Paga en efectivo, pago móvil o Zelle.',
    cta: 'Pedir ahora',
  },
  {
    id: 'delivery',
    variante: 'delivery',
    eyebrow: '🛵 Delivery',
    titulo: 'Todo, a tu puerta',
    texto: 'Farmacia, comida, mercado y más de las tiendas locales que ya conoces.',
    cta: 'Ver tiendas',
    anchor: '#home-tiendas',
  },
  {
    id: 'pago',
    variante: 'pago',
    eyebrow: '💳 Sin complicaciones',
    titulo: 'Paga como quieras',
    texto: 'Efectivo, pago móvil o Zelle, directo con el conductor. Sin tarjetas, sin líos.',
  },
]

export default function HeroCarousel() {
  const trackRef = useRef(null)
  const [activo, setActivo] = useState(0)
  const pausaRef = useRef(false)

  // Calcula el slide activo según la posición de scroll (para los puntos).
  const onScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const indice = Math.round(track.scrollLeft / track.clientWidth)
    setActivo((prev) => (prev === indice ? prev : indice))
  }, [])

  const irA = useCallback((indice) => {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: indice * track.clientWidth, behavior: 'smooth' })
  }, [])

  // Auto-avance cada 5s. Se pausa al interactuar (pausaRef) y cuando la
  // pestaña no está visible. Respeta prefers-reduced-motion (no auto-avanza).
  useEffect(() => {
    const prefiereQuieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefiereQuieto) return

    const intervalo = setInterval(() => {
      if (pausaRef.current || document.hidden) return
      const track = trackRef.current
      if (!track) return
      const total = SLIDES.length
      const indice = Math.round(track.scrollLeft / track.clientWidth)
      const siguiente = (indice + 1) % total
      track.scrollTo({ left: siguiente * track.clientWidth, behavior: 'smooth' })
    }, 5000)

    return () => clearInterval(intervalo)
  }, [])

  const pausar = () => {
    pausaRef.current = true
  }
  const reanudar = () => {
    pausaRef.current = false
  }

  return (
    <section className="hero-carousel" aria-label="Promociones" aria-roledescription="carrusel">
      <div
        className="hero-carousel__track"
        ref={trackRef}
        onScroll={onScroll}
        onPointerDown={pausar}
        onPointerUp={reanudar}
        onMouseEnter={pausar}
        onMouseLeave={reanudar}
        onTouchStart={pausar}
        onTouchEnd={reanudar}
      >
        {SLIDES.map((slide) => (
          <SlideContenido key={slide.id} slide={slide} />
        ))}
      </div>

      <div className="hero-carousel__dots" role="tablist" aria-label="Seleccionar promoción">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={activo === i}
            aria-label={`Ir a la promoción ${i + 1}: ${slide.titulo}`}
            className={`hero-carousel__dot${activo === i ? ' hero-carousel__dot--activo' : ''}`}
            onClick={() => irA(i)}
          />
        ))}
      </div>
    </section>
  )
}

// Un slide: si tiene `to` es un Link de router (navegación interna); si tiene
// `anchor` es un enlace a una sección de la misma página; si no, es decorativo.
function SlideContenido({ slide }) {
  const contenido = (
    <>
      <span className="hero-slide__eyebrow">{slide.eyebrow}</span>
      <h2 className="hero-slide__titulo">{slide.titulo}</h2>
      <p className="hero-slide__texto">{slide.texto}</p>
      {slide.cta && (
        <span className="hero-slide__cta">
          {slide.cta}
          <span aria-hidden="true"> →</span>
        </span>
      )}
    </>
  )

  const clase = `hero-slide hero-slide--${slide.variante}`

  if (slide.to) {
    return (
      <Link to={slide.to} className={clase}>
        {contenido}
      </Link>
    )
  }
  if (slide.anchor) {
    return (
      <a href={slide.anchor} className={clase}>
        {contenido}
      </a>
    )
  }
  return <div className={clase}>{contenido}</div>
}
