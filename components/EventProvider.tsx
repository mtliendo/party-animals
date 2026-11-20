'use client'

import { createContext, useContext } from 'react'
import type { publicEventConfig } from '@/lib/event'

type PublicEvent = ReturnType<typeof publicEventConfig>
const EventContext = createContext<PublicEvent | null>(null)

export function EventProvider({ value, children }: { value: PublicEvent; children: React.ReactNode }) {
  return <EventContext.Provider value={value}>{children}</EventContext.Provider>
}

export function useEvent() {
  const value = useContext(EventContext)
  if (!value) throw new Error('EventProvider is required')
  return value
}
