import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { createAnimal, getAllAnimals, updateAnimal } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { auth0 } from '@/lib/auth0'
import { saveAnimalToBox } from '@/lib/box-post'
import { analyzeAnimalImage } from '@/lib/analyze-image'

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
    const session = await auth0.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const imageFile = formData.get('image') as File | null

    if (!imageFile) {
      return NextResponse.json({ error: 'Missing image' }, { status: 400 })
    }

    // Attribution comes from the logged-in Auth0 user — no free-text handle
    const handle =
      (session.user.name as string | undefined) ??
      (session.user.nickname as string | undefined) ??
      (session.user.email as string | undefined) ??
      'Party Animal'

    // 1. Upload original drawing to Vercel Blob
    const imageId = uuidv4()
    const imageBuffer = await imageFile.arrayBuffer()
    const imageBlob = await put(`animals/${imageId}/drawing.png`, imageBuffer, {
      access: 'public',
      token: process.env.PARTY_ANIMAL_BLOB_READ_WRITE_TOKEN,
      contentType: 'image/png',
    })

    // 2. Save initial record to DB
    const animal = await createAnimal({
      handle,
      image_url: imageBlob.url,
    })

    // 3. Grab the Box token from Auth0 Token Vault while the session is active.
    //    If the user hasn't connected Box, we simply skip the Box share later.
    let boxToken: string | null = null
    try {
      const { token } = await auth0.getAccessTokenForConnection({
        connection: 'box',
      })
      boxToken = token
    } catch {
      console.info(
        '[POST /api/animals] Box not connected — skipping Box save for',
        animal.id,
      )
    }

    // 4. Kick off the async pipeline (don't await — respond fast)
    void runPipeline(animal.id, imageBlob.url, boxToken).catch((err) =>
      console.error('[runPipeline]', err),
    )

    return NextResponse.json(animal, { status: 201 })
  } catch (err) {
    console.error('[POST /api/animals]', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}

async function runPipeline(
  animalId: string,
  imageUrl: string,
  boxToken: string | null,
) {
  // Claude describes the drawing while Grok animates it — run both in parallel.
  const [, videoUrl] = await Promise.all([
    describeImage(animalId, imageUrl),
    generateAndSaveVideo(animalId, imageUrl),
  ])

  // Share to Box only if the user connected their account.
  if (!boxToken) return

  try {
    const { folderUrl } = await saveAnimalToBox({
      token: boxToken,
      animalId,
      imageUrl,
      videoUrl: videoUrl ?? undefined,
    })
    await updateAnimal(animalId, { status: 'posted', box_url: folderUrl })
  } catch (err) {
    console.error('[runPipeline] saveAnimalToBox failed:', err)
  }
}

async function describeImage(animalId: string, imageUrl: string) {
  try {
    const { title, description } = await analyzeAnimalImage(imageUrl)
    await updateAnimal(animalId, { title, description })
  } catch (err) {
    // Non-fatal — the wall just falls back to showing the handle.
    console.error('[describeImage] Claude analysis failed:', err)
  }
}

async function generateAndSaveVideo(
  animalId: string,
  imageUrl: string,
): Promise<string | null> {
  const xaiBase = 'https://api.x.ai/v1'
  const apiKey = process.env.XAI_API_KEY!

  // Fetch the image from Vercel Blob and convert to base64 data URL
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`)
  const imgBuffer = await imgRes.arrayBuffer()
  const base64 = Buffer.from(imgBuffer).toString('base64')
  const mimeType = imgRes.headers.get('content-type') ?? 'image/png'
  const dataUrl = `data:${mimeType};base64,${base64}`

  // Initiate video generation
  const initRes = await fetch(`${xaiBase}/videos/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'grok-imagine-video',
      prompt:
        'Animate this party animal drawing — make it fun and bouncy but keep many of the details of the drawing. If the drawing includes text, use that as additional context for the animation but do not include that text in the resulting video.',
      duration: 5,
      resolution: '480p',
      image: { url: dataUrl },
    }),
  })

  if (!initRes.ok) {
    const text = await initRes.text()
    throw new Error(`Video generation init failed: ${initRes.status} ${text}`)
  }

  const initData = await initRes.json()

  // x.ai returns request_id for polling
  const requestId: string = initData.request_id
  if (!requestId) {
    throw new Error(
      `No request_id returned from video API: ${JSON.stringify(initData)}`,
    )
  }

  // Poll until complete (max 3 min, every 5s)
  let videoUrl: string | null = null
  const maxAttempts = 36

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000)

    const pollRes = await fetch(`${xaiBase}/videos/${requestId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })

    if (!pollRes.ok) continue

    const pollData = await pollRes.json()
    const status: string = pollData.status ?? pollData.state ?? 'processing'

    if (status === 'done') {
      videoUrl = pollData.video?.url ?? pollData.video_url ?? pollData.url
      break
    }

    if (status === 'failed' || status === 'error') {
      throw new Error(`Video generation failed: ${JSON.stringify(pollData)}`)
    }
  }

  if (!videoUrl) {
    throw new Error('Video generation timed out')
  }

  // Download video and re-upload to Vercel Blob
  const videoRes = await fetch(videoUrl)
  if (!videoRes.ok) throw new Error('Failed to download generated video')

  const videoBuffer = await videoRes.arrayBuffer()
  const stored = await put(`animals/${animalId}/video.mp4`, videoBuffer, {
    access: 'public',
    token: process.env.PARTY_ANIMAL_BLOB_READ_WRITE_TOKEN,
    contentType: 'video/mp4',
  })

  // Update DB record
  await updateAnimal(animalId, { video_url: stored.url, status: 'approved' })

  return stored.url
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
