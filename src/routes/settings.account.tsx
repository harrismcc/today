import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { play } from '@foleyjs/react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/settings/account')({
  component: AccountSettings,
})

function errorMessage(error: { message?: string } | null) {
  return error?.message || 'Unable to change your password. Please try again.'
}

function AccountSettings() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setNotice('')

    if (newPassword !== confirmation) {
      play('error')
      setError('Passwords do not match.')
      return
    }

    setPending(true)
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      })

      if (result.error) {
        play('error')
        setError(errorMessage(result.error))
        return
      }

      play('success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmation('')
      setNotice('Your password has been updated.')
    } catch (cause) {
      play('error')
      setError(cause instanceof Error ? cause.message : 'Unable to change your password')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-medium">Account settings</h2>

      <div className="mt-8 max-w-sm">
        <h3 className="font-medium">Password</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Updating your password signs you out on other devices.
        </p>
        <form className="mt-4 space-y-4" onSubmit={changePassword}>
          <label className="block text-sm font-medium" htmlFor="current-password">
            Current password
            <Input
              id="current-password"
              name="current-password"
              type="password"
              autoComplete="current-password"
              className="mt-1.5 h-11"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={pending}
              required
            />
          </label>

          <label className="block text-sm font-medium" htmlFor="new-password">
            New password
            <Input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              className="mt-1.5 h-11"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
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

          <label className="block text-sm font-medium" htmlFor="password-confirmation">
            Confirm new password
            <Input
              id="password-confirmation"
              name="password-confirmation"
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

          <Button type="submit" size="lg" disabled={pending} sound={false}>
            {pending ? 'Updating password…' : 'Update password'}
          </Button>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-done">
              {notice}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
