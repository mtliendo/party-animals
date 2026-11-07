import { getAdminSession } from '@/lib/admin'
import { getAdminGitHubToken } from '@/lib/github-token'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const session = await getAdminSession()
  if (!session) {
    redirect('/auth/login?connection=github&returnTo=/settings')
  }

  const github = await getAdminGitHubToken()
  const githubConnected = !('error' in github)
  const githubSource = githubConnected ? github.source : null

  return (
    <SettingsClient
      user={session.user}
      githubConnected={githubConnected}
      githubSource={githubSource}
      userId={session.user.sub as string}
    />
  )
}
