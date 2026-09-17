import assert from 'node:assert/strict'
import { build, preview } from 'vite'
import { verifyDist } from './verify-dist.mjs'

const originalBase = process.env.VITE_BASE_PATH
try {
  for (const [base, outDir] of [['/', 'dist'], ['/Reverse-Ladders/', '.release-check/repository']]) {
    process.env.VITE_BASE_PATH = base
    await build({ build: { outDir } })
    const paths = await verifyDist(outDir, base)
    const server = await preview({ build: { outDir }, preview: { host: '127.0.0.1', port: 0, open: false } })
    try {
      const address = server.httpServer.address()
      assert.ok(address && typeof address === 'object')
      const origin = `http://127.0.0.1:${address.port}`
      for (const path of [base, `${base}#/workout`, `${base}#/exercises/example/history`, ...paths]) {
        const response = await fetch(`${origin}${path}`)
        assert.equal(response.status, 200, path)
        if (path.endsWith('.js')) assert.match(response.headers.get('content-type') || '', /javascript/)
        await response.arrayBuffer()
      }
      console.log(`PASS ${base}: local assets, PWA metadata, offline precache, safe updates, and HTTP paths`)
    } finally {
      server.httpServer.closeAllConnections()
      await new Promise((resolve, reject) => server.httpServer.close((error) => error ? reject(error) : resolve()))
    }
  }
} finally {
  if (originalBase === undefined) delete process.env.VITE_BASE_PATH
  else process.env.VITE_BASE_PATH = originalBase
}
console.log('Artifact/HTTP checks passed. Browser rendering, offline reload, and device installation require manual checks.')
