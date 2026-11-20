import { describe, expect, it } from 'vitest'
import { getEventConfig, validateEventOverrides } from './event'

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
  it.each(['../event', 'Event', 'two--events'])('rejects unsafe slug %j', (slug) => {
    expect(() => getEventConfig({ EVENT_SLUG: slug })).toThrow('EVENT_SLUG')
  })
  it('merges overrides before environment and recomputes derived values', () => {
    expect(getEventConfig({ EVENT_BRAND_HOST: 'Env', EVENT_SITE_URL: 'https://env.example', EVENT_NAME: 'Env name' }, { host: 'Saved', shortName: 'S', siteUrl: 'https://saved.example/', name: '' }))
      .toMatchObject({ siteName: 'Saved ❤️ S', description: 'Saved ❤️ S. Draw your animal, AI brings it to life, and the wall never forgets.', drawUrl: 'https://saved.example/draw', wallUrl: 'https://saved.example/wall', name: 'Env name' })
    expect(getEventConfig({ EVENT_SLUG: '' }).slug).toBe('ai-world-fair-2026')
  })
  it('trims input and omits empty overrides', () => {
    expect(validateEventOverrides({ name: ' New name ', slug: ' ', url: 'https://example.com' })).toEqual({ overrides: { name: 'New name', url: 'https://example.com' }, errors: {} })
    expect(validateEventOverrides({})).toEqual({ overrides: {}, errors: {} })
  })
  it.each(['https://example.com/?a=1', 'https://example.com/#section', 'https://example.com/?', 'https://example.com/#'])('rejects site URL queries and fragments %s', siteUrl => {
    expect(validateEventOverrides({ siteUrl }).errors).toHaveProperty('siteUrl')
  })
  it('strips a site URL trailing slash and derives clean links', () => {
    const result = validateEventOverrides({ siteUrl: ' https://example.com/base/ ' })
    expect(result).toEqual({ overrides: { siteUrl: 'https://example.com/base' }, errors: {} })
    expect(getEventConfig({}, result.overrides)).toMatchObject({ drawUrl: 'https://example.com/base/draw', wallUrl: 'https://example.com/base/wall' })
    expect(validateEventOverrides({ url: 'https://example.com/?a=1#section' }).errors).toEqual({})
  })
  it.each([null, [], 'text', { slug: 'Two--events' }, { url: 'javascript:alert(1)' }, { siteUrl: '/relative' }, { name: 'a'.repeat(121) }, { host: 123 }, { issueRepo: 'owner/repo' }])('rejects invalid overrides %j', input => {
    expect(Object.keys(validateEventOverrides(input).errors).length).toBeGreaterThan(0)
  })
})
