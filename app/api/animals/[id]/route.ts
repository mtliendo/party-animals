import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin'
import { deleteAnimal } from '@/lib/db'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getAdminSession(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    await deleteAnimal(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/animals/[id]]', err)
    return NextResponse.json(
      { error: 'Failed to delete animal' },
      { status: 500 },
    )
  }
}
