import { getEvent } from './event-settings'
export async function getDrawEntryUrl() {
  return (await getEvent()).drawUrl
}
