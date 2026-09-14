import { createFileRoute, redirect } from '@tanstack/react-router'

import { AuthShell } from '@/components/auth-shell'
import { Button } from '@/components/ui/button'
import {
  getOAuthAuthorizationPath,
  withOAuthAuthorization,
} from '@/lib/oauth-continuation'

type VerifyEmailSearch = {
  error?: string
  oauth?: string
}

export const Route = createFileRoute('/verify-email')({
  validateSearch: (search: Record<string, unknown>): VerifyEmailSearch => ({
    error: typeof search.error === 'string' ? search.error : undefined,
    oauth: getOAuthAuthorizationPath(search.oauth),
  }),
  beforeLoad: ({ search }) => {
    if (!search.error) throw redirect({ href: search.oauth ?? '/' })
  },
  head: () => ({ meta: [{ title: 'Verify email — Today' }] }),
  component: VerifyEmail,
})

function verificationErrorMessage(error: string) {
  if (error === 'TOKEN_EXPIRED') {
    return 'This verification link has expired. Sign in to request a new one.'
  }

  if (error === 'INVALID_TOKEN') {
    return 'This verification link is invalid. Sign in to request a new one.'
  }

  return 'We could not verify your email. Sign in to request a new link.'
}

function VerifyEmail() {
  const { error, oauth } = Route.useSearch()

  return (
    <AuthShell title="Email not verified">
      <div className="mt-6">
        <p role="alert" className="text-sm text-destructive">
          {verificationErrorMessage(error ?? '')}
        </p>
        <Button
          render={<a href={withOAuthAuthorization('/login', oauth)} />}
          nativeButton={false}
          size="lg"
          className="mt-5 h-11 w-full text-sm"
        >
          Back to sign in
        </Button>
      </div>
    </AuthShell>
  )
}
