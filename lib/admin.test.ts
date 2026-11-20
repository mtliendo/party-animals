import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('@/lib/auth0', () => ({ auth0: { getSession } }))
import { getAdminSession, isAdminUser, readAuth0Session } from './admin'

beforeEach(() => getSession.mockReset())

afterEach(() => vi.unstubAllEnvs())

describe('admin session reads', () => {
  it('accepts an email/password admin session from the API request', async () => {
    const request = new NextRequest('https://preview.example/api/settings/event')
    const session = { user: { sub: 'auth0|qa-user', email: 'otter-ranger@focusotter.com' } }
    getSession.mockResolvedValueOnce(session)
    expect(await getAdminSession(request)).toBe(session)
    expect(getSession).toHaveBeenCalledExactlyOnceWith(request)
  })
  it('falls back to the App Router cookie context if the request read finds no session', async () => {
    const session = { user: { email: 'otter-ranger@focusotter.com' } }
    getSession.mockResolvedValueOnce(null).mockResolvedValueOnce(session)
    expect(await readAuth0Session(new NextRequest('https://preview.example/api/settings/event'))).toBe(session)
    expect(getSession.mock.calls[1]).toEqual([])
  })
  it('does not cache a missing session across requests', async () => {
    const session = { user: { email: 'otter-ranger@focusotter.com' } }
    getSession.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(session)
    expect(await getAdminSession(new NextRequest('https://preview.example/api/settings/event'))).toBeNull()
    expect(await getAdminSession(new NextRequest('https://preview.example/api/settings/event'))).toBe(session)
  })
  it('does not elevate an authenticated non-admin', async () => {
    getSession.mockResolvedValueOnce({ user: { email: 'guest@example.com' } })
    expect(await getAdminSession(new NextRequest('https://preview.example/api/settings/event'))).toBeNull()
  })
})

describe('isAdminUser', () => {
  it('keeps all legacy admin grants', () => {
    for (const user of [
      { nickname: '@MtLiendo' }, { preferred_username: 'focusotter' },
      { email: 'mtliendo@example.com' }, { email: 'someone@focusotter.com' },
      { name: 'Focus Otter' }, { name: 'Moises Example' }, { name: 'Someone Liendo' },
    ]) expect(isAdminUser(user)).toBe(true)
  })
  it('denies missing or unrelated users', () => {
    for (const user of [null, undefined, {}, { nickname: 'guest' }, { email: 'x@notfocusotter.com' }]) {
      expect(isAdminUser(user)).toBe(false)
    }
  })
  it('replaces all default grants with configured values', () => {
    vi.stubEnv('ADMIN_GITHUB_LOGIN', 'NewAdmin')
    vi.stubEnv('ADMIN_EMAIL', 'invited@example.com')
    vi.stubEnv('ADMIN_EMAIL_DOMAIN', 'event.example')
    vi.stubEnv('ADMIN_NAMES', 'Event Owner')
    vi.stubEnv('ADMIN_NAME_CONTAINS', 'organizer')
    for (const user of [{ nickname: 'newadmin' }, { email: 'invited@example.com' }, { email: 'a@event.example' }, { name: 'Event Owner' }, { name: 'An Organizer' }]) {
      expect(isAdminUser(user)).toBe(true)
    }
    expect(isAdminUser({ nickname: 'mtliendo', sub: 'github|123', name: 'Moises Liendo', email: 'a@focusotter.com' })).toBe(false)
  })
  it('can disable all admin grants', () => {
    for (const key of ['ADMIN_GITHUB_LOGIN', 'ADMIN_EMAIL', 'ADMIN_EMAIL_DOMAIN', 'ADMIN_NAMES', 'ADMIN_NAME_CONTAINS']) vi.stubEnv(key, '')
    expect(isAdminUser({ name: 'Moises Liendo', nickname: 'mtliendo', sub: 'github|123', email: 'a@focusotter.com' })).toBe(false)
    expect(isAdminUser({})).toBe(false)
  })
})
