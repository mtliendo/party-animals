import { NextRequest, NextResponse } from 'next/server'
import { auth0 } from '@/lib/auth0'
import { getAdminSession } from '@/lib/admin'
import { getAnimalById, updateAnimal } from '@/lib/db'
import { createAnimalIssue } from '@/lib/github-post'

export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await ctx.params
    const animal = await getAnimalById(id)

    if (!animal) {
      return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    }
    if (!animal.image_url && !animal.video_url) {
      return NextResponse.json(
        { error: 'Nothing to post yet' },
        { status: 422 },
      )
    }

    let token: string
    try {
      ;({ token } = await auth0.getAccessTokenForConnection({
        connection: 'github',
      }))
    } catch (err) {
      console.error('[post-to-github] Token Vault miss', err)
      return NextResponse.json(
        { error: 'Connect GitHub in Settings first' },
        { status: 409 },
      )
    }

    const issue = await createAnimalIssue({
      token,
      githubHandle: animal.github_handle,
      imageUrl: animal.image_url ?? undefined,
      videoUrl: animal.video_url ?? undefined,
    })

    await updateAnimal(id, { status: 'posted', issue_url: issue.url })

    return NextResponse.json({ issueUrl: issue.url })
  } catch (err) {
    console.error('[POST /api/animals/[id]/post-to-github]', err)
    return NextResponse.json(
      { error: 'Failed to post to GitHub' },
      { status: 500 },
    )
  }
}
