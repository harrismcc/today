import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { generateSW, getManifest } from 'workbox-build'

function pwaServiceWorker(): Plugin {
  return {
    name: 'pwa-service-worker',
    applyToEnvironment: (environment) => environment.name === 'ssr',
    async buildStart() {
      const staticAssets = await getManifest({
        globDirectory: 'public',
        globPatterns: [
          'fonts/**/*.woff2',
          'apple-icon.png',
          'icon*.{png,svg}',
          'logo.png',
          'pwa-*.png',
          'manifest.webmanifest',
        ],
      })

      const { count, size, warnings } = await generateSW({
        swDest: 'dist/client/sw.js',
        globDirectory: 'dist/client',
        globPatterns: ['assets/**/*.{js,css,woff2}'],
        additionalManifestEntries: staticAssets.manifestEntries,
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
        sourcemap: false,
      })

      const allWarnings = [...staticAssets.warnings, ...warnings]
      if (allWarnings.length > 0) {
        throw new Error(`Service worker warnings:\n${allWarnings.join('\n')}`)
      }

      if (count === 0) {
        throw new Error('Service worker precache is empty')
      }

      console.log(`Generated service worker with ${count} files (${size} bytes)`)
    },
  }
}

export default defineConfig({
  server: {
    allowedHosts: process.env.AMP_ORB ? true : undefined,
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    viteReact(),
    pwaServiceWorker(),
  ],
})
