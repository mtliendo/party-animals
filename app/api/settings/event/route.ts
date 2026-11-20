import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin'
import { validateEventOverrides } from '@/lib/event'
import { getEventSettings, saveEventOverrides, resetEventOverrides } from '@/lib/event-settings'

export async function GET(request: NextRequest) {
  if (!await getAdminSession(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await getEventSettings())
}

export async function PUT(request: NextRequest) {
  if (!await getAdminSession(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid settings', errors: { body: 'Invalid JSON' } }, { status: 400 })
  }
  const { overrides, errors } = validateEventOverrides(body)
  if (Object.keys(errors).length) return NextResponse.json({ error: 'Invalid settings', errors }, { status: 400 })
  try {
    await saveEventOverrides(overrides)
    return NextResponse.json(await getEventSettings())
  } catch {
    return NextResponse.json({ error: 'Unable to save settings' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!await getAdminSession(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await resetEventOverrides()
    return NextResponse.json(await getEventSettings())
  } catch {
    return NextResponse.json({ error: 'Unable to reset settings' }, { status: 500 })
  }
}
