import { register } from './registration.mjs'

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
}

const securityHeaders = {
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self' https://*.chatgpt.com https://*.openai.com",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

export function createApp(getAsset) {
  return {
    async fetch(request, env) {
      const { pathname } = new URL(request.url)
      if (pathname === '/api/register') return register(request, env)
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
      }

      const path = pathname === '/' ? '/index.html' : pathname
      const contentType = types[path.slice(path.lastIndexOf('.'))]
      const asset = contentType ? await getAsset(path) : null
      if (asset === null) {
        return new Response('Sahifa topilmadi.', { status: 404, headers: securityHeaders })
      }
      return new Response(request.method === 'HEAD' ? null : asset, {
        headers: {
          ...securityHeaders,
          'Content-Type': contentType,
          'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=86400' : 'no-cache',
        },
      })
    },
  }
}
