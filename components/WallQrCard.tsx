'use client'

import { DRAW_ENTRY_URL } from '@/lib/draw-entry'

export function WallQrCard({ qrSvg }: { qrSvg: string }) {
  return (
    <a
      href={DRAW_ENTRY_URL}
      className='wall-qr-card'
      aria-label='Scan to draw your animal'
    >
      <div className='wall-qr-face'>
        <div
          className='wall-qr-code'
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      </div>
      <p className='wall-qr-caption'>Scan to draw your animal</p>
    </a>
  )
}
