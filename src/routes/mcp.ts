import { createFileRoute } from '@tanstack/react-router'

import { handleMcpRequest } from '@/lib/mcp.server'

const methodNotAllowed = () =>
  new Response(null, { status: 405, headers: { Allow: 'POST' } })

export const Route = createFileRoute('/mcp')({
  server: {
    handlers: {
      GET: methodNotAllowed,
      POST: ({ request }) => handleMcpRequest(request),
      DELETE: methodNotAllowed,
    },
  },
})
