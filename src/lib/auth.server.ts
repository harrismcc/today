import { passkey } from '@better-auth/passkey'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'

import { db } from '@/db/index.server'
import * as schema from '@/db/schema'
import { authSecret, parseRegistrationContext } from '@/lib/auth-registration.server'

const userDisplayName = 'Today user'

export const auth = betterAuth({
  appName: 'Today',
  baseURL: {
    allowedHosts: [
      'localhost:*',
      '127.0.0.1:*',
      '*.onamp.dev',
      ...env.BETTER_AUTH_ALLOWED_HOSTS.split(',').map((host) => host.trim()),
    ],
  },
  secret: authSecret(),
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  plugins: [
    passkey({
      rpName: 'Today',
      authenticatorSelection: {
        residentKey: 'required',
        // Permit possession-only security keys that verify with a physical tap.
        userVerification: 'preferred',
      },
      registration: {
        requireSession: false,
        resolveUser: ({ context }) => {
          const registration = parseRegistrationContext(context)

          return {
            id: registration.id,
            name: `${registration.id.replaceAll('-', '')}@passkey.invalid`,
            displayName: userDisplayName,
          }
        },
        afterVerification: async ({ context, ctx, verification }) => {
          const registration = parseRegistrationContext(context)
          const credentialId = verification.registrationInfo?.credential.id
          if (!credentialId) throw new Error('Passkey credential is missing')

          const existingPasskey = await db
            .select({ id: schema.passkey.id })
            .from(schema.passkey)
            .where(eq(schema.passkey.credentialID, credentialId))
            .get()

          if (existingPasskey) throw new Error('This passkey is already registered')

          const existingUser = await ctx.context.internalAdapter.findUserById(
            registration.id,
          )

          if (existingUser) throw new Error('Registration has already been used')

          await ctx.context.internalAdapter.createUser(
            {
              id: registration.id,
              name: userDisplayName,
              email: `${registration.id.replaceAll('-', '')}@passkey.invalid`,
              emailVerified: false,
            },
            { method: 'passkey' },
          )

          return { userId: registration.id }
        },
      },
    }),
    tanstackStartCookies(),
  ],
})
