import { after, NextResponse } from 'next/server'
import { getAnimalById } from '@/lib/db'
import { generateAndSaveVideo } from '@/lib/video'

export const maxDuration = 300
export const runtime = 'nodejs'

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params
    const animal = await getAnimalById(id)

    if (!animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }

    if (animal.video_url) {
      return NextResponse.json({
        status: 'already-done',
        videoUrl: animal.video_url,
      })
    }

    if (!animal.image_url) {
      return NextResponse.json(
        { error: 'No drawing to animate' },
        { status: 422 },
      )
    }

    after(() =>
      generateAndSaveVideo({
        animalId: animal.id,
        imageUrl: animal.image_url!,
      }).catch((err) => {
        console.error('[POST /api/animals/[id]/generate]', animal.id, err)
      }),
    )

    return NextResponse.json({ status: 'started' }, { status: 202 })
  } catch (err) {
    console.error('[POST /api/animals/[id]/generate]', err)
    return NextResponse.json(
      { error: 'Failed to start video generation' },
      { status: 500 },
    )
  }
}
