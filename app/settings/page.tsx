import { getAdminSession } from '@/lib/admin'
import { getAdminGitHubToken } from '@/lib/github-token'
import { redirect } from 'next/navigation'
import { getEventSettings } from '@/lib/event-settings'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const settings = await getEventSettings()
  const event = settings.effective
  const session = await getAdminSession()
  if (!session) {
    redirect(`/auth/login?connection=${encodeURIComponent(event.connection)}&returnTo=/settings`)
  }

  const github = await getAdminGitHubToken()
  const githubConnected = !('error' in github)
  const githubSource = githubConnected ? github.source : null

  return (
    <SettingsClient
      user={session.user}
      settings={settings}
      githubConnected={githubConnected}
      githubSource={githubSource}
    />
  )
}
