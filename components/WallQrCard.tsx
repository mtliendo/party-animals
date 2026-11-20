'use client'

import { useEvent } from '@/components/EventProvider'

export function WallQrCard({ qrSvg }: { qrSvg: string }) {
  const { drawUrl } = useEvent()
  return (
    <a
      href={drawUrl}
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
