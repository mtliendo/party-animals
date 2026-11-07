import { put } from '@vercel/blob'
import { getAnimalById, updateAnimal } from '@/lib/db'

const XAI_BASE = 'https://api.x.ai/v1'
const VIDEO_PROMPT =
  'Animate this party animal drawing — make it fun and bouncy but keep many of the details of the drawing. If the drawing includes text, use that as additional context for the animation but do not include that text in the resulting video.'

const inflight = new Set<string>()

export type GenerateResult =
  | { status: 'done'; videoUrl: string }
  | { status: 'already-done'; videoUrl: string }
  | { status: 'already-running' }
  | { status: 'not-found' }

export async function generateAndSaveVideo(opts: {
  animalId: string
  imageUrl: string
  imageBytes?: ArrayBuffer | Uint8Array
}): Promise<GenerateResult> {
  if (inflight.has(opts.animalId)) {
    console.log('[generateAndSaveVideo] already running', opts.animalId)
    return { status: 'already-running' }
  }

  inflight.add(opts.animalId)
  try {
    const existing = await getAnimalById(opts.animalId)
    if (!existing) return { status: 'not-found' }
    if (existing.video_url) {
      return { status: 'already-done', videoUrl: existing.video_url }
    }

    const apiKey = process.env.XAI_API_KEY
    if (!apiKey) throw new Error('XAI_API_KEY is not set')

    const dataUrl = await toDataUrl(opts.imageUrl, opts.imageBytes)
    const requestId = await startVideoGeneration(apiKey, dataUrl)
    const remoteVideoUrl = await pollForVideo(apiKey, requestId)

    const videoRes = await fetchWithRetry(remoteVideoUrl)
    if (!videoRes.ok) {
      throw new Error(`Failed to download generated video: ${videoRes.status}`)
    }

    const videoBuffer = await videoRes.arrayBuffer()
    const stored = await put(`animals/${opts.animalId}/video.mp4`, videoBuffer, {
      access: 'public',
      token: process.env.PARTY_ANIMAL_BLOB_READ_WRITE_TOKEN,
      contentType: 'video/mp4',
    })

    await updateAnimal(opts.animalId, {
      video_url: stored.url,
      status: 'approved',
    })

    console.log('[generateAndSaveVideo] saved', { animalId: opts.animalId })
    return { status: 'done', videoUrl: stored.url }
  } finally {
    inflight.delete(opts.animalId)
  }
}

async function toDataUrl(
  imageUrl: string,
  imageBytes?: ArrayBuffer | Uint8Array,
): Promise<string> {
  if (imageBytes && imageBytes.byteLength > 0) {
    const buf = Buffer.from(new Uint8Array(imageBytes))
    return `data:image/png;base64,${buf.toString('base64')}`
  }

  const res = await fetchWithRetry(imageUrl)
  if (!res.ok) {
    throw new Error(`Failed to fetch drawing: ${res.status}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const mimeType = res.headers.get('content-type') ?? 'image/png'
  return `data:${mimeType};base64,${buf.toString('base64')}`
}

async function startVideoGeneration(
  apiKey: string,
  dataUrl: string,
): Promise<string> {
  const models = unique([
    process.env.XAI_VIDEO_MODEL,
    'grok-imagine-video',
    'grok-imagine-video-1.5',
  ])

  let lastError = 'Video generation init failed'

  for (const model of models) {
    const res = await fetchWithRetry(`${XAI_BASE}/videos/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt: VIDEO_PROMPT,
        duration: 5,
        resolution: '480p',
        image: { url: dataUrl },
      }),
    })

    const text = await res.text()
    if (!res.ok) {
      lastError = `Video generation init failed: ${res.status} ${text.slice(0, 400)}`
      console.warn('[generateAndSaveVideo] init rejected', {
        model,
        status: res.status,
      })
      continue
    }

    let data: { request_id?: string }
    try {
      data = JSON.parse(text) as { request_id?: string }
    } catch {
      lastError = `Video generation init returned non-JSON: ${text.slice(0, 200)}`
      continue
    }

    if (!data.request_id) {
      lastError = `No request_id returned from video API: ${text.slice(0, 400)}`
      continue
    }

    console.log('[generateAndSaveVideo] started', { model })
    return data.request_id
  }

  throw new Error(lastError)
}

async function pollForVideo(apiKey: string, requestId: string): Promise<string> {
  const maxAttempts = 60

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(5000)

    const pollRes = await fetch(`${XAI_BASE}/videos/${requestId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    }).catch((err: unknown) => {
      console.warn('[generateAndSaveVideo] poll fetch failed', {
        attempt: i + 1,
        err: err instanceof Error ? err.message : 'unknown',
      })
      return null
    })

    if (!pollRes?.ok) continue

    const pollData = (await pollRes.json()) as {
      status?: string
      state?: string
      video?: { url?: string }
      video_url?: string
      url?: string
    }
    const status = pollData.status ?? pollData.state ?? 'processing'

    if (status === 'done') {
      const videoUrl =
        pollData.video?.url ?? pollData.video_url ?? pollData.url ?? null
      if (!videoUrl) {
        throw new Error('Video generation finished without a URL')
      }
      console.log('[generateAndSaveVideo] ready', {
        requestId,
        attempts: i + 1,
      })
      return videoUrl
    }

    if (status === 'failed' || status === 'error' || status === 'expired') {
      throw new Error(`Video generation ${status}`)
    }
  }

  throw new Error('Video generation timed out')
}

async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  attempts = 4,
): Promise<Response> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, init)
      if (res.ok || (res.status >= 400 && res.status < 500)) return res
      lastError = new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastError = err
    }
    await sleep(500 * 2 ** i)
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('fetchWithRetry failed')
}

function unique(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])]
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
