'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import { eventFields, loginUrl, type getEventConfig } from '@/lib/event'
import { useEvent } from '@/components/EventProvider'
import { SiteBrand } from '@/components/SiteBrand'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type User = {
  email?: string
  name?: string
  picture?: string
  [key: string]: unknown
}

export default function SettingsClient({
  user,
  githubConnected,
  githubSource,
  settings,
}: {
  user: User
  githubConnected: boolean
  githubSource: 'token-vault' | 'github-login' | 'env' | null
  settings: { effective: ReturnType<typeof getEventConfig>; defaults: ReturnType<typeof getEventConfig> }
}) {
  const { connection } = useEvent()
  const router = useRouter()
  const [values, setValues] = useState(() => Object.fromEntries(eventFields.map(key => [key, settings.effective[key]])))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  async function save(reset = false) {
    setBusy(true)
    setErrors({})
    try {
      const overrides = Object.fromEntries(eventFields.map(key => [key, values[key].trim() === settings.defaults[key] ? '' : values[key]]))
      const res = await fetch('/api/settings/event', {
        method: reset ? 'DELETE' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        ...(reset ? {} : { body: JSON.stringify(overrides) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrors(data.errors ?? {})
        throw new Error(data.error ?? 'Unable to save settings')
      }
      setValues(Object.fromEntries(eventFields.map(key => [key, data.effective[key]])))
      toast.success(reset ? 'Reset to environment defaults' : 'App configuration saved')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save settings')
    } finally { setBusy(false) }
  }
  return (
    <div
      className='min-h-screen flex flex-col'
      style={{ background: 'var(--bg-dark)' }}
    >
      <Toaster richColors />
      {/* Nav */}
      <nav className='app-nav'>
        <SiteBrand />
        <div className='app-nav-links'>
          <Link href='/draw' className='btn-secondary text-sm py-2 px-5'>
            Draw
          </Link>
          <Link
            href='/wall'
            className='text-sm hover:text-white transition-colors'
            style={{ color: 'var(--text-muted)' }}
          >
            The Wall
          </Link>
          <Link
            href='/auth/logout'
            className='text-sm hover:text-white transition-colors'
            style={{ color: 'var(--text-muted)' }}
          >
            Logout
          </Link>
        </div>
      </nav>

      <main className='flex-1 flex flex-col items-center justify-center px-6 py-16'>
        <div className='w-full max-w-xl flex flex-col gap-6'>
          <div className='text-center mb-4'>
            <h1
              className='text-5xl tracking-wide mb-2'
              style={{ fontFamily: 'var(--font-bangers)' }}
            >
              <span className='gradient-text'>SETTINGS</span>
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Admin only. Sign in with GitHub to post, or connect Token Vault once a GitHub App is configured.
            </p>
          </div>

          {/* Profile card */}
          <Card
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border)',
            }}
          >
            <CardHeader>
              <CardTitle
                className='text-lg tracking-wide'
                style={{
                  fontFamily: 'var(--font-bangers)',
                  color: 'var(--text-primary)',
                }}
              >
                YOUR PROFILE
              </CardTitle>
              <CardDescription style={{ color: 'var(--text-muted)' }}>
                Logged in as
              </CardDescription>
            </CardHeader>
            <CardContent className='flex items-center gap-4'>
              {user.picture && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture as string}
                  alt={user.name as string}
                  className='rounded-full size-12 border-2'
                  style={{ borderColor: 'var(--hot-pink)' }}
                />
              )}
              <div>
                <p
                  className='font-semibold'
                  style={{ color: 'var(--text-primary)' }}
                >
                  {user.name}
                </p>
                <p className='text-sm' style={{ color: 'var(--text-muted)' }}>
                  {user.email}
                </p>
              </div>
            </CardContent>
          </Card>

          <Separator className='opacity-20' />

          {/* GitHub connection card */}
          <Card
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border)',
            }}
          >
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle
                  className='text-lg tracking-wide flex items-center gap-2'
                  style={{
                    fontFamily: 'var(--font-bangers)',
                    color: 'var(--text-primary)',
                  }}
                >
                  GITHUB ACCOUNT
                </CardTitle>
                {githubConnected ? (
                  <Badge
                    style={{
                      background: 'rgba(0,240,255,0.12)',
                      border: '1px solid rgba(0,240,255,0.3)',
                      color: 'var(--neon-cyan)',
                    }}
                  >
                    {githubSource === 'token-vault'
                      ? 'Token Vault'
                      : githubSource === 'env'
                        ? 'Server token'
                        : 'GitHub login'}
                  </Badge>
                ) : (
                  <Badge
                    style={{
                      background: 'rgba(255,215,0,0.12)',
                      border: '1px solid rgba(255,215,0,0.3)',
                      color: 'var(--gold)',
                    }}
                  >
                    Not connected
                  </Badge>
                )}
              </div>
              <CardDescription style={{ color: 'var(--text-muted)' }}>
                {githubConnected
                  ? githubSource === 'token-vault'
                    ? 'Token Vault has a GitHub token. Issues will be posted with a short-lived credential.'
                    : githubSource === 'env'
                      ? 'Posting will use GITHUB_POSTING_TOKEN on the server. Sign in with GitHub so the talk can use your login token instead.'
                      : 'Posting will use your GitHub login token. Token Vault still needs a GitHub App for refresh tokens.'
                  : 'Sign in with GitHub to post issues now. Connect GitHub (Token Vault) after swapping to a GitHub App.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col gap-3'>
                {githubConnected ? (
                  <div
                    className='rounded-lg p-4 text-sm'
                    style={{
                      background: 'rgba(0,240,255,0.05)',
                      border: '1px solid rgba(0,240,255,0.15)',
                      color: 'var(--neon-cyan)',
                    }}
                  >
                    {githubSource === 'token-vault'
                      ? 'GitHub credentials are stored in Auth0 Token Vault. The agent never holds long-lived secrets.'
                      : githubSource === 'env'
                        ? 'A server token is configured as a talk fallback. Sign in with GitHub to post as the admin login instead.'
                        : 'Ready to post with your GitHub login. Token Vault Connect may still fail until the connection uses a GitHub App.'}
                  </div>
                ) : null}
                <a
                  href={loginUrl(connection)}
                  className='btn-primary w-full justify-center text-center'
                >
                  {githubConnected ? 'Re-sign in with GitHub' : 'Sign in with GitHub'}
                </a>
                <a
                  href={`/auth/connect?connection=${encodeURIComponent(connection)}&returnTo=/settings`}
                  className='btn-secondary w-full justify-center text-center'
                >
                  Connect GitHub (Token Vault)
                </a>
              </div>
            </CardContent>
          </Card>

          <Card style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <CardHeader>
              <CardTitle className='text-lg tracking-wide' style={{ fontFamily: 'var(--font-bangers)', color: 'var(--text-primary)' }}>CONFIGURE APP</CardTitle>
              <CardDescription style={{ color: 'var(--text-muted)' }}>Changes apply on the next request. Leave a field empty to use its environment default.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className='flex flex-col gap-4' onSubmit={e => { e.preventDefault(); void save() }}>
                {eventFields.map(key => (
                  <div key={key} className='flex flex-col gap-1'>
                    <label htmlFor={`event-${key}`} className='text-sm font-semibold'>{{ slug: 'Event slug', name: 'Event name', url: 'Event URL', host: 'Brand host', shortName: 'Brand short name', tagline: 'Tagline', siteUrl: 'Site URL', issueLabel: 'Issue label' }[key]}</label>
                    <input id={`event-${key}`} value={values[key]} placeholder={settings.defaults[key]} disabled={busy} type={key === 'url' || key === 'siteUrl' ? 'url' : 'text'} maxLength={key === 'url' || key === 'siteUrl' ? 2048 : 120} onChange={e => setValues({ ...values, [key]: e.target.value })} aria-invalid={Boolean(errors[key])} aria-describedby={`event-${key}-hint`} className='rounded-md border px-3 py-2 w-full' style={{ background: 'var(--bg-dark)', borderColor: 'var(--border)' }} />
                    <p id={`event-${key}-hint`} className='text-xs break-all' style={{ color: 'var(--text-muted)' }}>Env default: {settings.defaults[key]}</p>
                    {key === 'slug' && <p className='text-xs' style={{ color: 'var(--gold)' }}>Changing the slug starts a fresh wall. Previous animals remain under their original slug.</p>}
                    {errors[key] && <p role='alert' className='text-sm text-red-400'>{errors[key]}</p>}
                  </div>
                ))}
                <button type='submit' disabled={busy} className='btn-primary justify-center disabled:opacity-50'>{busy ? 'Saving…' : 'Save'}</button>
                <button type='button' disabled={busy} className='btn-secondary justify-center disabled:opacity-50' onClick={() => void save(true)}>Reset to env defaults</button>
              </form>
            </CardContent>
          </Card>

          {/* Demo reset hint */}
          <div
            className='rounded-lg p-4 text-xs font-mono break-all'
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-muted)',
            }}
          >
            <span className='opacity-60'>To clear this event&apos;s wall, run </span>
            <code
              style={{ color: 'var(--gold)' }}
            >pnpm event:reset --yes</code>
            <span className='opacity-60'> in your terminal</span>
          </div>

          {/* Token Vault info */}
          <Card
            style={{
              background: 'var(--bg-card)',
              borderColor: 'var(--border)',
            }}
          >
            <CardHeader>
              <CardTitle
                className='text-lg tracking-wide'
                style={{
                  fontFamily: 'var(--font-bangers)',
                  color: 'var(--electric-purple)',
                }}
              >
                HOW IT WORKS
              </CardTitle>
            </CardHeader>
            <CardContent
              className='flex flex-col gap-3 text-sm'
              style={{ color: 'var(--text-muted)' }}
            >
              {[
                {
                  icon: '🔐',
                  text: 'Your GitHub token is stored once in Auth0 Token Vault — never in our database.',
                },
                {
                  icon: '🤖',
                  text: 'The agent retrieves it at post time to create a GitHub issue with your party animal.',
                },
                {
                  icon: '✋',
                  text: 'Human-in-the-loop: the bot only posts after the admin reviews your animal.',
                },
              ].map(({ icon, text }) => (
                <div key={text} className='flex items-start gap-3'>
                  <span className='text-lg'>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
