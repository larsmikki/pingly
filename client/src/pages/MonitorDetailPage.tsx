import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { useMonitors } from '@/contexts/MonitorsContext'
import { api } from '@/api'
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

function FaviconIcon({ src, theme }: { src: string; theme: { surface2: string; text2: string } }) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div className="w-8 h-8 rounded flex items-center justify-center" style={{ background: theme.surface2 }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" style={{ color: theme.text2 }}>
          <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm-1.488 6.955h1.976c.102.42.292.707.486.919.473.52 1.107.806 1.922.806h.394c.815 0 1.45-.286 1.922-.806.194-.212.384-.499.486-.919h1.976c-.116 1.216-.566 2.247-1.318 3.045C14.238 15.215 12.686 16 11 16s-3.238-.785-4.318-2.045c-.752-.798-1.202-1.83-1.318-3.045zM11 5.5c-1.103 0-2 .897-2 2s.897 2 2 2 2-.897 2-2-.897-2-2-2z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt=""
      className="w-8 h-8 rounded"
      style={{ objectFit: 'contain', background: '#fff' }}
      onError={() => setError(true)}
    />
  )
}

function StatusBadge({ status }: { status: 'up' | 'down' | 'error' | null }) {
  if (!status) return <span className="text-sm font-semibold" style={{ color: '#71717a' }}>Pending</span>
  const color = status === 'up' ? '#22c55e' : status === 'down' ? '#ef4444' : '#f59e0b'
  const bg = status === 'up' ? '#22c55e18' : status === 'down' ? '#ef444418' : '#f59e0b18'
  
  const icon = status === 'up' ? (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  ) : status === 'down' ? (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  ) : (
    <span className="text-sm font-bold">!</span>
  )
  
  return (
    <span
      className="px-3 py-1 rounded-full flex items-center gap-1.5"
      style={{ color, background: bg, border: `1px solid ${color}30` }}
    >
      {icon}
    </span>
  )
}

function LogRow({ log, theme }: { log: CheckLog; theme: { text: string; text2: string; border: string; surface2: string } }) {
  const color = log.status === 'up' ? '#22c55e' : log.status === 'down' ? '#ef4444' : '#f59e0b'
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 text-sm"
      style={{ borderTop: `1px solid ${theme.border}` }}
    >
      <span style={{ color, fontWeight: 700, width: 48, flexShrink: 0 }}>
        {log.status.toUpperCase()}
      </span>
      <span style={{ color: theme.text2, width: 40, flexShrink: 0, textAlign: 'right' }}>
        {log.statusCode ?? '—'}
      </span>
      <span style={{ color: theme.text2, width: 56, flexShrink: 0, textAlign: 'right' }}>
        {log.responseTime !== null ? `${log.responseTime}ms` : '—'}
      </span>
      <span className="flex-1 text-xs" style={{ color: theme.text2 }}>
        {log.error ?? formatTime(log.checkedAt)}
      </span>
      <span className="text-xs shrink-0" style={{ color: theme.text2 }}>
        {formatAgo(log.checkedAt)}
      </span>
    </div>
  )
}

export default function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { theme } = useTheme()
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
  const [saved, setSaved] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (monitor) {
      setEditName(monitor.name)
      setEditUrl(monitor.url)
      setEditInterval(monitor.interval)
      setEditEnabled(monitor.enabled)
      setEditMethod(monitor.method || 'HEAD')
    }
  }, [monitor])

  const fetchLogs = useCallback(async () => {
    if (!id) return
    try {
      const data = await api.getLogs(id, 20, logsOffset)
      setLogs(data)
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLogsLoading(false)
    }
  }, [id, logsOffset])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !editName.trim() || !editUrl.trim()) return
    setSaving(true)
    try {
      await updateMonitor(id, { name: editName.trim(), url: editUrl.trim(), interval: editInterval, enabled: editEnabled, method: editMethod } as { name: string; url: string; interval: number; enabled: boolean; method: string })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
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
    } finally {
      setChecking(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !monitor) return
    if (!confirm(`Delete monitor "${monitor.name}"?`)) return
    await deleteMonitor(id)
    navigate('/')
  }

  const sectionStyle = {
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
  }

  if (!monitor) {
    return (
      <div className="text-center py-20">
        <p style={{ color: theme.text2 }}>Monitor not found.</p>
        <Link to="/" style={{ color: theme.accent }}>← Back to monitors</Link>
      </div>
    )
  }

  const uptime = logs.length > 0
    ? Math.round((logs.filter(l => l.status === 'up').length / logs.length) * 100)
    : null

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back + header */}
      <div className="mb-6">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs mb-4 hover:opacity-80 transition-opacity"
          style={{ color: theme.text2, textDecoration: 'none' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          All monitors
        </Link>
<div className="flex items-center gap-3">
            <FaviconIcon src={monitor.favicon} theme={theme} />
            <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: theme.text }}>
              {monitor.name}
            </h1>
            <StatusBadge status={monitor.lastStatus} />
            <button
              onClick={handleCheckNow}
              disabled={checking}
              className="ml-auto flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: theme.gradient, color: 'white' }}
            >
              {checking ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              )}
              {checking ? 'Checking...' : 'Check Now'}
            </button>
          </div>
        <p className="text-sm mt-0.5 truncate" style={{ color: theme.text2 }}>{monitor.url}</p>
      </div>

      {/* Status summary */}
      <div style={sectionStyle}>
        <h2 className="text-base font-bold mb-4" style={{ color: theme.text }}>Status</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Last check', value: formatAgo(monitor.lastCheckedAt) },
            { label: 'Response time', value: monitor.lastResponseTime !== null ? `${monitor.lastResponseTime}ms` : '—' },
            { label: 'Uptime (last 200)', value: uptime !== null ? `${uptime}%` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-xs mb-1" style={{ color: theme.text2 }}>{label}</p>
              <p className="text-lg font-bold" style={{ color: theme.text }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit form */}
      <div style={sectionStyle}>
        <h2 className="text-base font-bold mb-1" style={{ color: theme.text }}>Settings</h2>
        <p className="text-xs mb-5" style={{ color: theme.text2 }}>Edit this monitor's configuration.</p>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: theme.text2 }}>Name</label>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="px-4 py-2.5 text-sm rounded-xl outline-none"
              style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.text }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: theme.text2 }}>URL</label>
            <input
              type="url"
              value={editUrl}
              onChange={e => setEditUrl(e.target.value)}
              className="px-4 py-2.5 text-sm rounded-xl outline-none"
              style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.text }}
            />
          </div>
          <div className="flex gap-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-xs font-semibold" style={{ color: theme.text2 }}>Check interval</label>
              <select
                value={editInterval}
                onChange={e => setEditInterval(Number(e.target.value))}
                className="px-4 py-2.5 text-sm rounded-xl outline-none"
                style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.text }}
              >
                {INTERVAL_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: theme.text2 }}>Method</label>
              <select
                value={editMethod}
                onChange={e => setEditMethod(e.target.value as 'HEAD' | 'GET')}
                className="px-4 py-2.5 text-sm rounded-xl outline-none"
                style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.text }}
              >
                <option value="HEAD">HEAD</option>
                <option value="GET">GET</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ color: theme.text2 }}>Enabled</label>
              <button
                type="button"
                onClick={() => setEditEnabled(v => !v)}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl transition-all"
                style={{
                  background: editEnabled ? `${theme.accent}20` : theme.surface2,
                  color: editEnabled ? theme.accent : theme.text2,
                  border: `1px solid ${editEnabled ? theme.accent : theme.border}`,
                }}
              >
                {editEnabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center pt-1">
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs px-3 py-2 rounded-xl transition-all hover:opacity-80"
              style={{ color: '#ef4444', background: '#ef444415', border: '1px solid #ef444430' }}
            >
              Delete Monitor
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: theme.gradient }}
            >
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* History log */}
      <div style={{ ...sectionStyle, padding: 0, overflow: 'hidden' }}>
        <div className="px-6 py-4" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <h2 className="text-base font-bold" style={{ color: theme.text }}>Check history</h2>
          <p className="text-xs mt-0.5" style={{ color: theme.text2 }}>Last {logs.length} checks</p>
        </div>

        {logsLoading ? (
          <div className="px-6 py-8 text-center text-sm" style={{ color: theme.text2 }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm" style={{ color: theme.text2 }}>No checks yet.</div>
        ) : (
          <>
            {/* Header row */}
            <div className="flex items-center gap-4 px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: theme.text2 }}>
              <span style={{ width: 48 }}>Status</span>
              <span style={{ width: 40, textAlign: 'right' }}>Code</span>
              <span style={{ width: 56, textAlign: 'right' }}>Time</span>
              <span className="flex-1">Details</span>
              <span className="shrink-0">When</span>
            </div>
            {logs.map(log => <LogRow key={log.id} log={log} theme={theme} />)}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: `1px solid ${theme.border}` }}>
              <button
                onClick={() => setLogsOffset(Math.max(0, logsOffset - 20))}
                disabled={logsOffset === 0}
                className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-40"
                style={{ color: theme.text2, background: theme.surface2 }}
              >
                ← Previous
              </button>
              <span className="text-xs" style={{ color: theme.text2 }}>
                {logsOffset + 1}–{logsOffset + logs.length}
              </span>
              <button
                onClick={() => setLogsOffset(logsOffset + 20)}
                disabled={logs.length < 20}
                className="text-xs px-3 py-1.5 rounded-lg disabled:opacity-40"
                style={{ color: theme.text2, background: theme.surface2 }}
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
