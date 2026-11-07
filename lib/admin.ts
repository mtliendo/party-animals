import type { NextRequest } from 'next/server'
import { auth0 } from '@/lib/auth0'

const DEFAULT_ADMIN_LOGINS = 'mtliendo,focusotter'

export type SessionRequest = NextRequest

function normalize(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
}

function sessionUserFields(
  session: { user?: Record<string, unknown> } | null | undefined,
) {
  const user = session?.user
  return {
    sub: user?.sub ?? null,
    nickname: user?.nickname ?? null,
    email: user?.email ?? null,
  }
}

export function logUnauthorized(
  source: string,
  reason: string,
  session: { user?: Record<string, unknown> } | null | undefined,
) {
  console.log(`[${source}] 401`, {
    reason,
    foundSession: Boolean(session),
    ...sessionUserFields(session),
  })
}

export function isAdminUser(
  user: Record<string, unknown> | null | undefined,
): boolean {
  if (!user) return false

  const logins = (process.env.ADMIN_GITHUB_LOGIN ?? DEFAULT_ADMIN_LOGINS)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  const emails = (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  const nickname = normalize(user.nickname)
  const preferred = normalize(user.preferred_username)
  const email = normalize(user.email)
  const emailLocal = email.split('@')[0] ?? ''
  const name = normalize(user.name)
  const sub = normalize(user.sub)

  if (
    logins.includes(nickname) ||
    logins.includes(preferred) ||
    logins.includes(emailLocal)
  ) {
    return true
  }

  if (email && (emails.includes(email) || email.endsWith('@focusotter.com'))) {
    return true
  }

  if (sub.includes('github') && nickname === 'mtliendo') {
    return true
  }

  if (
    name === 'focus otter' ||
    name.includes('moises') ||
    name.includes('liendo')
  ) {
    return true
  }

  return false
}

/**
 * Auth0 v4 can miss the session in Route Handlers when getSession() is called
 * without the request (cookies() / async request context). Prefer the request
 * cookie header, then fall back to the no-arg App Router helper.
 */
export async function readAuth0Session(request?: SessionRequest) {
  if (request) {
    try {
      const fromRequest = await auth0.getSession(request)
      if (fromRequest) return fromRequest
    } catch (err) {
      console.log('[readAuth0Session]', {
        reason: `getSession(request) failed: ${err instanceof Error ? err.message : 'unknown'}`,
        foundSession: false,
        sub: null,
        nickname: null,
        email: null,
      })
    }
  }

  // Do not catch: Next.js uses thrown DYNAMIC_SERVER_USAGE to opt the
  // route into dynamic rendering when cookies()/headers() are read.
  return auth0.getSession()
}

export async function getAdminSession(request?: SessionRequest) {
  const session = await readAuth0Session(request)
  if (!session?.user) {
    logUnauthorized('getAdminSession', 'no session', session)
    return null
  }
  if (!isAdminUser(session.user as Record<string, unknown>)) {
    logUnauthorized(
      'getAdminSession',
      'session is not an admin user',
      session as { user?: Record<string, unknown> },
    )
    return null
  }
  return session
}

export async function getSessionFlags() {
  const session = await auth0.getSession()
  const isAdmin = isAdminUser(session?.user as Record<string, unknown> | undefined)
  return { session, isAdmin }
}
