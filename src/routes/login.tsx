import { Fingerprint, KeyRound, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'

import { Button } from '@/components/ui/button'
import { startPasskeyRegistration, getSession } from '@/lib/auth-functions'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (await getSession()) throw redirect({ to: '/' })
  },
  component: Login,
})

function errorMessage(error: { message?: string } | null) {
  return error?.message || 'Something went wrong. Please try again.'
}

function Login() {
  const createRegistration = useServerFn(startPasskeyRegistration)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState<'signin' | 'register' | null>(null)

  const signIn = async () => {
    setError('')
    setPending('signin')

    try {
      const result = await authClient.signIn.passkey()
      if (result.error) {
        setError(errorMessage(result.error))
        return
      }

      window.location.replace('/')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Passkey sign-in failed')
    } finally {
      setPending(null)
    }
  }

  const register = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setPending('register')

    try {
      const context = await createRegistration({ data: { name } })
      const result = await authClient.passkey.addPasskey({
        context,
        createSession: true,
        name: 'Primary passkey',
      })

      if (result.error) {
        setError(errorMessage(result.error))
        return
      }

      window.location.replace('/')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Passkey creation failed')
    } finally {
      setPending(null)
    }
  }

  const unsupported =
    typeof window !== 'undefined' && !('PublicKeyCredential' in window)

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border/70 bg-card/75 p-6 shadow-[0_24px_70px_-42px_oklch(0.29_0.018_60/0.55)] backdrop-blur-sm sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Fingerprint className="size-6" aria-hidden="true" />
          </span>
          <div>
            <p className="font-hand text-2xl leading-none">Today</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              A simple list
            </p>
          </div>
        </div>

        <h1 className="font-hand text-4xl leading-tight text-foreground">
          Welcome back
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Use your device, fingerprint, face, or security key. No password needed.
        </p>

        <Button
          type="button"
          size="lg"
          className="mt-6 h-11 w-full text-sm"
          onClick={signIn}
          disabled={pending !== null || unsupported}
        >
          <KeyRound data-icon="inline-start" />
          {pending === 'signin' ? 'Waiting for your passkey…' : 'Sign in with a passkey'}
        </Button>

        <div className="my-7 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-border/70" />
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground">
            First time here?
          </span>
          <span className="h-px flex-1 bg-border/70" />
        </div>

        <form onSubmit={register}>
          <label htmlFor="name" className="text-sm font-medium">
            Your name
          </label>
          <input
            id="name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            maxLength={80}
            placeholder="What should we call you?"
            disabled={pending !== null}
            className="mt-2 h-11 w-full rounded-lg border border-input bg-background/65 px-3 text-sm outline-none transition-shadow placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/20 disabled:opacity-50"
          />
          <Button
            type="submit"
            variant="outline"
            size="lg"
            className="mt-3 h-11 w-full bg-background/45"
            disabled={pending !== null || unsupported || !name.trim()}
          >
            <Fingerprint data-icon="inline-start" />
            {pending === 'register' ? 'Creating your passkey…' : 'Create a passkey'}
          </Button>
        </form>

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

        <p className="mt-7 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Your passkey stays with your device or password manager. Today never receives
          a password.
        </p>
      </section>
    </main>
  )
}
