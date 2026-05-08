import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useMonitors } from '@/contexts/MonitorsContext'
import { useTheme } from '@/contexts/ThemeContext'
import type { Monitor } from '@/types'
import { api, type DownEvent } from '@/api'

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

function formatInterval(seconds: number): string {
  if (seconds < 3600) return `${seconds / 60}min`
  if (seconds < 86400) return `${seconds / 3600}h`
  return `${seconds / 86400}d`
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

function formatAgo(ts: number | null): string {
  if (!ts) return 'Never'
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function StatusBadge({ status }: { status: Monitor['lastStatus'] }) {
  if (!status) return <span className="text-xs font-semibold" style={{ color: '#71717a' }}>Pending</span>
  if (status === 'up') {
    return (
      <svg className="w-4 h-4" style={{ color: '#22c55e' }} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
      </svg>
    )
  }
  if (status === 'down') {
    return (
      <svg className="w-4 h-4" style={{ color: '#ef4444' }} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    )
  }
  return <span className="text-xs font-bold" style={{ color: '#f59e0b' }}>!</span>
}

function AddMonitorModal({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme()
  const { addMonitor } = useMonitors()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [interval, setInterval] = useState(300)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Name is required'); return }
    if (!url.trim()) { setError('URL is required'); return }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://')
      return
    }
    setSaving(true)
    try {
      const result = await addMonitor({ name: name.trim(), url: url.trim(), interval })
      if (!result) { setError('Failed to add monitor. Is the server running?'); return }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold" style={{ color: theme.text }}>Add monitor</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:opacity-70" style={{ color: theme.text2 }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: theme.text2 }}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Site"
              autoFocus
              className="px-4 py-2.5 text-sm rounded-xl outline-none placeholder:opacity-40"
              style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.text }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: theme.text2 }}>URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="px-4 py-2.5 text-sm rounded-xl outline-none placeholder:opacity-40"
              style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.text }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold" style={{ color: theme.text2 }}>Check interval</label>
            <select
              value={interval}
              onChange={e => setInterval(Number(e.target.value))}
              className="px-4 py-2.5 text-sm rounded-xl outline-none"
              style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.text }}
            >
              {INTERVAL_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl transition-opacity hover:opacity-80"
              style={{ background: theme.surface2, color: theme.text, border: `1px solid ${theme.border}` }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: theme.gradient }}
            >
              {saving ? 'Adding...' : 'Add Monitor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MonitorCard({ monitor }: { monitor: Monitor }) {
  const { theme } = useTheme()
  const { deleteMonitor, checkNow } = useMonitors()
  const [checking, setChecking] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleCheck = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setChecking(true)
    try {
      await checkNow(monitor.id)
    } finally {
      setChecking(false)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm(`Delete monitor "${monitor.name}"?`)) {
      deleteMonitor(monitor.id)
    }
  }

  return (
    <Link
      to={`/monitors/${monitor.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div
        className="card-hover group rounded-xl p-5 flex flex-col gap-3 cursor-pointer"
        style={{ background: theme.surface, border: `1px solid ${monitor.lastStatus === 'down' ? '#ef4444' : hovered ? theme.accent : theme.border}`, boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Header: icon + name + status badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <FaviconIcon src={monitor.favicon} theme={theme} />
            <div className="min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: theme.text }}>{monitor.name}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: theme.text2 }}>{monitor.url}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <StatusBadge status={monitor.lastStatus} />
          </div>
        </div>

        {/* Footer: meta + actions */}
        <div className="flex items-center justify-between pt-1" style={{ borderTop: `1px solid ${theme.border}` }}>
          <span className="text-xs" style={{ color: theme.text2 }}>
            {[
              monitor.lastResponseTime !== null ? `${monitor.lastResponseTime}ms` : null,
              `every ${formatInterval(monitor.interval)}`,
              formatAgo(monitor.lastCheckedAt),
            ].filter(Boolean).join(' · ')}
          </span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={handleCheck}
              disabled={checking}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: theme.text2 }}
              title="Check now"
            >
              {checking ? (
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-md transition-colors hover:text-red-500"
              style={{ color: theme.text2 }}
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}

function SkeletonCard({ theme }: { theme: { surface: string; border: string } }) {
  return (
    <div className="rounded-xl p-5" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="skeleton h-4 w-12" />
        <div className="skeleton h-4 w-10" />
      </div>
      <div className="skeleton h-4 w-3/4 mb-1.5" />
      <div className="skeleton h-3 w-full mb-3" />
      <div className="skeleton h-px w-full mb-3" />
      <div className="flex justify-between">
        <div className="skeleton h-3 w-16" />
        <div className="skeleton h-6 w-12" />
      </div>
    </div>
  )
}

export default function FrontPage() {
  const { monitors, loading, refresh } = useMonitors()
  const { theme } = useTheme()
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const [downEvents, setDownEvents] = useState<DownEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)

  useEffect(() => {
    api.getDownEvents()
      .then(setDownEvents)
      .catch(console.error)
      .finally(() => setEventsLoading(false))
  }, [])

  const handleDismiss = async (id: string) => {
    await api.dismissEvent(id)
    setDownEvents(prev => prev.filter(e => e.id !== id))
  }

  const handleDismissAll = async () => {
    await api.dismissAllEvents()
    setDownEvents([])
    refresh()
  }

  const filtered = search.trim()
    ? monitors.filter(m => 
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.url.toLowerCase().includes(search.toLowerCase())
      )
    : monitors

  const upCount = filtered.filter(m => m.lastStatus === 'up').length
  const downCount = filtered.filter(m => m.lastStatus === 'down' || m.lastStatus === 'error').length

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: theme.text }}>
            Your Monitors
          </h1>
          {!loading && filtered.length > 0 && (
            <p className="text-sm mt-0.5" style={{ color: theme.text2 }}>
              {upCount > 0 && downCount > 0
                ? `${upCount} up and ${downCount} down`
                : upCount > 0
                  ? `${upCount} up`
                  : downCount > 0
                    ? `${downCount} down`
                    : `${filtered.length} monitor${filtered.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl text-white transition-opacity hover:opacity-90 shadow-lg"
          style={{ background: theme.gradient, boxShadow: `0 4px 14px ${theme.accent}40` }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Monitor
        </button>
      </div>

      {/* DOWN events box */}
      {!eventsLoading && downEvents.length > 0 && (
        <div className="mb-6 rounded-xl p-4" style={{ background: theme.surface, border: '1px solid #ef4444' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" style={{ color: '#ef4444' }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-bold" style={{ color: theme.text }}>
                {downEvents.length} DOWN event{downEvents.length !== 1 ? 's' : ''} in past 24 hours
              </span>
            </div>
            <button
              onClick={handleDismissAll}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: '#ef444420', color: '#ef4444' }}
            >
              Dismiss all
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {downEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: theme.surface2 }}>
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/monitors/${event.monitorId}`}
                    className="text-sm font-medium hover:underline block truncate"
                    style={{ color: theme.text }}
                  >
                    {event.monitorName}
                  </Link>
                  <p className="text-xs truncate" style={{ color: theme.text2 }}>{event.monitorUrl}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs" style={{ color: theme.text2 }}>{formatAgo(event.checkedAt)}</span>
                  <button
                    onClick={() => handleDismiss(event.id)}
                    className="text-xs px-2 py-1 rounded transition-opacity hover:opacity-80"
                    style={{ background: '#ef444420', color: '#ef4444' }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search bar */}
      {monitors.length > 0 && (
        <div className="relative mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: theme.text2 }}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search monitors..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none placeholder:opacity-40"
            style={{
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              color: theme.text,
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded"
              style={{ color: theme.text2 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Monitor grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} theme={theme} />)}
        </div>
      ) : monitors.length === 0 ? (
        <div className="text-center py-24">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: `${theme.accent}15` }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: theme.accent }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <h3 className="text-base font-bold mb-2" style={{ color: theme.text }}>No monitors yet</h3>
          <p className="text-sm mb-6" style={{ color: theme.text2 }}>Add a URL to start monitoring its uptime.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="px-6 py-3 text-sm font-semibold rounded-xl text-white transition-opacity hover:opacity-90 shadow-lg"
            style={{ background: theme.gradient, boxShadow: `0 4px 14px ${theme.accent}40` }}
          >
            Add Your First Monitor
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(m => <MonitorCard key={m.id} monitor={m} />)}
        </div>
      )}

      {showAdd && <AddMonitorModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
