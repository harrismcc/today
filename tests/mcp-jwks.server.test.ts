import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createMcpProtectedHandlerWithJwksLoader,
  loadJwksFromAuthHandler,
} from '../src/lib/mcp-jwks.server.ts'

test('the MCP compatibility adapter passes a local JWKS loader to the runtime dependency', async () => {
  const jwks = { keys: [{ kty: 'OKP', kid: 'local-key' }] }
  const loader = async () => jwks
  let runtimeJwksSource: unknown

  createMcpProtectedHandlerWithJwksLoader(
    { issuer: 'https://today.test/api/auth', audience: 'https://today.test/mcp', jwksLoader: loader },
    async () => new Response(null, { status: 204 }),
    (options, handler) => {
      runtimeJwksSource = options.jwksUrl
      return (request) => handler(request, {})
    },
  )

  assert.equal(runtimeJwksSource, loader)
  assert.deepEqual(await (runtimeJwksSource as typeof loader)(), jwks)
})

test('the local JWKS loader uses the auth handler and rejects malformed key sets', async () => {
  let receivedRequest: Request | undefined
  const loaded = await loadJwksFromAuthHandler(async (request) => {
    receivedRequest = request
    return Response.json({ keys: [{ kid: 'one' }] })
  }, 'https://today.test/api/auth/jwks')

  assert.equal(receivedRequest?.url, 'https://today.test/api/auth/jwks')
  assert.equal(receivedRequest?.headers.get('accept'), 'application/json')
  assert.deepEqual(loaded, { keys: [{ kid: 'one' }] })

  const malformed = await loadJwksFromAuthHandler(
    async () => Response.json({ notKeys: [] }),
    'https://today.test/api/auth/jwks',
  )
  assert.equal(malformed, undefined)
})
