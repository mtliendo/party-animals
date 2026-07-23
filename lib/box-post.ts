const BOX_API = 'https://api.box.com/2.0'
const BOX_UPLOAD_API = 'https://upload.box.com/api/2.0'
const FOLDER_NAME = process.env.BOX_FOLDER_NAME ?? 'Party Animals'

type BoxFolder = { id: string; name: string }

/**
 * Find or create the "Party Animals" folder in the user's Box root.
 * Box returns a 409 with the conflicting folder id if it already exists.
 */
async function ensurePartyAnimalsFolder(token: string): Promise<BoxFolder> {
  const res = await fetch(`${BOX_API}/folders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: FOLDER_NAME, parent: { id: '0' } }),
  })

  if (res.status === 201) {
    const folder = await res.json()
    return { id: folder.id, name: folder.name }
  }

  if (res.status === 409) {
    const err = await res.json()
    const existing = err?.context_info?.conflicts?.[0]
    if (existing?.id) {
      return { id: existing.id, name: existing.name }
    }
  }

  const text = await res.text()
  throw new Error(`Failed to create Box folder: ${res.status} ${text}`)
}

/**
 * Upload a file (fetched from a URL) into a Box folder.
 * If a file with the same name exists, uploads a new version instead.
 */
async function uploadUrlToBox(
  token: string,
  folderId: string,
  fileName: string,
  sourceUrl: string,
  contentType: string,
): Promise<{ id: string }> {
  const sourceRes = await fetch(sourceUrl)
  if (!sourceRes.ok) {
    throw new Error(`Failed to fetch ${fileName} from storage: ${sourceRes.status}`)
  }
  const blob = new Blob([await sourceRes.arrayBuffer()], { type: contentType })

  const form = new FormData()
  form.append(
    'attributes',
    JSON.stringify({ name: fileName, parent: { id: folderId } }),
  )
  form.append('file', blob, fileName)

  const res = await fetch(`${BOX_UPLOAD_API}/files/content`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })

  if (res.status === 201) {
    const data = await res.json()
    return { id: data.entries[0].id }
  }

  // Name conflict — upload as a new version of the existing file
  if (res.status === 409) {
    const err = await res.json()
    const existingId = err?.context_info?.conflicts?.id
    if (existingId) {
      const versionForm = new FormData()
      versionForm.append('attributes', JSON.stringify({ name: fileName }))
      versionForm.append('file', blob, fileName)
      const versionRes = await fetch(
        `${BOX_UPLOAD_API}/files/${existingId}/content`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: versionForm,
        },
      )
      if (versionRes.ok) return { id: existingId }
    }
  }

  const text = await res.text()
  throw new Error(`Box upload failed for ${fileName}: ${res.status} ${text}`)
}

export type BoxSaveInput = {
  token: string
  animalId: string
  imageUrl: string
  videoUrl?: string
}

/**
 * Save a party animal's drawing + animation into the user's Box account
 * under a "Party Animals" folder. Returns the folder's web URL.
 */
export async function saveAnimalToBox(
  input: BoxSaveInput,
): Promise<{ folderId: string; folderUrl: string }> {
  const folder = await ensurePartyAnimalsFolder(input.token)

  await uploadUrlToBox(
    input.token,
    folder.id,
    `party-animal-${input.animalId}-drawing.png`,
    input.imageUrl,
    'image/png',
  )

  if (input.videoUrl) {
    await uploadUrlToBox(
      input.token,
      folder.id,
      `party-animal-${input.animalId}-animation.mp4`,
      input.videoUrl,
      'video/mp4',
    )
  }

  return {
    folderId: folder.id,
    folderUrl: `https://app.box.com/folder/${folder.id}`,
  }
}
