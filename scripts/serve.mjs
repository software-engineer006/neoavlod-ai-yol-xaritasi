import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from '../server/app.mjs'

const root = fileURLToPath(new URL('../public', import.meta.url))
const app = createApp(async (path) => {
  const file = resolve(root, `.${path}`)
  if (!file.startsWith(root + sep)) return null
  try {
    return await readFile(file)
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') return null
    throw error
  }
})

const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 4173)
const trustProxy = process.env.TRUST_PROXY === '1'
createServer(async (incoming, outgoing) => {
  try {
    const headers = new Headers(incoming.headers)
    const peer = incoming.socket.remoteAddress
    const proxy = trustProxy && (peer === '127.0.0.1' || peer === '::1')
    const scheme = proxy && headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http'
    const client = proxy ? headers.get('x-real-ip') || peer : peer
    headers.set('cf-connecting-ip', client || 'local')
    const init = { method: incoming.method, headers }
    if (incoming.method !== 'GET' && incoming.method !== 'HEAD') {
      init.body = Readable.toWeb(incoming)
      init.duplex = 'half'
    }
    const url = new URL(incoming.url, `${scheme}://${incoming.headers.host}`)
    const response = await app.fetch(new Request(url, init), process.env)
    outgoing.writeHead(response.status, Object.fromEntries(response.headers))
    if (response.body) Readable.fromWeb(response.body).pipe(outgoing)
    else outgoing.end()
  } catch {
    if (!outgoing.headersSent) outgoing.writeHead(500)
    outgoing.end('Server xatosi')
  }
}).listen(port, host, () => {
  console.log(`Local: http://${host}:${port}`)
})
