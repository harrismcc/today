import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { env } from 'cloudflare:workers'

const registrationLifetimeMs = 5 * 60 * 1000
const developmentSecret = 'task-tracker-development-secret-change-me'

type RegistrationContext = {
  expiresAt: number
  id: string
  name: string
}

export function authSecret() {
  const secret = env.BETTER_AUTH_SECRET

  if (secret) return secret
  if (import.meta.env.PROD) {
    throw new Error('BETTER_AUTH_SECRET must be set in production')
  }

  return developmentSecret
}

function signatureFor(payload: string) {
  return createHmac('sha256', authSecret()).update(payload).digest('base64url')
}

export function createRegistrationContext(name: string) {
  const registration: RegistrationContext = {
    expiresAt: Date.now() + registrationLifetimeMs,
    id: randomUUID(),
    name,
  }
  const payload = Buffer.from(JSON.stringify(registration)).toString('base64url')

  return `${payload}.${signatureFor(payload)}`
}

export function parseRegistrationContext(token: string | null | undefined) {
  if (!token) throw new Error('Registration expired. Please try again.')

  const [payload, signature] = token.split('.')
  if (!payload || !signature) throw new Error('Invalid registration')

  const expected = signatureFor(payload)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error('Invalid registration')
  }

  const registration = JSON.parse(
    Buffer.from(payload, 'base64url').toString('utf8'),
  ) as Partial<RegistrationContext>

  if (
    typeof registration.id !== 'string' ||
    typeof registration.name !== 'string' ||
    typeof registration.expiresAt !== 'number' ||
    registration.expiresAt < Date.now()
  ) {
    throw new Error('Registration expired. Please try again.')
  }

  return registration as RegistrationContext
}
