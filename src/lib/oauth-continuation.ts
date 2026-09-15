export type OAuthContinuationSearch = Record<string, unknown> & {
  forgot?: true
  oauth?: string
}

const signedParameterNames = new Set(['sig', 'exp', 'ba_iat', 'ba_param', 'ba_pl'])

function signedOAuthAuthorization(search: Record<string, unknown>) {
  if (typeof search.sig !== 'string' || search.ba_param === undefined) return undefined

  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(search)) {
    if (signedParameterNames.has(name)) continue

    for (const item of Array.isArray(value) ? value : [value]) {
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        params.append(name, String(item))
      }
    }
  }

  const query = params.toString()
  return `/api/auth/oauth2/authorize${query ? `?${query}` : ''}`
}

export function getOAuthAuthorizationPath(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return undefined
  }

  try {
    const url = new URL(value, 'https://today.invalid')
    if (
      url.origin !== 'https://today.invalid' ||
      url.pathname !== '/api/auth/oauth2/authorize'
    ) {
      return undefined
    }

    return `${url.pathname}${url.search}`
  } catch {
    return undefined
  }
}

export function validateOAuthContinuationSearch(
  search: Record<string, unknown>,
): OAuthContinuationSearch {
  return {
    ...search,
    forgot:
      search.forgot === true || search.forgot === 'true' ? (true as const) : undefined,
    oauth: getOAuthAuthorizationPath(search.oauth),
  }
}

export function oauthAuthorizationFromSearch(search: OAuthContinuationSearch) {
  return signedOAuthAuthorization(search) ?? getOAuthAuthorizationPath(search.oauth)
}

export function withOAuthAuthorization(path: string, authorization: unknown) {
  const oauth = getOAuthAuthorizationPath(authorization)
  if (!oauth) return path

  const url = new URL(path, 'https://today.invalid')
  url.searchParams.set('oauth', oauth)
  return `${url.pathname}${url.search}`
}
