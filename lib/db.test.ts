import { beforeEach, describe, expect, it, vi } from 'vitest'

const { query, transaction, neon } = vi.hoisted(() => {
  const query = vi.fn()
  const transaction = vi.fn()
  return { query, transaction, neon: vi.fn(() => Object.assign(query, { transaction })) }
})
vi.mock('@neondatabase/serverless', () => ({ neon }))
vi.mock('./event-settings', () => ({ getEvent: async () => ({ slug: 'test-event' }) }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@localhost/unused')
  query.mockResolvedValue([])
  transaction.mockResolvedValue([])
})

function statements() {
  return query.mock.calls.map(([strings, ...values]) => ({ text: strings.join('?'), values }))
}

describe('event-scoped database', () => {
  it('shares an idempotent schema promise before the first queries', async () => {
    const db = await import('./db')
    await Promise.all([db.getAllAnimals(), db.getAllAnimals()])
    expect(transaction).toHaveBeenCalledTimes(1)
    expect(transaction.mock.calls[0][0]).toHaveLength(5)
    expect(statements()[0].text).toBe('SELECT pg_advisory_xact_lock(734291806)')
    expect(statements().filter((s) => s.text.includes('CREATE TABLE IF NOT EXISTS'))).toHaveLength(2)
    expect(statements()[2].text).toContain("ADD COLUMN IF NOT EXISTS event_slug text NOT NULL DEFAULT 'ai-world-fair-2026'")
    expect(statements()[3].text).toContain('(event_slug, created_at)')
    expect(statements()[4].text).toContain('CREATE TABLE IF NOT EXISTS app_settings')
    expect(statements().slice(5).every((s) => s.values.includes('test-event'))).toBe(true)
  })
  it('scopes inserts, reads, updates, deletes and resets', async () => {
    const db = await import('./db')
    await db.ensureSchema()
    query.mockClear()
    query.mockResolvedValue([{ id: 'one' }])
    await db.createAnimal({ github_handle: 'guest' })
    await db.getAllAnimals()
    await db.getAnimalById('one')
    await db.updateAnimal('one', { status: 'posted' })
    await db.deleteAnimal('one')
    expect(await db.resetEvent()).toBe(1)
    const calls = statements()
    expect(calls).toHaveLength(6)
    expect(calls.every((s) => s.values.includes('test-event'))).toBe(true)
    expect(calls[0].text).toContain('(x_handle, image_url, event_slug)')
    expect(calls.slice(1).every((s) => s.text.includes('event_slug = ?'))).toBe(true)
  })
  it('handles empty results without leaking another event', async () => {
    const db = await import('./db')
    expect(await db.getAllAnimals()).toEqual([])
    expect(await db.getAnimalById('absent')).toBeNull()
    expect(await db.resetEvent()).toBe(0)
  })
  it('propagates schema errors and allows retry', async () => {
    const db = await import('./db')
    transaction.mockRejectedValueOnce(new Error('offline'))
    await expect(db.getAllAnimals()).rejects.toThrow('offline')
    expect(query).toHaveBeenCalledTimes(5)
    await expect(db.getAllAnimals()).resolves.toEqual([])
    expect(transaction).toHaveBeenCalledTimes(2)
  })
})
