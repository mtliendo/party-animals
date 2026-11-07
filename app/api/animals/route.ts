import { after, NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { createAnimal, getAllAnimals } from '@/lib/db'
import { generateAndSaveVideo } from '@/lib/video'
import { v4 as uuidv4 } from 'uuid'

export const maxDuration = 300
export const runtime = 'nodejs'

export async function GET() {
  try {
    const animals = await getAllAnimals()
    return NextResponse.json(animals)
  } catch (err) {
    console.error('[GET /api/animals]', err)
    return NextResponse.json(
      { error: 'Failed to fetch animals' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null
    const githubHandle = formData.get('githubHandle') as string | null

    if (!imageFile || !githubHandle?.trim()) {
      return NextResponse.json(
        { error: 'Missing image or GitHub handle' },
        { status: 400 },
      )
    }

    const imageId = uuidv4()
    const imageBuffer = await imageFile.arrayBuffer()
    const imageBlob = await put(`animals/${imageId}/drawing.png`, imageBuffer, {
      access: 'public',
      token: process.env.PARTY_ANIMAL_BLOB_READ_WRITE_TOKEN,
      contentType: 'image/png',
    })

    const handle = githubHandle.trim().replace(/^@/, '')
    const animal = await createAnimal({
      github_handle: `@${handle}`,
      image_url: imageBlob.url,
    })

    const imageBytes = imageBuffer.slice(0)
    after(() =>
      generateAndSaveVideo({
        animalId: animal.id,
        imageUrl: imageBlob.url,
        imageBytes,
      }).catch((err) => {
        console.error('[generateAndSaveVideo]', animal.id, err)
      }),
    )

    return NextResponse.json(animal, { status: 201 })
  } catch (err) {
    console.error('[POST /api/animals]', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}
