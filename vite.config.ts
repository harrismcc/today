import { execFileSync } from 'node:child_process'

import tailwindcss from '@tailwindcss/vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { generateSW, getManifest } from 'workbox-build'

const gitSha =
  process.env.WORKERS_CI_COMMIT_SHA ??
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()

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
          'offline.html',
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
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkOnly',
            options: {
              precacheFallback: { fallbackURL: '/offline.html' },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
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
  optimizeDeps: {
    include: [
      '@tanstack/react-router',
      '@tanstack/react-router > @tanstack/router-core',
      'better-auth > nanostores',
    ],
  },
  define: {
    'import.meta.env.GIT_SHA': JSON.stringify(gitSha),
  },
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
