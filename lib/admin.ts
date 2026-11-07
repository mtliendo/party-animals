import { auth0 } from '@/lib/auth0'

const DEFAULT_ADMIN_LOGINS = 'mtliendo,focusotter'

function normalize(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
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

  if (name === 'focus otter' || name.includes('moises')) {
    return true
  }

  return false
}

export async function getAdminSession() {
  const session = await auth0.getSession()
  if (!session?.user || !isAdminUser(session.user as Record<string, unknown>)) {
    return null
  }
  return session
}

export async function getSessionFlags() {
  const session = await auth0.getSession()
  const isAdmin = isAdminUser(session?.user as Record<string, unknown> | undefined)
  return { session, isAdmin }
}
