import { getRequestHeaders } from '@tanstack/react-start/server'

import { createAuth } from '@/lib/auth.server'

export async function readSession() {
  return createAuth().api.getSession({ headers: getRequestHeaders() })
}

export async function requireSession() {
  const session = await readSession()

  if (!session) throw new Error('Unauthorized')

  return session
}
