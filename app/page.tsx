import Link from 'next/link'
import { getSessionFlags } from '@/lib/admin'

export default async function Home() {
  const { isAdmin } = await getSessionFlags()

  return (
    <div
      className='min-h-screen flex flex-col'
      style={{ background: 'var(--bg-dark)' }}
    >
      {/* Nav */}
      <nav
        className='flex items-center justify-between px-6 py-4 border-b'
        style={{ borderColor: 'var(--border)' }}
      >
        <span
          className='text-2xl tracking-wider'
          style={{
            fontFamily: 'var(--font-bangers)',
            color: 'var(--hot-pink)',
          }}
        >
          PARTY ANIMALS
        </span>
        <div className='flex items-center gap-4'>
          <Link
            href='/wall'
            className='text-sm hover:text-white transition-colors'
            style={{ color: 'var(--text-muted)' }}
          >
            The Wall
          </Link>
          <Link href='/draw' className='btn-primary text-sm py-2 px-5'>
            Draw
          </Link>
          {isAdmin ? (
            <>
              <Link
                href='/settings'
                className='text-sm hover:text-white transition-colors'
                style={{ color: 'var(--text-muted)' }}
              >
                Settings
              </Link>
              <Link
                href='/auth/logout'
                className='text-sm hover:text-white transition-colors'
                style={{ color: 'var(--text-muted)' }}
              >
                Logout
              </Link>
            </>
          ) : (
            <Link
              href='/auth/login?returnTo=/settings'
              className='text-sm hover:text-white transition-colors'
              style={{ color: 'var(--text-muted)' }}
            >
              Admin
            </Link>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className='flex-1 flex flex-col items-center justify-center text-center px-6 py-24 relative overflow-hidden'>
        {/* Background grid/glow */}
        <div
          className='absolute inset-0 pointer-events-none'
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 50% 0%, rgba(176,38,255,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(255,45,120,0.12) 0%, transparent 50%), radial-gradient(ellipse at 20% 70%, rgba(0,240,255,0.08) 0%, transparent 50%)',
          }}
        />

        <div className='relative z-10 max-w-4xl mx-auto'>
          {/* Badge */}
          <div
            className='inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-8'
            style={{
              background: 'rgba(255,45,120,0.12)',
              border: '1px solid rgba(255,45,120,0.3)',
              color: 'var(--hot-pink)',
            }}
          >
            <span className='w-1.5 h-1.5 rounded-full bg-current animate-pulse' />
            AI World Fair 2026
          </div>

          {/* Headline */}
          <h1
            className='text-7xl sm:text-8xl md:text-9xl mb-6 leading-none tracking-wide'
            style={{ fontFamily: 'var(--font-bangers)' }}
          >
            <span className='gradient-text glow-pink'>Auth0</span>
            <br />
            <span style={{ color: 'var(--neon-cyan)' }} className='glow-cyan'>
              PARTY ANIMALS
            </span>
          </h1>

          <p
            className='text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed'
            style={{ color: 'var(--text-muted)' }}
          >
            Draw your wildest creature. AI animates it into a video. Your animal
            joins the wall — and gets posted to the{' '}
            <span style={{ color: 'var(--hot-pink)' }}>GitHub gallery</span> by
            an AI agent. <br />
            <span style={{ color: 'var(--gold)' }}>Auth0 Token Vault</span>{' '}
            helps finally say goodbye to long-lived credentials in your agents!
          </p>

          <div className='flex flex-col sm:flex-row gap-4 justify-center'>
            <Link href='/draw' className='btn-primary text-xl px-10 py-4'>
              Draw Your Animal 🎨
            </Link>
            <Link href='/wall' className='btn-secondary text-xl px-10 py-4'>
              See The Wall 🐾
            </Link>
          </div>
        </div>
      </main>

      {/* How it works */}
      <section className='px-6 py-20 max-w-6xl mx-auto w-full'>
        <h2
          className='text-4xl sm:text-5xl text-center mb-16 tracking-wide gradient-text'
          style={{ fontFamily: 'var(--font-bangers)' }}
        >
          HOW IT WORKS
        </h2>
        <div className='grid grid-cols-1 sm:grid-cols-3 gap-8'>
          {[
            {
              step: '01',
              icon: '✏️',
              title: 'Draw',
              desc: 'Sketch your party animal on the canvas. Get weird with it.',
              color: 'var(--hot-pink)',
            },
            {
              step: '02',
              icon: '🤖',
              title: 'AI Animates',
              desc: 'Grok transforms your drawing into a short animated video.',
              color: 'var(--electric-purple)',
            },
            {
              step: '03',
              icon: '🐾',
              title: 'Hit the Wall',
              desc: 'Your animal goes live on the wall. The admin can post it to the GitHub gallery.',
              color: 'var(--neon-cyan)',
            },
          ].map(({ step, icon, title, desc, color }) => (
            <div key={step} className='card p-8 text-center'>
              <div
                className='text-xs font-bold tracking-widest mb-4 uppercase'
                style={{ color }}
              >
                STEP {step}
              </div>
              <div className='text-5xl mb-4'>{icon}</div>
              <h3
                className='text-2xl mb-3 tracking-wide'
                style={{ fontFamily: 'var(--font-bangers)', color }}
              >
                {title}
              </h3>
              <p
                className='text-sm leading-relaxed'
                style={{ color: 'var(--text-muted)' }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        className='text-center py-8 text-xs border-t'
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        Powered by{' '}
        <span style={{ color: 'var(--hot-pink)' }}>Auth0 Token Vault</span> ·{' '}
        <span style={{ color: 'var(--neon-cyan)' }}>Grok AI</span> ·{' '}
        <span style={{ color: 'var(--electric-purple)' }}>Vercel</span>
      </footer>
    </div>
  )
}
