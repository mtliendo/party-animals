import { loadEnvConfig } from '@next/env'

async function main() {
  loadEnvConfig(process.cwd())
  const command = process.argv[2]
  if (command !== 'setup' && command !== 'reset') throw new Error('Use setup or reset')
  if (command === 'reset' && !process.argv.includes('--yes')) {
    throw new Error('Refusing to delete event data. Re-run pnpm event:reset --yes to confirm.')
  }
  const { ensureSchema, resetEvent } = await import('../lib/db')
  const { event } = await import('../lib/event')
  if (command === 'setup') {
    await ensureSchema()
    console.log('Event database schema ready.')
  } else {
    const deleted = await resetEvent()
    console.log(`Deleted ${deleted} animals for event "${event.slug}". Blobs were not deleted.`)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
