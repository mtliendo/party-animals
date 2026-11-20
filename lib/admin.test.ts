import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/auth0', () => ({ auth0: {} }))
import { isAdminUser } from './admin'

afterEach(() => vi.unstubAllEnvs())

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
