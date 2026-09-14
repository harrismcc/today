import { useEffect, useState, type FormEvent } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { play } from '@foleyjs/react'

import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getSession } from '@/lib/auth-functions'
import { authClient } from '@/lib/auth-client'
import {
  getOAuthAuthorizationPath,
  isOAuthContinuation,
  oauthAuthorizationFromSearch,
  withOAuthAuthorization,
} from '@/lib/oauth-continuation'

export const Route = createFileRoute('/login')({
  beforeLoad: async ({ location }) => {
    if (isOAuthContinuation(location.search)) return

    const session = await getSession()
    if (!session) return

    const continuation = getOAuthAuthorizationPath(
      (location.search as Record<string, unknown>).oauth,
    )
    if (continuation) {
      throw redirect({ href: continuation })
    }

    throw redirect({ to: '/' })
  },
  component: Login,
})

function errorMessage(error: { message?: string } | null) {
  return error?.message || 'Something went wrong. Please try again.'
}

function Login() {
  const [oauthAuthorization, setOAuthAuthorization] = useState('')
  const [mode, setMode] = useState<'sign-in' | 'forgot'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    const search = new URLSearchParams(window.location.search)
    setOAuthAuthorization(oauthAuthorizationFromSearch(window.location.search) ?? '')
    if (search.get('forgot') === 'true') setMode('forgot')
  }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setPending(true)

    try {
      const continuation = oauthAuthorizationFromSearch(window.location.search)

      if (mode === 'forgot') {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: withOAuthAuthorization('/reset-password', continuation),
        })

        if (result.error) {
          play('error')
          setError(errorMessage(result.error))
          return
        }

        play('success')
        setNotice('If an account exists for that email, a reset link is on its way.')
        return
      }

      const result = await authClient.signIn.email({
        email,
        password,
        ...(continuation && {
          callbackURL: continuation,
        }),
      })
      if (result.error) {
        if (result.error.status === 403) {
          play('success')
          setNotice('Check your email for a verification link, then sign in again.')
          return
        }

        play('error')
        setError(errorMessage(result.error))
        return
      }

      play('success')
      window.location.replace(continuation ?? '/')
    } catch (cause) {
      play('error')
      setError(cause instanceof Error ? cause.message : 'Unable to continue')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell title={mode === 'sign-in' ? 'Welcome back' : 'Reset your password'}>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block space-y-1.5 text-sm font-medium" htmlFor="email">
          Email
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="mt-1.5 h-11"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
            required
          />
        </label>

        {mode === 'sign-in' && (
          <label className="block space-y-1.5 text-sm font-medium" htmlFor="password">
            Password
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-1.5 h-11"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={pending}
              minLength={8}
              maxLength={128}
              required
            />
          </label>
        )}

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full text-sm"
          disabled={pending}
          sound={false}
        >
          {pending
            ? mode === 'sign-in'
              ? 'Signing in…'
              : 'Sending…'
            : mode === 'sign-in'
              ? 'Sign in'
              : 'Email reset link'}
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 text-sm text-done">
          {notice}
        </p>
      )}

      <div className="mt-5 space-y-2 text-center text-sm text-muted-foreground">
        <button
          type="button"
          data-foley-click="swoosh"
          className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
          onClick={() => {
            setMode(mode === 'sign-in' ? 'forgot' : 'sign-in')
            setError('')
            setNotice('')
          }}
        >
          {mode === 'sign-in' ? 'Forgot your password?' : 'Back to sign in'}
        </button>

        {mode === 'sign-in' && (
          <p>
            First time here?{' '}
            <a
              href={withOAuthAuthorization('/signup', oauthAuthorization)}
              data-foley-click="swoosh"
              className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
            >
              Create an account
            </a>
          </p>
        )}
      </div>
    </AuthShell>
  )
}
