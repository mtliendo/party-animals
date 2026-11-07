export const GITHUB_TOKEN_CLAIM_KEYS = [
  'github_access_token',
  'https://party-animals/github_access_token',
]

export function githubIdentityToken(identities: unknown): string | null {
  if (!Array.isArray(identities)) return null
  for (const identity of identities) {
    if (!identity || typeof identity !== 'object') continue
    const rec = identity as Record<string, unknown>
    if (rec.provider !== 'github' && rec.connection !== 'github') continue
    if (typeof rec.access_token === 'string' && rec.access_token.length > 0) {
      return rec.access_token
    }
  }
  return null
}

export function sessionKeepsGitHubClaims(
  filtered: Record<string, unknown>,
  original: Record<string, unknown>,
): Record<string, unknown> {
  const extra: Record<string, unknown> = {}
  for (const key of GITHUB_TOKEN_CLAIM_KEYS) {
    if (typeof original[key] === 'string') extra[key] = original[key]
  }
  if (Array.isArray(original.identities)) extra.identities = original.identities
  if (typeof original.preferred_username === 'string') {
    extra.preferred_username = original.preferred_username
  }
  return { ...filtered, ...extra }
}
