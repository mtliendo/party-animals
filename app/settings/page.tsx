import { auth0 } from '@/lib/auth0'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const session = await auth0.getSession()
  if (!session) {
    redirect('/auth/login?returnTo=/settings')
  }

  async function checkBoxConnected() {
    try {
      await auth0.getAccessTokenForConnection({
        connection: 'box',
      })
      return true
    } catch {
      return false
    }
  }

  const boxConnected = await checkBoxConnected()

  return <SettingsClient user={session.user} boxConnected={boxConnected} userId={session.user.sub as string} />
}
