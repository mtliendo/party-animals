import { HEART } from './event-heart'
export { HEART } from './event-heart'

export const eventFields = ['slug', 'name', 'url', 'host', 'shortName', 'tagline', 'siteUrl', 'issueLabel'] as const
export type EventOverrides = Partial<Record<typeof eventFields[number], string>>

export function validateEventOverrides(input: unknown) {
  const overrides: EventOverrides = {}
  const errors: Record<string, string> = {}
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { overrides, errors: { body: 'Expected an object' } }
  }
  for (const [key, value] of Object.entries(input)) {
    if (!eventFields.includes(key as typeof eventFields[number])) {
      errors[key] = 'Unknown field'
      continue
    }
    if (typeof value !== 'string') { errors[key] = 'Expected text'; continue }
    let text = value.trim()
    if (!text) continue
    if (text.length > (key === 'url' || key === 'siteUrl' ? 2048 : 120)) {
      errors[key] = 'Value is too long'
      continue
    }
    if (key === 'slug' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text)) errors[key] = 'Use lowercase letters, numbers and single hyphens'
    if (key === 'url' || key === 'siteUrl') {
      try {
        const url = new URL(text)
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
        if (key === 'siteUrl') {
          if (url.search || url.hash || text.includes('?') || text.includes('#')) {
            errors[key] = 'Site URL must not contain a query string or fragment'
          }
          text = text.replace(/\/$/, '')
        }
      } catch { errors[key] = 'Enter an http(s) URL' }
    }
    overrides[key as typeof eventFields[number]] = text
  }
  return { overrides, errors }
}

export function getEventConfig(env: Record<string, string | undefined> = process.env, overrides: EventOverrides = {}) {
  env = { ...env }
  const keys = { slug: 'EVENT_SLUG', name: 'EVENT_NAME', url: 'EVENT_URL', host: 'EVENT_BRAND_HOST', shortName: 'EVENT_BRAND_SHORT_NAME', tagline: 'EVENT_TAGLINE', siteUrl: 'EVENT_SITE_URL', issueLabel: 'EVENT_ISSUE_LABEL' }
  for (const key of eventFields) {
    const value = overrides[key]?.trim() || env[keys[key]]?.trim()
    env[keys[key]] = value || undefined
  }
  const host = env.EVENT_BRAND_HOST ?? 'Auth0'
  const shortName = env.EVENT_BRAND_SHORT_NAME ?? 'AIE'
  const siteName = `${host} ${HEART} ${shortName}`
  const siteUrl = (env.EVENT_SITE_URL ?? env.APP_BASE_URL ?? 'https://party-animals-xi.vercel.app').replace(/\/$/, '')
  const slug = env.EVENT_SLUG ?? 'ai-world-fair-2026'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('EVENT_SLUG must contain lowercase letters, numbers and single hyphens')
  }
  return {
    slug,
    name: env.EVENT_NAME ?? 'AI World Fair 2026',
    url: env.EVENT_URL ?? 'https://www.ai.engineer/worldsfair/2026',
    host, shortName, siteName, siteUrl,
    tagline: env.EVENT_TAGLINE ?? 'AI Engineer · San Francisco',
    description: env.EVENT_DESCRIPTION ?? `${siteName}. Draw your animal, AI brings it to life, and the wall never forgets.`,
    drawUrl: `${siteUrl}/draw`,
    wallUrl: env.NEXT_PUBLIC_WALL_URL ?? `${siteUrl}/wall`,
    issueRepo: env.GITHUB_ISSUE_REPO ?? 'focusotter/party-animals-gallery',
    issueLabel: env.EVENT_ISSUE_LABEL ?? 'ai-world-fair',
    connection: env.AUTH0_TOKEN_VAULT_CONNECTION ?? 'github',
    loginConnection: env.AUTH0_LOGIN_CONNECTION?.trim() ?? env.AUTH0_TOKEN_VAULT_CONNECTION ?? 'github',
    videoPrompt: env.EVENT_VIDEO_PROMPT ?? 'Animate this party animal drawing — make it fun and bouncy but keep many of the details of the drawing. If the drawing includes text, use that as additional context for the animation but do not include that text in the resulting video.',
    adminLogins: env.ADMIN_GITHUB_LOGIN ?? 'mtliendo,focusotter',
    adminEmails: env.ADMIN_EMAIL ?? '',
    adminEmailDomain: env.ADMIN_EMAIL_DOMAIN ?? 'focusotter.com',
    adminNames: env.ADMIN_NAMES ?? 'focus otter',
    adminNameContains: env.ADMIN_NAME_CONTAINS ?? 'moises,liendo',
  }
}

export function publicEventConfig(event: ReturnType<typeof getEventConfig>) {
  const { host, shortName, siteName, drawUrl, connection, loginConnection } = event
  return { host, shortName, siteName, drawUrl, connection, loginConnection }
}

export function loginUrl(connection: string, returnTo = '/settings') {
  return `/auth/login?${connection ? `connection=${encodeURIComponent(connection)}&` : ''}returnTo=${encodeURIComponent(returnTo)}`
}
