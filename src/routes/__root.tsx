import {
  HeadContent,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { useEffect, type ReactNode } from 'react'

import appCss from '@/styles/app.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      { title: 'Today — a simple list' },
      {
        name: 'description',
        content: 'A calm, paper-like list for the things you want to do today.',
      },
      { name: 'generator', content: 'v0.app' },
      { name: 'color-scheme', content: 'light' },
      { name: 'theme-color', content: '#f4f0e6' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-title', content: 'Today' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      {
        rel: 'icon',
        href: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        rel: 'icon',
        href: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      { rel: 'icon', href: '/icon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-icon.png' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <PwaRegistration />
        <Scripts />
      </body>
    </html>
  )
}

function PwaRegistration() {
  useEffect(() => {
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('Service worker registration failed', error)
      })
    }
  }, [])

  return null
}
