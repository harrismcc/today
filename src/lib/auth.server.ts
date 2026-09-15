import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { mcp } from '@better-auth/mcp'
import { betterAuth } from 'better-auth'
import { haveIBeenPwned, jwt } from 'better-auth/plugins'
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

export const auth = betterAuth({
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
  rateLimit: {
    enabled: true,
    storage: 'memory',
  },
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
  advanced: {
    ipAddress: {
      ipAddressHeaders: ['cf-connecting-ip'],
    },
    backgroundTasks: {
      handler: waitUntil,
    },
  },
  plugins: [
    haveIBeenPwned(),
    jwt(),
    mcp({
      loginPage: '/login',
      consentPage: '/consent',
      resource: mcpResource,
      accessTokenExpiresIn: 60 * 60,
      grantTypes: ['authorization_code'],
      scopes: [mcpScope],
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      rateLimit: {
        register: {
          window: 60,
          max: 5,
        },
      },
    }),
    tanstackStartCookies(),
  ],
})
