import { createFileRoute } from '@tanstack/react-router'

import { auth } from '@/lib/auth.server'

export const Route = createFileRoute('/.well-known/$')({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
    },
  },
})
