import { beforeEach, describe, expect, it, vi } from 'vitest'
const { getByUsername, create } = vi.hoisted(() => ({
  getByUsername: vi.fn(), create: vi.fn(),
}))
vi.mock('octokit', () => ({ Octokit: class {
  rest = { users: { getByUsername }, issues: { create } }
} }))
vi.mock('./event', () => ({ event: {
  issueRepo: 'host/gallery', issueLabel: 'summer', wallUrl: 'https://summer.example/wall',
  name: 'Summer 2027', url: 'https://summer.example',
} }))
import { createAnimalIssue } from './github-post'

beforeEach(() => {
  vi.clearAllMocks()
  getByUsername.mockResolvedValue({})
  create.mockResolvedValue({ data: { number: 1, html_url: 'https://github.example/1' } })
})

describe('event GitHub issues', () => {
  it('uses the event repository, label, footer and wall URL', async () => {
    expect(await createAnimalIssue({ token: 'test', githubHandle: '@guest', imageUrl: 'https://image.example', videoUrl: 'https://video.example' }))
      .toEqual({ number: 1, url: 'https://github.example/1' })
    const issue = create.mock.calls[0][0]
    expect(issue).toMatchObject({ owner: 'host', repo: 'gallery', labels: ['summer'], title: "🐾 @guest's Party Animal" })
    expect(issue.body).toContain('![Party Animal by @guest](https://image.example)')
    expect(issue.body).toContain('[Watch the animation](https://video.example)')
    expect(issue.body).toContain('[The Wall](https://summer.example/wall)')
    expect(issue.body).toContain('[Summer 2027](https://summer.example)')
  })
  it('supports empty media and handle', async () => {
    await createAnimalIssue({ token: 'test', githubHandle: '' })
    expect(getByUsername).not.toHaveBeenCalled()
    expect(create.mock.calls[0][0].body).toContain('animation was not ready yet')
  })
  it('does not mention a handle when validation fails', async () => {
    getByUsername.mockRejectedValueOnce(new Error('not found'))
    await createAnimalIssue({ token: 'test', githubHandle: '@missing' })
    expect(create.mock.calls[0][0].body).not.toContain('@missing')
  })
  it('propagates posting failures', async () => {
    create.mockRejectedValueOnce(new Error('forbidden'))
    await expect(createAnimalIssue({ token: 'test', githubHandle: 'guest' })).rejects.toThrow('forbidden')
  })
})
