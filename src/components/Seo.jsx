import { useEffect } from 'react'

// SEO liviano para SPA (Vite, sin SSR) SIN dependencias externas
// (react-helmet-async añadiría peso al bundle; acá basta con actualizar el
// <head> en runtime). Los crawlers modernos (Googlebot) ejecutan JS, así que
// estos tags se indexan; para el preview social inicial y crawlers que no
// corren JS, los valores por defecto viven en index.html.
//
// Uso: <Seo title="..." description="..." /> al inicio de cada página.
// Reutilizable en /conductor, /admin, /pedido/:id, etc. en próximas sesiones.

function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value))
}

export default function Seo({ title, description, canonicalPath }) {
  useEffect(() => {
    if (title) document.title = title

    if (description) {
      upsertMeta('meta[name="description"]', { name: 'description', content: description })
      upsertMeta('meta[property="og:description"]', {
        property: 'og:description',
        content: description,
      })
    }

    if (title) {
      upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title })
    }

    if (canonicalPath) {
      const url = `https://medaner.com${canonicalPath}`
      let link = document.head.querySelector('link[rel="canonical"]')
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', 'canonical')
        document.head.appendChild(link)
      }
      link.setAttribute('href', url)
      upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url })
    }
  }, [title, description, canonicalPath])

  return null
}
