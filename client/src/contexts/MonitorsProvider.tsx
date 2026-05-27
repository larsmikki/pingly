import { useCallback, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import { MonitorsContext } from '@/contexts/MonitorsContext'
import { queryKeys } from '@/queryKeys'
import type { Monitor } from '@/types'

type MonitorUpdate = { name: string; url: string; interval: number; enabled: boolean; method?: string }

export function MonitorsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { data: monitors = [], isLoading } = useQuery({
    queryKey: queryKeys.monitors,
    queryFn: api.getMonitors,
    refetchInterval: 30_000,
  })

  const setMonitors = useCallback((updater: (current: Monitor[]) => Monitor[]) => {
    queryClient.setQueryData<Monitor[]>(queryKeys.monitors, current => updater(current ?? []))
  }, [queryClient])

  const addMutation = useMutation({
    mutationFn: api.createMonitor,
    onSuccess: monitor => {
      setMonitors(current => [monitor, ...current])
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteMonitor,
    onSuccess: (_, id) => {
      setMonitors(current => current.filter(monitor => monitor.id !== id))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: MonitorUpdate }) => api.updateMonitor(id, data),
    onSuccess: monitor => {
      setMonitors(current => current.map(item => item.id === monitor.id ? monitor : item))
    },
  })

  const checkMutation = useMutation({
    mutationFn: api.checkNow,
    onSuccess: monitor => {
      setMonitors(current => current.map(item => item.id === monitor.id ? monitor : item))
    },
  })

  const bulkIntervalMutation = useMutation({
    mutationFn: api.bulkUpdateInterval,
  })

  const addMonitor = useCallback(async (data: { name: string; url: string; interval: number }) => {
    try {
      return await addMutation.mutateAsync(data)
    } catch (err) {
      console.error('Failed to add monitor:', err)
      return undefined
    }
  }, [addMutation])

  const deleteMonitor = useCallback(async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
    } catch (err) {
      console.error('Failed to delete monitor:', err)
    }
  }, [deleteMutation])

  const updateMonitor = useCallback(async (id: string, data: MonitorUpdate) => {
    try {
      await updateMutation.mutateAsync({ id, data })
    } catch (err) {
      console.error('Failed to update monitor:', err)
    }
  }, [updateMutation])

  const checkNow = useCallback(async (id: string) => {
    try {
      await checkMutation.mutateAsync(id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.logs(id, 0, 20) })
    } catch (err) {
      console.error('Failed to trigger check:', err)
    }
  }, [checkMutation, queryClient])

  const bulkUpdateInterval = useCallback(async (interval: number) => {
    try {
      await bulkIntervalMutation.mutateAsync(interval)
      setMonitors(current => current.map(monitor => ({ ...monitor, interval })))
    } catch (err) {
      console.error('Failed to bulk update interval:', err)
    }
  }, [bulkIntervalMutation, setMonitors])

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.monitors })
  }, [queryClient])

  return (
    <MonitorsContext.Provider value={{
      monitors,
      loading: isLoading,
      addMonitor,
      deleteMonitor,
      updateMonitor,
      checkNow,
      refresh,
      bulkUpdateInterval,
    }}>
      {children}
    </MonitorsContext.Provider>
  )
}
