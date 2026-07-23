import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Legacy column names: x_handle stores the attendee's display name,
// tweet_id stores the Box folder URL.
export type Animal = {
  id: string
  handle: string
  image_url: string | null
  video_url: string | null
  title: string | null
  description: string | null
  status: 'pending' | 'approved' | 'posted'
  box_url: string | null
  created_at: string
}

export async function getAllAnimals(): Promise<Animal[]> {
  const rows = await sql`
    SELECT id, x_handle AS handle, image_url, video_url, title, description, status,
           tweet_id AS box_url, created_at
    FROM animals ORDER BY created_at DESC
  `
  return rows as Animal[]
}

export async function createAnimal(data: {
  handle: string
  image_url?: string
}): Promise<Animal> {
  const rows = await sql`
    INSERT INTO animals (x_handle, image_url)
    VALUES (${data.handle}, ${data.image_url ?? null})
    RETURNING id, x_handle AS handle, image_url, video_url, title, description, status,
              tweet_id AS box_url, created_at
  `
  return rows[0] as Animal
}

export async function updateAnimal(
  id: string,
  data: Partial<
    Pick<Animal, 'video_url' | 'status' | 'box_url' | 'image_url' | 'title' | 'description'>
  >
): Promise<Animal> {
  const rows = await sql`
    UPDATE animals
    SET
      video_url   = COALESCE(${data.video_url ?? null}, video_url),
      status      = COALESCE(${data.status ?? null}, status),
      tweet_id    = COALESCE(${data.box_url ?? null}, tweet_id),
      image_url   = COALESCE(${data.image_url ?? null}, image_url),
      title       = COALESCE(${data.title ?? null}, title),
      description = COALESCE(${data.description ?? null}, description)
    WHERE id = ${id}
    RETURNING id, x_handle AS handle, image_url, video_url, title, description, status,
              tweet_id AS box_url, created_at
  `
  return rows[0] as Animal
}

export async function getAnimalById(id: string): Promise<Animal | null> {
  const rows = await sql`
    SELECT id, x_handle AS handle, image_url, video_url, title, description, status,
           tweet_id AS box_url, created_at
    FROM animals WHERE id = ${id}
  `
  return (rows[0] as Animal) ?? null
}

export async function deleteAnimal(id: string): Promise<void> {
  await sql`DELETE FROM animals WHERE id = ${id}`
}

export { sql }
