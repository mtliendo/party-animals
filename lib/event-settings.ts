import process from 'node:process'
import { getEventConfig, validateEventOverrides, type EventOverrides } from './event'
import { readEventOverrides, writeEventOverrides, clearEventOverrides } from './db'

export async function getEventSettings({ strict = false } = {}) {
  const defaults = getEventConfig()
  let overrides: EventOverrides = {}
  try {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set')
    const result = validateEventOverrides(await readEventOverrides())
    if (Object.keys(result.errors).length) throw new Error('Invalid saved event settings')
    overrides = result.overrides
  } catch (error) {
    if (strict) throw error
    console.warn('[event-settings] Unable to read settings; using environment defaults')
  }
  return { effective: getEventConfig(process.env, overrides), overrides, defaults }
}

export async function getEvent(options: { strict?: boolean } = {}) {
  return (await getEventSettings(options)).effective
}

export async function saveEventOverrides(overrides: EventOverrides) {
  await writeEventOverrides(overrides)
}

export async function resetEventOverrides() {
  await clearEventOverrides()
}
