import { passkey } from '@better-auth/passkey'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { db } from '@/db/index.server'
import * as schema from '@/db/schema'
import { parseRegistrationContext } from '@/lib/auth-registration.server'

const baseURL = (process.env.BETTER_AUTH_URL || process.env.PUBLIC_URL)?.replace(/\/$/, '')

export const auth = betterAuth({
  appName: 'Today',
  baseURL,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema,
  }),
  trustedOrigins: baseURL ? [baseURL] : [],
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
            displayName: registration.name,
          }
        },
        afterVerification: async ({ context, ctx }) => {
          const registration = parseRegistrationContext(context)
          const existingUser = await ctx.context.internalAdapter.findUserById(
            registration.id,
          )

          if (existingUser) throw new Error('Registration has already been used')

          await ctx.context.internalAdapter.createUser(
            {
              id: registration.id,
              name: registration.name,
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
