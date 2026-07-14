import { IconCash, IconPhone, IconTransfer } from '../icons/Icons'
import './Footer.css'

// Footer navy con columnas placeholder (contenido real más adelante) y los
// indicadores de pago REALES de Medaner: Efectivo, Pago móvil, Zelle. No se
// muestran logos de tarjetas (Visa/Mastercard): no hay procesador de tarjetas
// (Stripe no opera en Venezuela); el pago es directo cliente-conductor.
//
// Los ítems de las columnas son placeholders (spans con estilo de enlace, no
// navegables) para no crear rutas falsas; se cablearán cuando exista contenido.
const COLUMNAS = [
  {
    id: 'home-soporte', // ancla a la que enlazan el banner y el botón flotante
    titulo: 'Soporte',
    items: ['Centro de ayuda', 'Cómo pedir', 'Contacto', 'Preguntas frecuentes'],
  },
  {
    titulo: 'Categorías',
    items: ['Farmacia', 'Comida', 'Mercado', 'Bebidas'],
  },
  {
    titulo: 'Legal',
    items: ['Términos y condiciones', 'Privacidad', 'Cookies'],
  },
]

// IconTransfer para "Zelle" es genérico a propósito, NO el logo de Zelle
// (marca de terceros) — el texto "Zelle" ya identifica el método.
const PAGOS = [
  { Icono: IconCash, label: 'Efectivo' },
  { Icono: IconPhone, label: 'Pago móvil' },
  { Icono: IconTransfer, label: 'Zelle' },
]

export default function Footer() {
  const año = new Date().getFullYear()

  return (
    <footer className="home-footer">
      <div className="home-footer__inner">
        <div className="home-footer__brand">
          {/* Mismo criterio que el header: el logotipo es el PNG de marca, con
              el wordmark de texto al lado para que la marca se lea. */}
          <span className="home-footer__logo">
            <img src="/logoprototipo.png" alt="Medaner" className="home-footer__logo-img" />
            Medaner<span className="home-footer__logo-dot">.</span>
          </span>
          <p className="home-footer__tagline">
            Delivery y viajes en Punto Fijo, estado Falcón.
          </p>
        </div>

        <nav className="home-footer__cols" aria-label="Enlaces del pie de página">
          {COLUMNAS.map((col) => (
            <div className="home-footer__col" key={col.titulo} id={col.id}>
              <h3 className="home-footer__col-titulo">{col.titulo}</h3>
              <ul className="home-footer__col-list">
                {col.items.map((item) => (
                  <li key={item}>
                    {/* Placeholder: aún sin destino real */}
                    <span className="home-footer__link">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="home-footer__pagos">
        <span className="home-footer__pagos-label">Formas de pago:</span>
        <ul className="home-footer__pagos-list">
          {PAGOS.map((pago) => (
            <li className="home-footer__pago" key={pago.label}>
              <pago.Icono size={16} aria-hidden="true" />
              {pago.label}
            </li>
          ))}
        </ul>
      </div>

      <p className="home-footer__copy">© {año} Medaner · Punto Fijo, Venezuela</p>

      {/* Botón flotante de soporte (esquina inferior derecha). Enlaza a la
          sección Soporte del footer; se conectará a un chat/WhatsApp real
          cuando exista. */}
      <a
        href="#home-soporte"
        className="home-soporte-fab"
        aria-label="Ir a soporte"
      >
        <span aria-hidden="true">💬</span>
        <span className="home-soporte-fab__texto">Soporte</span>
      </a>
    </footer>
  )
}
