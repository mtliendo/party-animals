'use client'

import { DrawingPreview } from '@/app/DrawingPreview'
import { DRAW_ENTRY_URL } from '@/lib/draw-entry'

export function DrawYoursCard({ qrSvg }: { qrSvg: string }) {
  return (
    <a
      href={DRAW_ENTRY_URL}
      className='card draw-yours-card flex flex-col'
      aria-label='Scan to draw your animal'
    >
      <div className='relative w-full aspect-square overflow-hidden flex flex-col'>
        <div className='draw-yours-sketch'>
          <DrawingPreview compact />
        </div>
        <div className='draw-yours-qr'>
          <div
            className='draw-yours-qr-code'
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </div>
      </div>
      <div className='p-4 flex items-center justify-center'>
        <p className='draw-yours-caption'>Scan to draw your animal</p>
      </div>
    </a>
  )
}
