import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

type ConsentSearch = {
  client_id?: string
  scope?: string
}

export const Route = createFileRoute('/consent')({
  validateSearch: (search: Record<string, unknown>): ConsentSearch => ({
    client_id: typeof search.client_id === 'string' ? search.client_id : undefined,
    scope: typeof search.scope === 'string' ? search.scope : undefined,
  }),
  head: () => ({ meta: [{ title: 'Authorize access — Today' }] }),
  component: Consent,
})

function errorMessage(error: { message?: string } | null) {
  return error?.message || 'Unable to complete authorization. Please try again.'
}

function scopeDescription(scope: string) {
  if (scope === 'mcp:todos') return 'View, create, and update your todos'
  return scope
}

function Consent() {
  const { client_id: clientId, scope } = Route.useSearch()
  const [clientName, setClientName] = useState('this application')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!clientId) {
      setError('The authorization request is missing a client ID.')
      return
    }

    void authClient.oauth2
      .publicClient({ query: { client_id: clientId } })
      .then((result) => {
        if (result.error) {
          setError(errorMessage(result.error))
          return
        }
        if (result.data?.client_name) setClientName(result.data.client_name)
      })
  }, [clientId])

  const decide = async (accept: boolean) => {
    setError('')
    setPending(true)

    try {
      const result = await authClient.oauth2.consent({ accept })
      if (result.error) setError(errorMessage(result.error))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authorization failed')
    } finally {
      setPending(false)
    }
  }

  const scopes = scope?.split(' ').filter(Boolean) ?? []

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-sm rounded-2xl border border-border p-6 sm:p-8">
        <h1 className="font-hand text-3xl leading-tight text-foreground">
          Allow {clientName} to access Today?
        </h1>

        {scopes.length > 0 && (
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            {scopes.map((requestedScope) => (
              <li key={requestedScope}>{scopeDescription(requestedScope)}</li>
            ))}
          </ul>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="h-11"
            disabled={pending || !clientId}
            onClick={() => void decide(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="lg"
            className="h-11"
            disabled={pending || !clientId}
            onClick={() => void decide(true)}
          >
            {pending ? 'Authorizing…' : 'Allow'}
          </Button>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
    </main>
  )
}
