export function isOAuthContinuation(search: string | Record<string, unknown>) {
  if (typeof search === 'string') {
    const params = new URLSearchParams(search)
    return params.has('sig') && params.has('ba_param')
  }

  return typeof search.sig === 'string' && search.ba_param !== undefined
}

export function oauthAuthorizationCallback(search: string) {
  if (!isOAuthContinuation(search)) return undefined

  const params = new URLSearchParams(search)
  params.delete('sig')
  params.delete('exp')
  params.delete('ba_iat')
  params.delete('ba_param')
  params.delete('ba_pl')

  return `/api/auth/oauth2/authorize?${params}`
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

export function oauthAuthorizationFromSearch(search: string) {
  return (
    oauthAuthorizationCallback(search) ??
    getOAuthAuthorizationPath(new URLSearchParams(search).get('oauth'))
  )
}

export function withOAuthAuthorization(path: string, authorization: unknown) {
  const oauth = getOAuthAuthorizationPath(authorization)
  if (!oauth) return path

  const url = new URL(path, 'https://today.invalid')
  url.searchParams.set('oauth', oauth)
  return `${url.pathname}${url.search}`
}
