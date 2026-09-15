import { useState, type FormEvent } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { play } from '@foleyjs/react'

import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { getSession } from '@/lib/auth-functions'
import {
  oauthAuthorizationFromSearch,
  validateOAuthContinuationSearch,
  withOAuthAuthorization,
} from '@/lib/oauth-continuation'

export const Route = createFileRoute('/signup')({
  validateSearch: validateOAuthContinuationSearch,
  beforeLoad: async ({ search }) => {
    if (!(await getSession())) return

    const oauth = oauthAuthorizationFromSearch(search)
    if (oauth) {
      throw redirect({ href: oauth })
    }

    throw redirect({ to: '/' })
  },
  component: Signup,
})

function errorMessage(error: { message?: string } | null) {
  return error?.message || 'Something went wrong. Please try again.'
}

function Signup() {
  const oauth = oauthAuthorizationFromSearch(Route.useSearch())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)

  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (password !== confirmation) {
      play('error')
      setError('Passwords do not match.')
      return
    }

    setPending(true)

    try {
      const result = await authClient.signUp.email({
        email,
        name: 'Today user',
        password,
        callbackURL: oauth ?? '/',
      })

      if (result.error) {
        play('error')
        setError(errorMessage(result.error))
        return
      }

      play('success')
      setNotice('Check your email to verify your account, then you’ll be signed in.')
      setPassword('')
      setConfirmation('')
    } catch (cause) {
      play('error')
      setError(cause instanceof Error ? cause.message : 'Unable to create your account')
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthShell title="Create your account">
      <form className="mt-6 space-y-4" onSubmit={register}>
        <label className="block text-sm font-medium" htmlFor="email">
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

        <label className="block text-sm font-medium" htmlFor="password">
          Password
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            className="mt-1.5 h-11"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending}
            minLength={15}
            maxLength={128}
            aria-describedby="password-requirements"
            required
          />
          <span
            id="password-requirements"
            className="mt-1.5 block text-xs font-normal text-muted-foreground"
          >
            Use at least 15 characters.
          </span>
        </label>

        <label className="block text-sm font-medium" htmlFor="confirmation">
          Confirm password
          <Input
            id="confirmation"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            className="mt-1.5 h-11"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            disabled={pending}
            minLength={15}
            maxLength={128}
            required
          />
        </label>

        <Button
          type="submit"
          size="lg"
          className="h-11 w-full text-sm"
          disabled={pending}
          sound={false}
        >
          {pending ? 'Creating account…' : 'Create account'}
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

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <a
          href={withOAuthAuthorization('/login', oauth)}
          data-foley-click="swoosh"
          className="font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
        >
          Sign in
        </a>
      </p>
    </AuthShell>
  )
}
