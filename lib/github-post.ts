import { Octokit } from 'octokit'

import { getEvent } from './event-settings'

function repoParts(issueRepo: string) {
  const [owner, repo] = issueRepo.split('/')
  if (!owner || !repo) {
    throw new Error('GITHUB_ISSUE_REPO must be set to "owner/name"')
  }
  return { owner, repo }
}

export async function validateGithubLogin(
  token: string,
  login: string,
): Promise<boolean> {
  try {
    const octokit = new Octokit({ auth: token })
    await octokit.rest.users.getByUsername({ username: login })
    return true
  } catch {
    return false
  }
}

export type IssueInput = {
  token: string
  githubHandle: string
  imageUrl?: string
  videoUrl?: string
}

export async function createAnimalIssue(
  input: IssueInput,
): Promise<{ number: number; url: string }> {
  const event = await getEvent()
  const { owner, repo } = repoParts(event.issueRepo)
  const octokit = new Octokit({ auth: input.token })

  let mention = input.githubHandle
  if (mention.startsWith('@')) mention = mention.slice(1)

  let validatedMention = ''
  if (mention) {
    const ok = await validateGithubLogin(input.token, mention)
    if (ok) validatedMention = `@${mention}`
    else validatedMention = mention
  }

  const lines = [
    input.imageUrl
      ? `![Party Animal by ${validatedMention}](${input.imageUrl})`
      : '',
    '',
    `🐾 **${validatedMention}**'s party animal, brought to life by AI!`,
    '',
    input.videoUrl
      ? `🎬 [Watch the animation](${input.videoUrl})`
      : '_Still of the original drawing — animation was not ready yet._',
    '',
    `Check out all the animals on [The Wall](${event.wallUrl})`,
    '',
    '---',
    `_Created at [${event.name}](${event.url}) · Powered by [Auth0](https://auth0.com) Token Vault_`,
  ]

  const issue = await octokit.rest.issues.create({
    owner,
    repo,
    title: `🐾 ${validatedMention}'s Party Animal`,
    body: lines.join('\n'),
    labels: [event.issueLabel],
  })

  return { number: issue.data.number, url: issue.data.html_url }
}
