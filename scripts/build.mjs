import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'

const output = new URL('../dist/server/', import.meta.url)
const publicDirectory = new URL('../public/', import.meta.url)
const assets = {}

for (const entry of await readdir(publicDirectory, { withFileTypes: true, recursive: true })) {
  if (!entry.isFile()) continue
  const file = new URL(entry.name, `file://${entry.parentPath}/`)
  const path = file.pathname.slice(publicDirectory.pathname.length)
  assets['/' + path] = (await readFile(file)).toString('base64')
}

await mkdir(output, { recursive: true })
for (const name of ['app.mjs', 'registration.mjs']) {
  await writeFile(new URL(name, output), await readFile(new URL(`../server/${name}`, import.meta.url)))
}
await writeFile(new URL('index.js', output), `import { createApp } from './app.mjs'
const assets = ${JSON.stringify(assets)}
export default createApp((path) => Object.hasOwn(assets, path)
  ? Uint8Array.from(atob(assets[path]), (character) => character.charCodeAt(0))
  : null)
`)
console.log(`Worker built with ${Object.keys(assets).length} assets.`)
