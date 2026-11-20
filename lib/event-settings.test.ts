import { beforeEach, describe, expect, it, vi } from 'vitest'
const { read } = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('./db', () => ({ readEventOverrides: read }))
import { getEvent } from './event-settings'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('DATABASE_URL', 'postgresql://unused')
  vi.stubEnv('EVENT_NAME', 'Environment')
})

describe('request-time event settings', () => {
  it('reads changes on each call and handles no saved row', async () => {
    read.mockResolvedValueOnce({ name: 'First' }).mockResolvedValueOnce({ name: 'Second' }).mockResolvedValueOnce({})
    expect((await getEvent()).name).toBe('First')
    expect((await getEvent()).name).toBe('Second')
    expect((await getEvent()).name).toBe('Environment')
  })
  it('logs and falls back when missing a database or reading fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    read.mockRejectedValueOnce(new Error('offline'))
    expect((await getEvent()).name).toBe('Environment')
    vi.stubEnv('DATABASE_URL', '')
    expect((await getEvent()).name).toBe('Environment')
    expect(read).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })
})
