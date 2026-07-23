'use client'

import Link from 'next/link'
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
  boxConnected,
  userId,
}: {
  user: User
  boxConnected: boolean
  userId: string
}) {
  return (
    <div
      className='min-h-screen flex flex-col'
      style={{ background: 'var(--bg-dark)' }}
    >
      {/* Nav */}
      <nav
        className='flex flex-wrap items-center justify-between gap-y-2 px-4 sm:px-6 py-4 border-b'
        style={{ borderColor: 'var(--border)' }}
      >
        <Link
          href='/'
          className='text-2xl tracking-wider hover:opacity-80 transition-opacity'
          style={{
            fontFamily: 'var(--font-bangers)',
            color: 'var(--hot-pink)',
          }}
        >
          PARTY ANIMALS
        </Link>
        <div className='flex items-center gap-3 sm:gap-4'>
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

      <main className='flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16'>
        <div className='w-full max-w-xl flex flex-col gap-6'>
          <div className='text-center mb-4'>
            <h1
              className='text-4xl sm:text-5xl tracking-wide mb-2'
              style={{ fontFamily: 'var(--font-bangers)' }}
            >
              <span className='gradient-text'>SETTINGS</span>
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Connect your Box account to keep a copy of your party animal in your own Box storage.
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

          {/* Box connection card */}
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
                  BOX ACCOUNT
                </CardTitle>
                {boxConnected ? (
                  <Badge
                    style={{
                      background: 'rgba(0,240,255,0.12)',
                      border: '1px solid rgba(0,240,255,0.3)',
                      color: 'var(--neon-cyan)',
                    }}
                  >
                    Connected
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
                {boxConnected
                  ? 'Your Box account is connected. When you unleash an animal, the drawing and animation are automatically saved to a "Party Animals" folder in your Box.'
                  : 'Connect Box and your party animal gets saved to your own Box account automatically. Skip it, and your animal still hits the wall — it just won\'t be saved to Box.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {boxConnected ? (
                <div className='flex flex-col gap-3'>
                  <div
                    className='rounded-lg p-4 text-sm'
                    style={{
                      background: 'rgba(0,240,255,0.05)',
                      border: '1px solid rgba(0,240,255,0.15)',
                      color: 'var(--neon-cyan)',
                    }}
                  >
                    Box credentials are securely stored in Auth0 Token Vault.
                    The agent fetches a short-lived token at save time — you never
                    share passwords.
                  </div>
                  <a
                    href='/auth/connect?connection=box&returnTo=/settings'
                    className='btn-secondary w-full justify-center text-center'
                  >
                    Reconnect Box
                  </a>
                </div>
              ) : (
                <a
                  href='/auth/connect?connection=box&returnTo=/settings'
                  className='btn-primary w-full justify-center'
                >
                  Connect Box Account
                </a>
              )}
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
            <span className='opacity-60'>demo purposes: to reset, run </span>
            <code
              style={{ color: 'var(--gold)' }}
            >{`auth0 users delete "${userId}" --force`}</code>
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
                  text: 'Your Box token is stored once in Auth0 Token Vault — never in our database.',
                },
                {
                  icon: '🤖',
                  text: 'The agent retrieves it at save time to drop your drawing + animation into your Box.',
                },
                {
                  icon: '🧠',
                  text: 'Claude looks at your drawing and writes the title + description you see on the wall.',
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
