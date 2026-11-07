import { auth0 } from '@/lib/auth0'
import { GITHUB_TOKEN_CLAIM_KEYS, githubIdentityToken } from '@/lib/github-claims'

export type GitHubTokenSource = 'token-vault' | 'github-login' | 'env'

function auth0Domain(): string | null {
  const raw = process.env.AUTH0_DOMAIN?.trim()
  if (!raw) return null
  return raw.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

export type GitHubTokenResult =
  | { token: string; source: GitHubTokenSource }
  | { error: string; status: number }

function claimToken(user: Record<string, unknown> | undefined): string | null {
  if (!user) return null
  for (const key of GITHUB_TOKEN_CLAIM_KEYS) {
    const value = user[key]
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

async function getManagementApiToken(): Promise<string | null> {
  const domain = auth0Domain()
  const clientId = process.env.AUTH0_CLIENT_ID
  const clientSecret = process.env.AUTH0_CLIENT_SECRET
  if (!domain || !clientId || !clientSecret) return null

  const res = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
    }),
  })

  if (!res.ok) {
    console.warn('[github-token] Management API client credentials failed', {
      status: res.status,
    })
    return null
  }

  const data = (await res.json()) as { access_token?: string }
  return data.access_token ?? null
}

async function getGithubIdentityAccessToken(
  userSub: string,
): Promise<string | null> {
  const domain = auth0Domain()
  if (!domain) return null

  const mgmtToken = await getManagementApiToken()
  if (!mgmtToken) return null

  const res = await fetch(
    `https://${domain}/api/v2/users/${encodeURIComponent(userSub)}`,
    { headers: { Authorization: `Bearer ${mgmtToken}` } },
  )

  if (!res.ok) {
    console.warn('[github-token] user profile fetch failed', {
      status: res.status,
    })
    return null
  }

  const user = (await res.json()) as { identities?: unknown }
  const token = githubIdentityToken(user.identities)
  if (!token) {
    console.warn('[github-token] GitHub identity has no access_token', {
      identities: Array.isArray(user.identities) ? user.identities.length : 0,
    })
  }
  return token
}

/**
 * GitHub token for posting gallery issues.
 *
 * 1. Auth0 Token Vault connected account (needs a GitHub App + refresh token)
 * 2. Custom claim copied at login (Post-Login Action)
 * 3. GitHub social identity access_token (OAuth App login token; no refresh token)
 */
export async function getAdminGitHubToken(): Promise<GitHubTokenResult> {
  const session = await auth0.getSession()
  if (!session?.user) {
    return { error: 'Unauthorized', status: 401 }
  }

  try {
    const { token } = await auth0.getAccessTokenForConnection({
      connection: 'github',
    })
    if (token) return { token, source: 'token-vault' }
  } catch (err) {
    console.warn(
      '[github-token] Token Vault miss',
      err instanceof Error ? err.message : 'unknown',
    )
  }

  const fromClaim = claimToken(session.user as Record<string, unknown>)
  if (fromClaim) return { token: fromClaim, source: 'github-login' }

  const fromSessionIdentities = githubIdentityToken(
    (session.user as Record<string, unknown>).identities,
  )
  if (fromSessionIdentities) {
    return { token: fromSessionIdentities, source: 'github-login' }
  }

  const fromProfile = await getGithubIdentityAccessToken(session.user.sub)
  if (fromProfile) return { token: fromProfile, source: 'github-login' }

  const fromEnv = process.env.GITHUB_POSTING_TOKEN
  if (fromEnv) return { token: fromEnv, source: 'env' }

  const githubLogin = String(session.user.sub).startsWith('github|')
  return {
    error: githubLogin
      ? 'GitHub login is active but no posting token was available. Sign out and sign in with GitHub again.'
      : 'Sign in with GitHub to post, or connect GitHub in Settings.',
    status: 409,
  }
}
