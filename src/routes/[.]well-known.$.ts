import { createFileRoute } from '@tanstack/react-router'

import { createAuth } from '@/lib/auth.server'

export const Route = createFileRoute('/.well-known/$')({
  server: {
    handlers: {
      GET: ({ request }) => createAuth().handler(request),
    },
  },
})
