import { getEvent } from './event-settings';
export { HEART } from './event-heart';
export async function getBrand() {
  const event = await getEvent();
  return { SITE_NAME: event.siteName, SITE_DESCRIPTION: event.description };
}
