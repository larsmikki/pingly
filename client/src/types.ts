export interface Monitor {
  id: string
  name: string
  url: string
  interval: number
  enabled: boolean
  createdAt: number
  lastStatus: 'up' | 'down' | 'error' | null
  lastCheckedAt: number | null
  lastStatusCode: number | null
  lastResponseTime: number | null
  favicon: string
  method: 'HEAD' | 'GET'
}

export interface CheckLog {
  id: string
  monitorId: string
  status: 'up' | 'down' | 'error'
  statusCode: number | null
  responseTime: number | null
  error: string | null
  checkedAt: number
}
