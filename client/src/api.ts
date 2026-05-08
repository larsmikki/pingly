import type { Monitor, CheckLog } from '@/types'

const BASE = '/api'

async function fetchJson<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export interface DownEvent {
  id: string
  monitorId: string
  status: 'down'
  statusCode: number | null
  responseTime: number | null
  error: string | null
  checkedAt: number
  monitorName: string
  monitorUrl: string
}

export const api = {
  getMonitors: () => fetchJson<Monitor[]>('/monitors'),
  createMonitor: (data: { name: string; url: string; interval: number }) =>
    fetchJson<Monitor>('/monitors', { method: 'POST', body: JSON.stringify(data) }),
  updateMonitor: (id: string, data: { name: string; url: string; interval: number; enabled: boolean; method?: string }) =>
    fetchJson<Monitor>(`/monitors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMonitor: (id: string) =>
    fetch(`${BASE}/monitors/${id}`, { method: 'DELETE' }),
  getLogs: (id: string, limit = 20, offset = 0) =>
    fetchJson<CheckLog[]>(`/monitors/${id}/logs?limit=${limit}&offset=${offset}`),
  checkNow: (id: string) =>
    fetchJson<Monitor>(`/monitors/${id}/check`, { method: 'POST' }),
  importMonitors: (monitors: { name: string; url: string; interval: number; enabled: boolean }[]) =>
    fetchJson<{ imported: number }>('/monitors/import', { method: 'POST', body: JSON.stringify(monitors) }),
  bulkUpdateInterval: (interval: number) =>
    fetchJson<{ updated: boolean }>('/monitors/bulk-interval', { method: 'PUT', body: JSON.stringify({ interval }) }),
  cleanLogs: (days: number) =>
    fetchJson<{ deleted: number }>('/monitors/clean-logs', { method: 'POST', body: JSON.stringify({ days }) }),
  getDownEvents: () => fetchJson<DownEvent[]>('/monitors/down-events'),
  dismissEvent: (id: string) =>
    fetchJson<{ dismissed: boolean }>(`/monitors/dismiss-event/${id}`, { method: 'POST' }),
  dismissAllEvents: () =>
    fetchJson<{ dismissed: boolean }>('/monitors/dismiss-all-events', { method: 'POST' }),
}
