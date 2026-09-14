import { createFileRoute } from '@tanstack/react-router'

const methodNotAllowed = () =>
  new Response(null, { status: 405, headers: { Allow: 'GET' } })

export const Route = createFileRoute('/__version')({
  server: {
    handlers: {
      GET: () =>
        new Response(`${import.meta.env.GIT_SHA}\n`, {
          headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'text/plain; charset=utf-8',
          },
        }),
      POST: methodNotAllowed,
      PUT: methodNotAllowed,
      PATCH: methodNotAllowed,
      DELETE: methodNotAllowed,
    },
  },
})
