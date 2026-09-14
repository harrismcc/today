import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { play } from '@foleyjs/react'

import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import {
  getOAuthAuthorizationPath,
  withOAuthAuthorization,
} from '@/lib/oauth-continuation'

type ResetPasswordSearch = {
  error?: string
  oauth?: string
  token?: string
}

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => ({
    error: typeof search.error === 'string' ? search.error : undefined,
    oauth: getOAuthAuthorizationPath(search.oauth),
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  head: () => ({ meta: [{ title: 'Reset password — Today' }] }),
  component: ResetPassword,
})

function errorMessage(error: { message?: string } | null) {
  return error?.message || 'Unable to reset your password. Please request a new link.'
}

function ResetPassword() {
  const { error: tokenError, oauth, token } = Route.useSearch()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const [pending, setPending] = useState(false)

  const resetPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!token) {
      play('error')
      setError('This reset link is invalid or has expired.')
      return
    }

    if (password !== confirmation) {
      play('error')
      setError('Passwords do not match.')
      return
    }

    setPending(true)
    try {
      const result = await authClient.resetPassword({ newPassword: password, token })
      if (result.error) {
        play('error')
        setError(errorMessage(result.error))
        return
      }

      play('success')
      setComplete(true)
      setPassword('')
      setConfirmation('')
    } catch (cause) {
      play('error')
      setError(cause instanceof Error ? cause.message : 'Unable to reset your password')
    } finally {
      setPending(false)
    }
  }

  const invalid = tokenError === 'INVALID_TOKEN' || !token

  return (
    <AuthShell title={complete ? 'Password updated' : 'Choose a new password'}>
      {complete ? (
        <div className="mt-6">
          <p role="status" className="text-sm text-done">
            Your password has been reset. You can sign in now.
          </p>
          <Button
            render={<a href={oauth ?? '/login'} />}
            nativeButton={false}
            size="lg"
            className="mt-5 h-11 w-full text-sm"
          >
            {oauth ? 'Continue' : 'Sign in'}
          </Button>
        </div>
      ) : invalid ? (
        <div className="mt-6">
          <p role="alert" className="text-sm text-destructive">
            This reset link is invalid or has expired.
          </p>
          <Button
            render={
              <a href={withOAuthAuthorization('/login?forgot=true', oauth)} />
            }
            nativeButton={false}
            variant="outline"
            size="lg"
            className="mt-5 h-11 w-full text-sm"
          >
            Request a new link
          </Button>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={resetPassword}>
          <label className="block text-sm font-medium" htmlFor="password">
            New password
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
            {pending ? 'Updating password…' : 'Update password'}
          </Button>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      )}
    </AuthShell>
  )
}
