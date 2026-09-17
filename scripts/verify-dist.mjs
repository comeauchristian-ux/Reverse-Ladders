import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'

/** Validate built artifacts; this does not emulate browser cache/installation behavior. */
export async function verifyDist(directory, base) {
  const read = (file) => readFile(resolve(directory, file), 'utf8')
  const manifest = JSON.parse(await read('manifest.webmanifest'))
  for (const field of ['id', 'scope', 'start_url']) assert.equal(manifest[field], base, `Manifest ${field}`)
  assert.equal(manifest.display, 'standalone')
  assert.ok(manifest.theme_color && manifest.background_color)
  for (const icon of manifest.icons) {
    const bytes = await readFile(resolve(directory, icon.src))
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG')
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes)
  }
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'))
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512' && icon.purpose.includes('maskable')))
  const html = await read('index.html')
  assert.ok(html.includes('viewport-fit=cover'))
  assert.ok(html.includes(`${base}apple-touch-icon.png`))
  const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1])
  for (const url of urls) {
    assert.ok(url.startsWith(base), `Unexpected asset path: ${url}`)
    await readFile(resolve(directory, url.slice(base.length)))
  }
  const registration = await read('registerSW.js')
  assert.ok(registration.includes(`register('${base}sw.js', { scope: '${base}' })`))

  let entries = []
  let fallback
  let activated = false
  const workerModules = []
  const worker = {
    precacheAndRoute: (list) => { entries = list },
    cleanupOutdatedCaches() {},
    createHandlerBoundToURL: (url) => { fallback = url; return () => {} },
    NavigationRoute: class { constructor(handler) { this.handler = handler } },
    registerRoute() {},
  }
  // Observe generated Workbox configuration without registering a service worker.
  runInNewContext(await read('sw.js'), {
    self: { define: true, addEventListener() {}, skipWaiting() { activated = true } },
    define: (dependencies, factory) => { workerModules.push(...dependencies); factory(worker) },
  }, { timeout: 1000 })
  assert.equal(activated, false, 'Updates must not force activation')
  assert.equal(fallback, 'index.html')
  const cached = new Set(entries.map((entry) => entry.url))
  const required = ['index.html', 'registerSW.js', 'manifest.webmanifest', 'favicon.svg', 'apple-touch-icon.png', ...manifest.icons.map((icon) => icon.src)]
  for (const asset of await readdir(resolve(directory, 'assets'))) required.push(`assets/${asset}`)
  for (const file of required) assert.ok(cached.has(file), `Missing from offline precache: ${file}`)
  for (const entry of entries) {
    assert.ok(!entry.url.startsWith('/') && !entry.url.includes('..') && !entry.url.includes('://'))
    await readFile(resolve(directory, entry.url))
  }
  for (const module of workerModules) {
    assert.ok(module.startsWith('./workbox-'))
    await readFile(resolve(directory, `${module}.js`))
  }
  return [...new Set([...urls, `${base}sw.js`, ...required.map((file) => `${base}${file}`)])]
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const directory = process.argv[2] || 'dist'
  const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.webmanifest'), 'utf8'))
  await verifyDist(directory, process.argv[3] || manifest.scope)
  console.log(`Verified PWA artifacts in ${directory} for ${manifest.scope}`)
}
