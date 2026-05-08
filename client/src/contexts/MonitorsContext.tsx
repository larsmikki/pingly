import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Monitor } from '@/types'
import { api } from '@/api'

interface MonitorsContextType {
  monitors: Monitor[]
  loading: boolean
  addMonitor: (data: { name: string; url: string; interval: number }) => Promise<Monitor | undefined>
  deleteMonitor: (id: string) => Promise<void>
  updateMonitor: (id: string, data: { name: string; url: string; interval: number; enabled: boolean }) => Promise<void>
  checkNow: (id: string) => Promise<void>
  refresh: () => Promise<void>
  bulkUpdateInterval: (interval: number) => Promise<void>
}

const MonitorsContext = createContext<MonitorsContextType>(null!)

export function MonitorsProvider({ children }: { children: ReactNode }) {
  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    try {
      const data = await api.getMonitors()
      setMonitors(data)
    } catch (err) {
      console.error('Failed to fetch monitors:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Refresh every 30s to update last-checked status
  useEffect(() => {
    const interval = setInterval(fetchAll, 30_000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const addMonitor = useCallback(async (data: { name: string; url: string; interval: number }): Promise<Monitor | undefined> => {
    try {
      const monitor = await api.createMonitor(data)
      setMonitors(prev => [monitor, ...prev])
      return monitor
    } catch (err) {
      console.error('Failed to add monitor:', err)
      return undefined
    }
  }, [])

  const deleteMonitor = useCallback(async (id: string) => {
    try {
      await api.deleteMonitor(id)
      setMonitors(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      console.error('Failed to delete monitor:', err)
    }
  }, [])

  const updateMonitor = useCallback(async (id: string, data: { name: string; url: string; interval: number; enabled: boolean; method?: string }) => {
    try {
      const updated = await api.updateMonitor(id, data)
      setMonitors(prev => prev.map(m => m.id === id ? updated : m))
    } catch (err) {
      console.error('Failed to update monitor:', err)
    }
  }, [])

  const checkNow = useCallback(async (id: string) => {
    try {
      const updated = await api.checkNow(id)
      setMonitors(prev => prev.map(m => m.id === id ? updated : m))
    } catch (err) {
      console.error('Failed to trigger check:', err)
    }
  }, [])

  const bulkUpdateInterval = useCallback(async (interval: number) => {
    try {
      await api.bulkUpdateInterval(interval)
      setMonitors(prev => prev.map(m => ({ ...m, interval })))
    } catch (err) {
      console.error('Failed to bulk update interval:', err)
    }
  }, [])

  return (
    <MonitorsContext.Provider value={{ monitors, loading, addMonitor, deleteMonitor, updateMonitor, checkNow, refresh: fetchAll, bulkUpdateInterval }}>
      {children}
    </MonitorsContext.Provider>
  )
}

export const useMonitors = () => useContext(MonitorsContext)
