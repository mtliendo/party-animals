import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { getEventConfig, loginUrl } from '@/lib/event'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/components/EventProvider', () => ({ useEvent: () => ({ connection: 'github', loginConnection: 'Username-Password-Authentication' }) }))
vi.mock('sonner', () => ({ Toaster: () => null, toast: { success: vi.fn(), error: vi.fn() } }))
import SettingsClient from './SettingsClient'

describe('GitHub connection card', () => {
  it.each([false, true])('keeps GitHub sign-in available when admin login uses email/password (connected: %s)', githubConnected => {
    const config = getEventConfig({ AUTH0_LOGIN_CONNECTION: 'Username-Password-Authentication' })
    const html = renderToStaticMarkup(createElement(SettingsClient, {
      user: { email: 'otter-ranger@focusotter.com' },
      githubConnected,
      githubSource: githubConnected ? 'github-login' : null,
      settings: { effective: config, defaults: config },
    }))
    expect(html).toContain('href="/auth/login?connection=github&amp;returnTo=%2Fsettings"')
    expect(html).toContain(githubConnected ? 'Re-sign in with GitHub' : 'Sign in with GitHub')
    expect(html).toContain('/auth/connect?connection=github')
    expect(loginUrl(config.loginConnection)).toContain('connection=Username-Password-Authentication')
  })
})
