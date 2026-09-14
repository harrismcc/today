import { createServerFn } from '@tanstack/react-start'

function validateName(input: unknown) {
  if (!input || typeof input !== 'object') throw new Error('Enter your name')

  const { name } = input as Record<string, unknown>
  if (typeof name !== 'string' || !name.trim()) throw new Error('Enter your name')

  const normalizedName = name.trim()
  if (normalizedName.length > 80) throw new Error('Name must be 80 characters or fewer')

  return { name: normalizedName }
}

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const { readSession } = await import('@/lib/auth-session.server')
  return readSession()
})

export const startPasskeyRegistration = createServerFn({ method: 'POST' })
  .validator(validateName)
  .handler(async ({ data }) => {
    const { createRegistrationContext } = await import(
      '@/lib/auth-registration.server'
    )

    return createRegistrationContext(data.name)
  })
