import { describe, expect, it } from 'vitest'
import { getEventConfig } from './event'

describe('event configuration', () => {
  it('preserves the existing event defaults', () => {
    expect(getEventConfig({})).toMatchObject({
      slug: 'ai-world-fair-2026', name: 'AI World Fair 2026',
      url: 'https://www.ai.engineer/worldsfair/2026',
      siteName: 'Auth0 ❤️ AIE', tagline: 'AI Engineer · San Francisco',
      drawUrl: 'https://party-animals-xi.vercel.app/draw',
      wallUrl: 'https://party-animals-xi.vercel.app/wall',
      issueRepo: 'focusotter/party-animals-gallery', issueLabel: 'ai-world-fair',
      connection: 'github', adminLogins: 'mtliendo,focusotter',
      adminEmailDomain: 'focusotter.com',
    })
  })
  it('overrides event settings and derives URLs and branding', () => {
    expect(getEventConfig({
      EVENT_SLUG: 'summer-2027', EVENT_NAME: 'Summer', EVENT_URL: 'https://event.example',
      EVENT_BRAND_HOST: 'Host', EVENT_BRAND_SHORT_NAME: 'SUM', EVENT_SITE_URL: 'https://summer.example/',
      EVENT_TAGLINE: 'Summer days', EVENT_DESCRIPTION: 'Draw here',
      EVENT_ISSUE_LABEL: 'summer', GITHUB_ISSUE_REPO: 'host/gallery',
      AUTH0_TOKEN_VAULT_CONNECTION: 'conference-github', EVENT_VIDEO_PROMPT: 'Dance',
    })).toMatchObject({
      slug: 'summer-2027', name: 'Summer', url: 'https://event.example',
      siteName: 'Host ❤️ SUM', description: 'Draw here', tagline: 'Summer days',
      drawUrl: 'https://summer.example/draw', wallUrl: 'https://summer.example/wall',
      issueLabel: 'summer', issueRepo: 'host/gallery', connection: 'conference-github', videoPrompt: 'Dance',
    })
  })
  it('supports APP_BASE_URL and the legacy wall override', () => {
    expect(getEventConfig({ APP_BASE_URL: 'http://localhost:3000', NEXT_PUBLIC_WALL_URL: 'https://wall.example' }))
      .toMatchObject({ drawUrl: 'http://localhost:3000/draw', wallUrl: 'https://wall.example' })
  })
  it('allows explicitly empty admin defaults to disable grants', () => {
    expect(getEventConfig({ ADMIN_GITHUB_LOGIN: '', ADMIN_EMAIL_DOMAIN: '', ADMIN_NAMES: '', ADMIN_NAME_CONTAINS: '' }))
      .toMatchObject({ adminLogins: '', adminEmailDomain: '', adminNames: '', adminNameContains: '' })
  })
  it.each(['', '../event', 'Event', 'two--events'])('rejects unsafe slug %j', (slug) => {
    expect(() => getEventConfig({ EVENT_SLUG: slug })).toThrow('EVENT_SLUG')
  })
})
