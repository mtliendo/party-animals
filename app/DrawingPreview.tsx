'use client'

import { useEffect, useId, useRef } from 'react'

/**
 * Lightweight looping sketch of a party animal on an Excalidraw-like board.
 * No Excalidraw runtime — SVG + rAF only, so the homepage stays fast on phones
 * and projectors.
 */
export function DrawingPreview({ compact = false }: { compact?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const uid = useId().replace(/:/g, '')
  const dotsId = `excalidraw-dots-${uid}`
  const glowId = `alive-glow-${uid}`

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const paths = [...svg.querySelectorAll<SVGPathElement>('[data-draw]')]
    const pencil = svg.querySelector<SVGGElement>('[data-pencil]')
    const alive = svg.querySelector<SVGGElement>('[data-alive]')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    for (const path of paths) {
      const length = path.getTotalLength()
      path.style.strokeDasharray = `${length}`
      path.style.strokeDashoffset = reduce ? '0' : `${length}`
    }

    if (reduce) {
      if (pencil) pencil.style.opacity = '0'
      if (alive) alive.style.opacity = '1'
      return
    }

    let cancelled = false
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(resolve, ms)
        if (cancelled) window.clearTimeout(id)
      })

    function drawPath(path: SVGPathElement, duration: number) {
      const length = path.getTotalLength()
      const start = performance.now()
      return new Promise<void>((resolve) => {
        const tick = (now: number) => {
          if (cancelled) {
            resolve()
            return
          }
          const t = Math.min(1, (now - start) / duration)
          const eased = 1 - (1 - t) * (1 - t)
          path.style.strokeDashoffset = `${length * (1 - eased)}`
          const point = path.getPointAtLength(Math.max(0.1, length * eased))
          if (pencil) {
            pencil.style.opacity = '1'
            pencil.setAttribute('transform', `translate(${point.x} ${point.y})`)
          }
          if (t < 1) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })
    }

    async function loop() {
      while (!cancelled) {
        if (alive) alive.style.opacity = '0'
        for (const path of paths) {
          path.style.strokeDashoffset = `${path.getTotalLength()}`
        }
        await wait(350)
        for (const path of paths) {
          const duration = Math.min(1400, 380 + path.getTotalLength() * 1.6)
          await drawPath(path, duration)
          await wait(70)
        }
        if (pencil) pencil.style.opacity = '0'
        if (alive) alive.style.opacity = '1'
        await wait(2400)
      }
    }

    void loop()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <figure
      className={
        compact
          ? 'drawing-preview drawing-preview--tile'
          : 'drawing-preview w-full max-w-[28rem] mx-auto lg:mx-0'
      }
    >
      <div className='drawing-preview-frame'>
        <div className='drawing-preview-menubar'>
          <span className='drawing-preview-dots' aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className='drawing-preview-menu-label'>Canvas</span>
          <span className='drawing-preview-live'>DEMO</span>
        </div>

        <div className='drawing-preview-body'>
          <div className='drawing-preview-tools' aria-hidden>
            <span className='is-active'>✎</span>
            <span>○</span>
            <span>■</span>
            <span>→</span>
          </div>

          <svg
            ref={svgRef}
            viewBox='0 0 360 280'
            preserveAspectRatio={compact ? 'xMidYMid slice' : 'xMidYMid meet'}
            className='drawing-preview-svg'
            role='img'
            aria-label='Preview of a hand-drawn party animal being sketched, then coming to life'
          >
            <defs>
              <pattern
                id={dotsId}
                width='18'
                height='18'
                patternUnits='userSpaceOnUse'
              >
                <circle cx='1' cy='1' r='0.9' fill='#c9c9d6' />
              </pattern>
              <filter id={glowId} x='-20%' y='-20%' width='140%' height='140%'>
                <feGaussianBlur stdDeviation='2.4' result='blur' />
                <feMerge>
                  <feMergeNode in='blur' />
                  <feMergeNode in='SourceGraphic' />
                </feMerge>
              </filter>
            </defs>

            <rect width='360' height='280' fill='#f8f8f3' />
            <rect width='360' height='280' fill={`url(#${dotsId})`} />

            <g
              fill='none'
              stroke='#1e1e1e'
              strokeWidth='3.2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path
                data-draw
                d='M186 122c-58 2-94 42-90 84 4 46 44 70 92 68 54-2 92-28 90-72-2-48-36-82-92-80z'
              />
              <path data-draw d='M138 132c-10-46 22-58 30-8' />
              <path data-draw d='M228 128c16-52 52-38 24 6' />
              <path data-draw d='M276 198c38-14 56 28 30 48-16 12-24-8-14-18' />
              <path
                data-draw
                stroke='#ff2d78'
                d='M158 124h64M172 124 188 62 216 124'
              />
              <path data-draw stroke='#ff2d78' d='M182 58c0-8 12-8 12 0 0 6-12 6-12 0' />
              <path data-draw d='M164 176c4-8 16-8 20 2' />
              <path data-draw d='M200 174c4-8 16-7 20 3' />
              <path data-draw d='M184 186 190 194 178 194' />
              <path data-draw d='M168 204c14 14 34 14 48-2' />
              <path data-draw d='M148 188 116 178M150 198 118 206' />
              <path data-draw d='M228 186 260 176M226 198 258 208' />
            </g>

            <g data-alive className='drawing-preview-alive' opacity='0'>
              <g
                fill='none'
                stroke='#00f0ff'
                strokeWidth='1.6'
                strokeLinecap='round'
                opacity='0.9'
              >
                <path d='M74 86c8-10 18-12 22-4' />
                <path d='M70 98c12-4 20 2 16 10' />
                <path d='M292 72c10-8 22-4 18 8' />
                <path d='M300 92c8 8 4 16-6 14' />
              </g>
              <text
                x='180'
                y='34'
                textAnchor='middle'
                fill='#ff2d78'
                fontSize='13'
                fontFamily='var(--font-bangers), cursive'
                letterSpacing='1.5'
                filter={`url(#${glowId})`}
              >
                AI ANIMATES
              </text>
            </g>

            <g data-pencil className='drawing-preview-pencil' opacity='0'>
              <g transform='rotate(35)'>
                <rect x='2' y='-5' width='22' height='10' rx='1.5' fill='#ffd700' />
                <polygon points='24,-5 24,5 34,0' fill='#ff8c42' />
                <polygon points='32,-2.2 32,2.2 36,0' fill='#1e1e1e' />
                <rect x='-2' y='-5' width='5' height='10' rx='1' fill='#1e1e1e' />
              </g>
            </g>
          </svg>
        </div>
      </div>
      {!compact && (
        <figcaption>
          Sketch on the canvas. Grok turns it into a looping video.
        </figcaption>
      )}
    </figure>
  )
}
