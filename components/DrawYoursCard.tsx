'use client'

import { DrawingPreview } from '@/app/DrawingPreview'
import { DRAW_ENTRY_URL } from '@/lib/draw-entry'

export function DrawYoursCard() {
  return (
    <a
      href={DRAW_ENTRY_URL}
      className='card draw-yours-card flex flex-col'
      aria-label='Draw your animal'
    >
      <div className='relative w-full aspect-square overflow-hidden'>
        <DrawingPreview compact />
      </div>
      <div className='p-4 flex items-center justify-center'>
        <p className='draw-yours-caption'>Draw your animal</p>
      </div>
    </a>
  )
}
