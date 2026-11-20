import type { NextRequest } from 'next/server'
import { auth0 } from '@/lib/auth0'

import { getEventConfig } from './event'

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

  const config = getEventConfig()
  const logins = config.adminLogins
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  const emails = config.adminEmails
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  const nickname = normalize(user.nickname)
  const preferred = normalize(user.preferred_username)
  const email = normalize(user.email)
  const emailLocal = email.split('@')[0] ?? ''
  const name = normalize(user.name)

  if (
    logins.includes(nickname) ||
    logins.includes(preferred) ||
    logins.includes(emailLocal)
  ) {
    return true
  }

  const domain = config.adminEmailDomain.trim().toLowerCase().replace(/^@/, '')
  if (email && (emails.includes(email) || (domain && email.endsWith(`@${domain}`)))) {
    return true
  }

  if (
    config.adminNames.split(',').map(normalize).filter(Boolean).includes(name) ||
    config.adminNameContains.split(',').map(normalize).filter(Boolean).some((part) => name.includes(part))
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
