import { HEART } from './event-heart'
export { HEART } from './event-heart'

export function getEventConfig(env: Record<string, string | undefined> = process.env) {
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
    videoPrompt: env.EVENT_VIDEO_PROMPT ?? 'Animate this party animal drawing — make it fun and bouncy but keep many of the details of the drawing. If the drawing includes text, use that as additional context for the animation but do not include that text in the resulting video.',
    adminLogins: env.ADMIN_GITHUB_LOGIN ?? 'mtliendo,focusotter',
    adminEmails: env.ADMIN_EMAIL ?? '',
    adminEmailDomain: env.ADMIN_EMAIL_DOMAIN ?? 'focusotter.com',
    adminNames: env.ADMIN_NAMES ?? 'focus otter',
    adminNameContains: env.ADMIN_NAME_CONTAINS ?? 'moises,liendo',
  }
}

export const event = getEventConfig()

export function publicEventConfig() {
  const { host, shortName, siteName, drawUrl, connection } = event
  return { host, shortName, siteName, drawUrl, connection }
}
