export function isOAuthContinuation(search: string | Record<string, unknown>) {
  if (typeof search === 'string') {
    const params = new URLSearchParams(search)
    return params.has('sig') && params.has('ba_param')
  }

  return typeof search.sig === 'string' && search.ba_param !== undefined
}
