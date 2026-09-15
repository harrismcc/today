import {
  HeadContent,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { MotionConfig } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { SoundEffects } from '@/components/sound-effects'
import { Button } from '@/components/ui/button'
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
        <SoundEffects>
          <MotionConfig reducedMotion="user">
            {children}
            <PwaRegistration />
          </MotionConfig>
        </SoundEffects>
        <Scripts />
      </body>
    </html>
  )
}

function PwaRegistration() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [updating, setUpdating] = useState(false)
  const updateRequested = useRef(false)

  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

    let registration: ServiceWorkerRegistration | undefined
    let cancelled = false

    const handleControllerChange = () => {
      if (!updateRequested.current) return

      updateRequested.current = false
      window.location.reload()
    }

    const handleUpdateFound = () => {
      const installingWorker = registration?.installing
      if (!installingWorker) return

      const handleStateChange = () => {
        if (
          !cancelled &&
          installingWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          setWaitingWorker(installingWorker)
        }

        if (
          installingWorker.state === 'installed' ||
          installingWorker.state === 'redundant'
        ) {
          installingWorker.removeEventListener('statechange', handleStateChange)
        }
      }

      installingWorker.addEventListener('statechange', handleStateChange)
      handleStateChange()
    }

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange,
    )

    void navigator.serviceWorker
      .register('/sw.js')
      .then((registeredWorker) => {
        if (cancelled) return

        registration = registeredWorker
        registration.addEventListener('updatefound', handleUpdateFound)
        handleUpdateFound()

        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting)
        }
      })
      .catch((error) => {
        console.error('Service worker registration failed', error)
      })

    return () => {
      cancelled = true
      registration?.removeEventListener('updatefound', handleUpdateFound)
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange,
      )
    }
  }, [])

  if (!waitingWorker) return null

  const applyUpdate = () => {
    updateRequested.current = true
    setUpdating(true)
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md animate-in items-center justify-between gap-4 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-card fade-in slide-in-from-bottom-1 duration-150 motion-reduce:animate-none"
    >
      <p role="status" aria-live="polite" className="text-sm">
        A new version is ready.
      </p>
      <Button type="button" onClick={applyUpdate} disabled={updating}>
        {updating ? 'Updating…' : 'Update'}
      </Button>
    </div>
  )
}
