import { neon } from '@neondatabase/serverless'
import { event } from './event'

function database() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
  return neon(process.env.DATABASE_URL)
}

let schema: Promise<void> | undefined
export function ensureSchema(): Promise<void> {
  schema ??= (async () => {
    const sql = database()
    await sql`
      CREATE TABLE IF NOT EXISTS animals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        x_handle text NOT NULL,
        image_url text,
        video_url text,
        status text NOT NULL DEFAULT 'pending',
        tweet_id text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `
    await sql`ALTER TABLE animals ADD COLUMN IF NOT EXISTS event_slug text NOT NULL DEFAULT 'ai-world-fair-2026'`
    await sql`CREATE INDEX IF NOT EXISTS animals_event_created_at_idx ON animals (event_slug, created_at)`
  })().catch((error) => {
    schema = undefined
    throw error
  })
  return schema
}

async function scopedDatabase() {
  await ensureSchema()
  return database()
}

export type Animal = {
  id: string
  github_handle: string
  image_url: string | null
  video_url: string | null
  status: 'pending' | 'approved' | 'posted'
  issue_url: string | null
  created_at: string
}

export async function getAllAnimals(): Promise<Animal[]> {
  const sql = await scopedDatabase()
  const rows = await sql`
    SELECT id, x_handle AS github_handle, image_url, video_url, status,
           tweet_id AS issue_url, created_at
    FROM animals WHERE event_slug = ${event.slug} ORDER BY created_at DESC
  `
  return rows as Animal[]
}

export async function createAnimal(data: {
  github_handle: string
  image_url?: string
}): Promise<Animal> {
  const sql = await scopedDatabase()
  const rows = await sql`
    INSERT INTO animals (x_handle, image_url, event_slug)
    VALUES (${data.github_handle}, ${data.image_url ?? null}, ${event.slug})
    RETURNING id, x_handle AS github_handle, image_url, video_url, status,
              tweet_id AS issue_url, created_at
  `
  return rows[0] as Animal
}

export async function updateAnimal(
  id: string,
  data: Partial<Pick<Animal, 'video_url' | 'status' | 'issue_url' | 'image_url'>>
): Promise<Animal> {
  const sql = await scopedDatabase()
  const rows = await sql`
    UPDATE animals
    SET
      video_url  = COALESCE(${data.video_url ?? null}, video_url),
      status     = COALESCE(${data.status ?? null}, status),
      tweet_id   = COALESCE(${data.issue_url ?? null}, tweet_id),
      image_url  = COALESCE(${data.image_url ?? null}, image_url)
    WHERE id = ${id} AND event_slug = ${event.slug}
    RETURNING id, x_handle AS github_handle, image_url, video_url, status,
              tweet_id AS issue_url, created_at
  `
  return rows[0] as Animal
}

export async function getAnimalById(id: string): Promise<Animal | null> {
  const sql = await scopedDatabase()
  const rows = await sql`
    SELECT id, x_handle AS github_handle, image_url, video_url, status,
           tweet_id AS issue_url, created_at
    FROM animals WHERE id = ${id} AND event_slug = ${event.slug}
  `
  return (rows[0] as Animal) ?? null
}

export async function deleteAnimal(id: string): Promise<void> {
  const sql = await scopedDatabase()
  await sql`DELETE FROM animals WHERE id = ${id} AND event_slug = ${event.slug}`
}

export async function resetEvent(): Promise<number> {
  const sql = await scopedDatabase()
  const rows = await sql`DELETE FROM animals WHERE event_slug = ${event.slug} RETURNING id`
  return rows.length
}
