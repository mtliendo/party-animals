import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getEventConfig } from '@/lib/event'

const { session, read, write, clear } = vi.hoisted(() => ({ session: vi.fn(), read: vi.fn(), write: vi.fn(), clear: vi.fn() }))
vi.mock('@/lib/admin', () => ({ getAdminSession: session }))
vi.mock('@/lib/db', () => ({ readEventOverrides: read, writeEventOverrides: write, clearEventOverrides: clear }))
import { GET, PUT, DELETE } from './route'

function request(body?: unknown) {
  return new NextRequest('http://localhost/api/settings/event', body === undefined ? {} : { method: 'PUT', body: JSON.stringify(body) })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('DATABASE_URL', 'postgresql://unused')
  session.mockResolvedValue({ user: {} })
  read.mockResolvedValue({})
  write.mockResolvedValue(undefined)
  clear.mockResolvedValue(undefined)
})

describe('admin event settings API', () => {
  it.each([GET, PUT, DELETE])('requires an admin before touching the database', async handler => {
    session.mockResolvedValue(null)
    const req = request({ name: 'Saved' })
    expect((await handler(req)).status).toBe(401)
    expect(session).toHaveBeenCalledWith(req)
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
  })
  it('returns effective, overridden and env default values', async () => {
    read.mockResolvedValue({ host: 'Saved' })
    const res = await GET(request())
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ effective: { host: 'Saved' }, overrides: { host: 'Saved' }, defaults: getEventConfig() })
  })
  it('saves only trimmed overrides', async () => {
    const res = await PUT(request({ name: ' Saved ', slug: '' }))
    expect(res.status).toBe(200)
    expect(write).toHaveBeenCalledWith({ name: 'Saved' })
  })
  it('allows an empty override object and clears settings', async () => {
    expect((await PUT(request({}))).status).toBe(200)
    expect(write).toHaveBeenCalledWith({})
    expect((await DELETE(request())).status).toBe(200)
    expect(clear).toHaveBeenCalledOnce()
  })
  it('returns field errors for invalid input', async () => {
    const res = await PUT(request({ slug: 'Bad Slug', siteUrl: 'ftp://example.com' }))
    expect(res.status).toBe(400)
    expect((await res.json()).errors).toHaveProperty('slug')
    expect(write).not.toHaveBeenCalled()
  })
  it('rejects malformed JSON', async () => {
    const res = await PUT(new NextRequest('http://localhost/api/settings/event', { method: 'PUT', body: '{' }))
    expect(res.status).toBe(400)
    expect((await res.json()).errors).toHaveProperty('body')
  })
  it('reports write and reset failures', async () => {
    write.mockRejectedValueOnce(new Error('offline'))
    clear.mockRejectedValueOnce(new Error('offline'))
    expect((await PUT(request({}))).status).toBe(500)
    expect((await DELETE(request())).status).toBe(500)
  })
})
