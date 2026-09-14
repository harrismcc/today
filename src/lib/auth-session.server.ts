import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@/lib/auth.server'

export async function readSession() {
  return auth.api.getSession({ headers: getRequestHeaders() })
}

export async function requireSession() {
  const session = await readSession()

  if (!session) throw new Error('Unauthorized')

  return session
}
