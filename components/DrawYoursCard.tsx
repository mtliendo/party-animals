'use client'

import { DrawingPreview } from '@/app/DrawingPreview'
import { useEvent } from '@/components/EventProvider'

export function DrawYoursCard() {
  const { drawUrl } = useEvent()
  return (
    <a
      href={drawUrl}
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
