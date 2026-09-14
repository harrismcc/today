import { Fingerprint } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { play } from '@foleyjs/react'

import { PasskeyPromptStatus } from '@/components/passkey-prompt-status'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'
import { getSession, startPasskeyRegistration } from '@/lib/auth-functions'
import { isOAuthContinuation } from '@/lib/oauth-continuation'

export const Route = createFileRoute('/signup')({
  beforeLoad: async () => {
    if (await getSession()) throw redirect({ to: '/' })
  },
  component: Signup,
})

function errorMessage(error: { message?: string } | null) {
  return error?.message || 'Something went wrong. Please try again.'
}

function Signup() {
  const [oauthSearch, setOAuthSearch] = useState('')
  const createRegistration = useServerFn(startPasskeyRegistration)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [embedded, setEmbedded] = useState(false)

  useEffect(() => {
    setEmbedded(window.self !== window.top)
    if (isOAuthContinuation(window.location.search)) {
      setOAuthSearch(window.location.search)
    }
  }, [])

  const register = async () => {
    if (window.self !== window.top) {
      window.open(window.location.href, '_blank', 'noopener,noreferrer')
      return
    }

    setError('')
    setPending(true)

    try {
      const context = await createRegistration()
      const result = await authClient.passkey.addPasskey({
        context,
        createSession: true,
        name: 'Primary passkey',
      })

      if (result.error) {
        play('error')
        setError(errorMessage(result.error))
        return
      }

      if (!isOAuthContinuation(window.location.search)) window.location.replace('/')
    } catch (cause) {
      play('error')
      setError(cause instanceof Error ? cause.message : 'Passkey creation failed')
    } finally {
      setPending(false)
    }
  }

  const unsupported =
    typeof window !== 'undefined' && !('PublicKeyCredential' in window)

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md gap-0 overflow-visible rounded-2xl border border-border/70 bg-card/75 p-6 shadow-card ring-0 backdrop-blur-sm sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <img src="/logo.png" alt="" className="size-14 object-contain" />
          <div>
            <p className="font-hand text-2xl leading-none">Today</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              A simple list
            </p>
          </div>
        </div>

        <h1 className="font-hand text-4xl leading-tight text-foreground">
          Create your account
        </h1>

        <Button
          type="button"
          size="lg"
          className="mt-6 h-11 w-full text-sm"
          onClick={register}
          disabled={pending || unsupported}
        >
          <Fingerprint data-icon="inline-start" />
          {embedded
            ? 'Open a new tab to create a passkey'
            : pending
              ? 'Creating your passkey…'
              : 'Create a passkey'}
        </Button>
        <PasskeyPromptStatus
          action="create a passkey"
          embedded={embedded}
          pending={pending}
        />

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <a
            href={`/login${oauthSearch}`}
            data-foley-click="swoosh"
            onClick={(event) => {
              if (!isOAuthContinuation(window.location.search)) return
              event.preventDefault()
              window.location.assign(`/login${window.location.search}`)
            }}
            className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
          >
            Sign in
          </a>
        </p>

        {unsupported && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            This browser does not support passkeys. Try a current version of Chrome,
            Safari, Firefox, or Edge.
          </p>
        )}
        {error && !unsupported && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
      </Card>
    </main>
  )
}
