import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  getOAuthAuthorizationPath,
  oauthAuthorizationFromSearch,
  validateOAuthContinuationSearch,
  withOAuthAuthorization,
} from './oauth-continuation.ts'

describe('OAuth continuation validation', () => {
  test('rejects external, protocol-relative, and lookalike authorization URLs', () => {
    const malicious = [
      'https://attacker.example/api/auth/oauth2/authorize?client_id=stolen',
      '//attacker.example/api/auth/oauth2/authorize?client_id=stolen',
      '/api/auth/oauth2/authorize/../../attacker',
      '/api/auth/oauth2/authorize.evil?client_id=stolen',
    ]

    for (const oauth of malicious) {
      assert.equal(getOAuthAuthorizationPath(oauth), undefined)
      assert.equal(
        oauthAuthorizationFromSearch(validateOAuthContinuationSearch({ oauth })),
        undefined,
      )
      assert.equal(withOAuthAuthorization('/login', oauth), '/login')
    }
  })

  test('accepts only the authorize endpoint while preserving its ordinary query', () => {
    const oauth =
      '/api/auth/oauth2/authorize?client_id=desktop&redirect_uri=https%3A%2F%2Fclient.example%2Fcallback&scope=mcp%3Atodos&state=s-123'

    assert.equal(getOAuthAuthorizationPath(oauth), oauth)
    assert.equal(
      oauthAuthorizationFromSearch(validateOAuthContinuationSearch({ oauth })),
      oauth,
    )
    assert.equal(
      withOAuthAuthorization('/reset-password?token=reset-token', oauth),
      '/reset-password?token=reset-token&oauth=%2Fapi%2Fauth%2Foauth2%2Fauthorize%3Fclient_id%3Ddesktop%26redirect_uri%3Dhttps%253A%252F%252Fclient.example%252Fcallback%26scope%3Dmcp%253Atodos%26state%3Ds-123',
    )
    assert.equal(
      withOAuthAuthorization('/login?forgot=true', oauth),
      '/login?forgot=true&oauth=%2Fapi%2Fauth%2Foauth2%2Fauthorize%3Fclient_id%3Ddesktop%26redirect_uri%3Dhttps%253A%252F%252Fclient.example%252Fcallback%26scope%3Dmcp%253Atodos%26state%3Ds-123',
    )
    assert.equal(
      withOAuthAuthorization('/verify-email', oauth),
      '/verify-email?oauth=%2Fapi%2Fauth%2Foauth2%2Fauthorize%3Fclient_id%3Ddesktop%26redirect_uri%3Dhttps%253A%252F%252Fclient.example%252Fcallback%26scope%3Dmcp%253Atodos%26state%3Ds-123',
    )
  })

  test('converts signed Better Auth route search into an unsigned authorization callback', () => {
    const search = oauthAuthorizationFromSearch(validateOAuthContinuationSearch({
      client_id: 'desktop',
      redirect_uri: 'https://client.example/callback',
      response_type: 'code',
      scope: 'mcp:todos',
      state: 's-123',
      sig: 'signed-value',
      exp: 1_800_000_000,
      ba_iat: 1_700_000_000,
      ba_param: ['client_id', 'redirect_uri', 'scope', 'state'],
      ba_pl: 'signed-payload',
    }))

    assert.equal(
      search,
      '/api/auth/oauth2/authorize?client_id=desktop&redirect_uri=https%3A%2F%2Fclient.example%2Fcallback&response_type=code&scope=mcp%3Atodos&state=s-123',
    )
  })

  test('produces continuation links from pre-hydration route data', () => {
    const loginSearch = validateOAuthContinuationSearch({
      client_id: 'desktop',
      redirect_uri: 'https://client.example/callback',
      response_type: 'code',
      state: 'before-hydration',
      sig: 'signed-value',
      ba_param: 'client_id,redirect_uri,response_type,state',
    })
    const loginOAuth = oauthAuthorizationFromSearch(loginSearch)

    const signupHref = withOAuthAuthorization('/signup', loginOAuth)
    assert.equal(
      signupHref,
      '/signup?oauth=%2Fapi%2Fauth%2Foauth2%2Fauthorize%3Fclient_id%3Ddesktop%26redirect_uri%3Dhttps%253A%252F%252Fclient.example%252Fcallback%26response_type%3Dcode%26state%3Dbefore-hydration',
    )

    const signupURL = new URL(signupHref, 'https://today.example')
    const signupSearch = validateOAuthContinuationSearch(
      Object.fromEntries(signupURL.searchParams),
    )
    const signupOAuth = oauthAuthorizationFromSearch(signupSearch)
    assert.equal(signupOAuth, loginOAuth)
    assert.equal(withOAuthAuthorization('/login', signupOAuth).startsWith('/login?oauth='), true)
  })

  test('replaces stale continuation data when route search changes', () => {
    const first = oauthAuthorizationFromSearch(validateOAuthContinuationSearch({
      oauth: '/api/auth/oauth2/authorize?state=first',
    }))
    const updated = oauthAuthorizationFromSearch(validateOAuthContinuationSearch({
      oauth: '/api/auth/oauth2/authorize?state=updated',
    }))

    assert.equal(first, '/api/auth/oauth2/authorize?state=first')
    assert.equal(updated, '/api/auth/oauth2/authorize?state=updated')
    assert.equal(
      withOAuthAuthorization('/signup', updated),
      '/signup?oauth=%2Fapi%2Fauth%2Foauth2%2Fauthorize%3Fstate%3Dupdated',
    )
  })
})
