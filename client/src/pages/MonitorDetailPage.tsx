import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '@/api'
import { useMonitors } from '@/contexts/MonitorsContext'
import { Button, ConfirmDialog, Input, Select, Surface, useToast } from '@/components/ui'
import type { CheckLog } from '@/types'

const INTERVAL_OPTIONS = [
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '6 hours', value: 21600 },
  { label: '12 hours', value: 43200 },
  { label: '24 hours', value: 86400 },
]

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString()
}

function formatAgo(ts: number | null): string {
  if (!ts) return 'Never'
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function FaviconIcon({ src }: { src: string }) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-surface2">
        <svg className="h-4 w-4 text-text2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 0 0 4.083 9zM10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }

  return <img src={src} alt="" className="w-8 h-8 rounded-lg shrink-0 bg-white object-contain" onError={() => setError(true)} />
}

function StatusBadge({ status }: { status: 'up' | 'down' | 'error' | null }) {
  if (!status) return <span className="text-sm font-semibold text-text2">Pending</span>
  const label = status === 'up' ? 'Up' : status === 'down' ? 'Down' : 'Error'
  const className =
    status === 'up'
      ? 'text-success bg-success/15 border-success/30'
      : status === 'down'
        ? 'text-danger bg-danger/15 border-danger/30'
        : 'text-warning bg-warning/15 border-warning/30'

  return (
    <span className={`px-3 py-1 rounded-full flex items-center gap-1.5 text-sm font-bold border ${className}`}>
      {label}
    </span>
  )
}

function LogRow({ log }: { log: CheckLog }) {
  const statusColor = log.status === 'up' ? 'text-success' : log.status === 'down' ? 'text-danger' : 'text-warning'
  return (
    <div className="grid grid-cols-[48px_40px_56px_minmax(0,1fr)_72px] gap-4 px-4 py-3 text-sm border-t border-border">
      <span className={`font-bold ${statusColor}`}>{log.status.toUpperCase()}</span>
      <span className="text-right text-text2">{log.statusCode ?? '-'}</span>
      <span className="text-right text-text2">{log.responseTime !== null ? `${log.responseTime}ms` : '-'}</span>
      <span className="text-xs text-text2 truncate">{log.error ?? formatTime(log.checkedAt)}</span>
      <span className="text-xs text-text2 text-right">{formatAgo(log.checkedAt)}</span>
    </div>
  )
}

export default function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { addToast } = useToast()
  const { monitors, updateMonitor, deleteMonitor, checkNow } = useMonitors()
  const navigate = useNavigate()
  const monitor = monitors.find(m => m.id === id)

  const [logs, setLogs] = useState<CheckLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsOffset, setLogsOffset] = useState(0)
  const [editName, setEditName] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editInterval, setEditInterval] = useState(300)
  const [editEnabled, setEditEnabled] = useState(true)
  const [editMethod, setEditMethod] = useState<'HEAD' | 'GET'>('HEAD')
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (!monitor) return
    setEditName(monitor.name)
    setEditUrl(monitor.url)
    setEditInterval(monitor.interval)
    setEditEnabled(monitor.enabled)
    setEditMethod(monitor.method || 'HEAD')
  }, [monitor])

  const fetchLogs = useCallback(async () => {
    if (!id) return
    setLogsLoading(true)
    try {
      setLogs(await api.getLogs(id, 20, logsOffset))
    } catch {
      addToast('Failed to fetch check history', 'error')
    } finally {
      setLogsLoading(false)
    }
  }, [id, logsOffset, addToast])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!id || !editName.trim() || !editUrl.trim()) {
      addToast('Name and URL are required.', 'error')
      return
    }
    setSaving(true)
    try {
      await updateMonitor(id, {
        name: editName.trim(),
        url: editUrl.trim(),
        interval: editInterval,
        enabled: editEnabled,
        method: editMethod,
      })
      addToast('Monitor saved', 'success')
    } finally {
      setSaving(false)
    }
  }

  const handleCheckNow = async () => {
    if (!id) return
    setChecking(true)
    try {
      await checkNow(id)
      await fetchLogs()
      addToast('Check complete', 'success')
    } finally {
      setChecking(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    await deleteMonitor(id)
    addToast('Monitor deleted', 'success')
    navigate('/')
  }

  if (!monitor) {
    return (
      <div className="text-center py-20">
        <p className="text-text2">Monitor not found.</p>
        <Link to="/" className="text-accent">Back to monitors</Link>
      </div>
    )
  }

  const uptime = logs.length > 0 ? Math.round((logs.filter(log => log.status === 'up').length / logs.length) * 100) : null

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/" className="flex items-center gap-1.5 text-xs mb-4 hover:opacity-80 transition-opacity text-text2 no-underline">
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 0 1-1.414 0l-6-6a1 1 0 0 1 0-1.414l6-6a1 1 0 0 1 1.414 1.414L5.414 9H17a1 1 0 1 1 0 2H5.414l4.293 4.293a1 1 0 0 1 0 1.414z" clipRule="evenodd" />
          </svg>
          All monitors
        </Link>
        <div className="flex items-center gap-3">
          <FaviconIcon src={monitor.favicon} />
          <h1 className="text-2xl font-extrabold tracking-tight text-text truncate">{monitor.name}</h1>
          <StatusBadge status={monitor.lastStatus} />
          <Button className="ml-auto" variant="primary" onClick={handleCheckNow} disabled={checking}>
            {checking ? 'Checking...' : 'Check now'}
          </Button>
        </div>
        <p className="text-sm mt-0.5 truncate text-text2">{monitor.url}</p>
      </div>

      <Surface className="p-6 mb-5">
        <h2 className="text-base font-bold mb-1 text-text">Status</h2>
        <p className="text-xs mb-5 text-text2">Latest health and response metrics.</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Last check', value: formatAgo(monitor.lastCheckedAt) },
            { label: 'Response time', value: monitor.lastResponseTime !== null ? `${monitor.lastResponseTime}ms` : '-' },
            { label: 'Uptime', value: uptime !== null ? `${uptime}%` : '-' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xs mb-1 text-text2">{label}</p>
              <p className="text-lg font-bold text-text">{value}</p>
            </div>
          ))}
        </div>
      </Surface>

      <Surface className="p-6 mb-5">
        <h2 className="text-base font-bold mb-1 text-text">Settings</h2>
        <p className="text-xs mb-5 text-text2">Edit this monitor's configuration.</p>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wider font-semibold text-text2">Name</label>
            <Input value={editName} onChange={e => setEditName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wider font-semibold text-text2">URL</label>
            <Input type="url" value={editUrl} onChange={e => setEditUrl(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_112px_96px] gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-text2">Check interval</label>
              <Select value={editInterval} onChange={e => setEditInterval(Number(e.target.value))}>
                {INTERVAL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-text2">Method</label>
              <Select value={editMethod} onChange={e => setEditMethod(e.target.value as 'HEAD' | 'GET')}>
                <option value="HEAD">HEAD</option>
                <option value="GET">GET</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-text2">Enabled</label>
              <button
                type="button"
                onClick={() => setEditEnabled(value => !value)}
                className={`h-[42px] px-3 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 border ${editEnabled ? 'bg-accent/15 text-accent border-accent' : 'bg-surface2 text-text2 border-border'}`}
              >
                {editEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center pt-1">
            <Button type="button" variant="danger" size="sm" onClick={() => setDeleteOpen(true)}>Delete monitor</Button>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>
          </div>
        </form>
      </Surface>

      <Surface className="mb-0 overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-bold text-text">Check history</h2>
          <p className="text-xs mt-0.5 text-text2">Last {logs.length} checks</p>
        </div>

        {logsLoading ? (
          <div className="px-6 py-8 text-center text-sm text-text2">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-text2">No checks yet.</div>
        ) : (
          <>
            <div className="grid grid-cols-[48px_40px_56px_minmax(0,1fr)_72px] gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-text2">
              <span>Status</span>
              <span className="text-right">Code</span>
              <span className="text-right">Time</span>
              <span>Details</span>
              <span className="text-right">When</span>
            </div>
            {logs.map(log => <LogRow key={log.id} log={log} />)}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <Button size="sm" onClick={() => setLogsOffset(Math.max(0, logsOffset - 20))} disabled={logsOffset === 0}>Previous</Button>
              <span className="text-xs text-text2">{logsOffset + 1}-{logsOffset + logs.length}</span>
              <Button size="sm" onClick={() => setLogsOffset(logsOffset + 20)} disabled={logs.length < 20}>Next</Button>
            </div>
          </>
        )}
      </Surface>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete monitor"
        message={`"${monitor.name}" will be removed with its check history.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </div>
  )
}
