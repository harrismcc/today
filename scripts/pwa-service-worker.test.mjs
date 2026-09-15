import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('../', import.meta.url)

const serviceWorker = await readFile(
  new URL('dist/client/sw.js', root),
  'utf8',
)
const offlinePage = await readFile(new URL('public/offline.html', root), 'utf8')

test('generated worker handles navigations online-first without caching documents', () => {
  const route = serviceWorker.slice(serviceWorker.indexOf('registerRoute('))

  assert.match(route, /"navigate"===\w+\.mode/)
  assert.match(route, /\.NetworkOnly\(/)
  assert.match(
    route,
    /\.PrecacheFallbackPlugin\(\{fallbackURL:"\/offline\.html"\}\)/,
  )
  assert.doesNotMatch(
    route,
    /NavigationRoute|CacheFirst|NetworkFirst|StaleWhileRevalidate/,
  )
})

test('generated worker precaches a static offline response without app data', () => {
  assert.match(serviceWorker, /\{url:"offline\.html",revision:"[a-f0-9]+"\}/)
  assert.doesNotMatch(offlinePage, /<script\b/i)
  assert.match(offlinePage, /<h1>You’re offline<\/h1>/)
  assert.match(offlinePage, /<a href="">Try again<\/a>/)
})

test('generated worker waits for an explicit update message, then claims clients', () => {
  assert.match(
    serviceWorker,
    /addEventListener\("message"[\s\S]*"SKIP_WAITING"[\s\S]*\.skipWaiting\(\)/,
  )
  assert.match(serviceWorker, /\.clientsClaim\(\)/)
  assert.equal(serviceWorker.match(/\.skipWaiting\(\)/g)?.length, 1)
})
