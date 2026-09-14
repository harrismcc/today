import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { mcp } from '@better-auth/mcp'
import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { haveIBeenPwned, isPasswordCompromised, jwt } from 'better-auth/plugins'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { env, waitUntil } from 'cloudflare:workers'

import { db } from '@/db/index.server'
import * as schema from '@/db/schema'
import { sendAuthEmail } from '@/lib/email.server'
import { mcpResource, mcpScope } from '@/lib/mcp-config.server'
import {
  getOAuthAuthorizationPath,
  withOAuthAuthorization,
} from '@/lib/oauth-continuation'

const developmentSecret = 'task-tracker-development-secret-change-me'
const minPasswordLength = 15
const maxPasswordLength = 128
const passwordCompromisedMessage =
  'The password you entered has been compromised. Please choose a different password.'

function verificationEmailURL(url: string) {
  const verificationURL = new URL(url)
  const continuation = getOAuthAuthorizationPath(
    verificationURL.searchParams.get('callbackURL'),
  )

  verificationURL.searchParams.set(
    'callbackURL',
    withOAuthAuthorization('/verify-email', continuation),
  )
  return verificationURL.toString()
}

function authSecret() {
  if (env.BETTER_AUTH_SECRET) return env.BETTER_AUTH_SECRET
  if (import.meta.env.PROD) {
    throw new Error('BETTER_AUTH_SECRET must be set in production')
  }

  return developmentSecret
}

export function createAuth() {
  return betterAuth({
    appName: 'Today',
    baseURL: {
      allowedHosts: [
        ...(import.meta.env.DEV
          ? ['localhost:*', '127.0.0.1:*', '*.onamp.dev']
          : []),
        ...env.BETTER_AUTH_ALLOWED_HOSTS.split(',')
          .map((host) => host.trim())
          .filter(Boolean),
      ],
    },
    secret: authSecret(),
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength,
      maxPasswordLength,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, url }) =>
        sendAuthEmail({
          to: user.email,
          subject: 'Reset your Today password',
          text: `Reset your Today password by opening this link:\n\n${url}\n\nThis link expires in one hour. If you did not request this, you can ignore this email.`,
        }),
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      sendOnSignIn: true,
      sendOnSignUp: true,
      sendVerificationEmail: ({ user, url }) =>
        sendAuthEmail({
          to: user.email,
          subject: 'Verify your email for Today',
          text: `Verify your email address by opening this link:\n\n${verificationEmailURL(url)}\n\nThis link expires in one hour.`,
        }),
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== '/reset-password') return

        const newPassword = ctx.body?.newPassword
        if (
          typeof newPassword !== 'string' ||
          newPassword.length < minPasswordLength ||
          newPassword.length > maxPasswordLength
        ) {
          return
        }

        if (await isPasswordCompromised(newPassword)) {
          throw new APIError('BAD_REQUEST', {
            code: 'PASSWORD_COMPROMISED',
            message: passwordCompromisedMessage,
          })
        }
      }),
    },
    advanced: {
      backgroundTasks: {
        handler: waitUntil,
      },
    },
    plugins: [
      haveIBeenPwned({
        paths: [
          '/sign-up/email',
          '/change-password',
          '/email-otp/reset-password',
          '/phone-number/reset-password',
          '/admin/create-user',
          '/admin/set-user-password',
        ],
      }),
      jwt(),
      mcp({
        loginPage: '/login',
        consentPage: '/consent',
        resource: mcpResource,
        scopes: [mcpScope, 'offline_access'],
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
      }),
      tanstackStartCookies(),
    ],
  })
}
