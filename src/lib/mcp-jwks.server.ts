import {
  createMcpProtectedRequestHandler,
  type McpProtectedRequestHandlerOptions,
} from '@better-auth/mcp'

type JsonWebKeySet = { keys: Array<Record<string, unknown>> }
type JwksLoader = () => Promise<JsonWebKeySet | undefined>
type ProtectedHandler = Parameters<typeof createMcpProtectedRequestHandler>[1]
type ProtectedRequestHandler = ReturnType<typeof createMcpProtectedRequestHandler>
type RuntimeOptions = Omit<McpProtectedRequestHandlerOptions, 'jwksUrl'> & {
  jwksUrl?: string | JwksLoader
}
type RuntimeFactory = (
  options: RuntimeOptions,
  handler: ProtectedHandler,
) => ProtectedRequestHandler

// Better Auth's OAuth verifier supports a JWKS loader, but @better-auth/mcp 1.7.4
// narrows the forwarded option to string. Keep that compatibility boundary here.
const runtimeFactory = createMcpProtectedRequestHandler as unknown as RuntimeFactory

export async function loadJwksFromAuthHandler(
  authHandler: (request: Request) => Promise<Response>,
  jwksUrl: string,
) {
  const response = await authHandler(
    new Request(jwksUrl, { headers: { accept: 'application/json' } }),
  )
  if (!response.ok) return undefined

  const body: unknown = await response.json()
  if (
    !body ||
    typeof body !== 'object' ||
    !Array.isArray((body as { keys?: unknown }).keys)
  ) {
    return undefined
  }

  return body as JsonWebKeySet
}

export function createMcpProtectedHandlerWithJwksLoader(
  options: Omit<McpProtectedRequestHandlerOptions, 'jwksUrl'> & {
    jwksLoader: JwksLoader
  },
  handler: ProtectedHandler,
  factory: RuntimeFactory = runtimeFactory,
) {
  const { jwksLoader, ...protectedHandlerOptions } = options
  return factory({ ...protectedHandlerOptions, jwksUrl: jwksLoader }, handler)
}
