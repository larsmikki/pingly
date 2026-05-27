import { createContext, useContext } from 'react'
import type { Monitor } from '@/types'

export interface MonitorsContextType {
  monitors: Monitor[]
  loading: boolean
  addMonitor: (data: { name: string; url: string; interval: number }) => Promise<Monitor | undefined>
  deleteMonitor: (id: string) => Promise<void>
  updateMonitor: (id: string, data: { name: string; url: string; interval: number; enabled: boolean; method?: string }) => Promise<void>
  checkNow: (id: string) => Promise<void>
  refresh: () => Promise<void>
  bulkUpdateInterval: (interval: number) => Promise<void>
}

export const MonitorsContext = createContext<MonitorsContextType>(null!)

export const useMonitors = () => useContext(MonitorsContext)
