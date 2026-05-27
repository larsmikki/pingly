import { useState, type FormEvent, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import { useMonitors } from '@/contexts/MonitorsContext'
import { queryKeys } from '@/queryKeys'
import { Button, ConfirmDialog, Input, Modal, Select, Surface, useToast } from '@/components/ui'
import type { Monitor } from '@/types'

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

function StatusBadge({ status }: { status: Monitor['lastStatus'] }) {
  if (!status) return <span className="text-xs font-semibold text-text2">Pending</span>
  if (status === 'up') {
    return (
      <svg className="w-4 h-4 text-success" viewBox="0 0 20 20" fill="currentColor" aria-label="Up">
        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 0 1 0-1.414l4-4a1 1 0 0 1 1.414 0l4 4a1 1 0 0 1-1.414 1.414L11 7.414V15a1 1 0 1 1-2 0V7.414L6.707 9.707a1 1 0 0 1-1.414 0z" clipRule="evenodd" />
      </svg>
    )
  }
  if (status === 'down') {
    return (
      <svg className="w-4 h-4 text-danger" viewBox="0 0 20 20" fill="currentColor" aria-label="Down">
        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 12.586V5a1 1 0 0 1 2 0v7.586l2.293-2.293a1 1 0 0 1 1.414 0z" clipRule="evenodd" />
      </svg>
    )
  }
  return <span className="text-xs font-bold text-warning">!</span>
}

function AddMonitorModal({ onClose }: { onClose: () => void }) {
  const { addMonitor } = useMonitors()
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [interval, setInterval] = useState(300)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Name is required.'); return }
    if (!url.trim()) { setError('URL is required.'); return }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL must start with http:// or https://.')
      return
    }

    setSaving(true)
    try {
      const result = await addMonitor({ name: name.trim(), url: url.trim(), interval })
      if (!result) {
        addToast('Failed to add monitor. Is the server running?', 'error')
        return
      }
      addToast('Monitor added', 'success')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open title="Add monitor" onClose={onClose} maxWidth="448px">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-wider font-semibold text-text2">Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="My site" autoFocus invalid={error.includes('Name')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-wider font-semibold text-text2">URL</label>
          <Input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" invalid={error.includes('URL')} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-wider font-semibold text-text2">Check interval</label>
          <Select value={interval} onChange={e => setInterval(Number(e.target.value))}>
            {INTERVAL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button type="button" fullWidth onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" fullWidth disabled={saving}>{saving ? 'Adding...' : 'Add monitor'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function MonitorCard({ monitor }: { monitor: Monitor }) {
  const { deleteMonitor, checkNow } = useMonitors()
  const { addToast } = useToast()
  const [checking, setChecking] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleCheck = async (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setChecking(true)
    try {
      await checkNow(monitor.id)
      addToast('Check complete', 'success')
    } finally {
      setChecking(false)
    }
  }

  const handleDeleteClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setConfirmOpen(true)
  }

  const handleDelete = async () => {
    await deleteMonitor(monitor.id)
    addToast('Monitor deleted', 'success')
    setConfirmOpen(false)
  }

  return (
    <>
      <Link to={`/monitors/${monitor.id}`} className="block no-underline">
        <div
          className="card-hover group rounded-xl p-5 flex flex-col gap-3 cursor-pointer"
          data-status={monitor.lastStatus ?? 'pending'}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <FaviconIcon src={monitor.favicon} />
              <div className="min-w-0">
                <p className="text-base font-bold leading-snug truncate text-text">{monitor.name}</p>
                <p className="text-xs truncate mt-0.5 text-text2">{monitor.url}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              <StatusBadge status={monitor.lastStatus} />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-xs text-text2 truncate">
              {[
                monitor.lastResponseTime !== null ? `${monitor.lastResponseTime}ms` : null,
                `every ${formatInterval(monitor.interval)}`,
                formatAgo(monitor.lastCheckedAt),
              ].filter(Boolean).join(' | ')}
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <button type="button" onClick={handleCheck} disabled={checking} className="p-1.5 rounded-md text-text2 hover:text-accent transition-colors" title="Check now">
                {checking ? (
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M4 2a1 1 0 0 1 1 1v2.101a7.002 7.002 0 0 1 11.601 2.566 1 1 0 1 1-1.885.666A5.002 5.002 0 0 0 5.999 7H9a1 1 0 0 1 0 2H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zm.008 9.057a1 1 0 0 1 1.276.61A5.002 5.002 0 0 0 14.001 13H11a1 1 0 1 1 0-2h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-2.101a7.002 7.002 0 0 1-11.601-2.566 1 1 0 0 1 .61-1.276z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <button type="button" onClick={handleDeleteClick} className="p-1.5 rounded-md text-text2 hover:text-danger transition-colors" title="Delete">
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M9 2a1 1 0 0 0-.894.553L7.382 4H4a1 1 0 0 0 0 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a1 1 0 1 0 0-2h-3.382l-.724-1.447A1 1 0 0 0 11 2H9zM7 8a1 1 0 0 1 2 0v6a1 1 0 1 1-2 0V8zm5-1a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0V8a1 1 0 0 0-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Link>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete monitor"
        message={`"${monitor.name}" will be removed with its check history.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  )
}

function SkeletonCard() {
  return (
    <Surface className="rounded-xl p-5">
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
    </Surface>
  )
}

export default function FrontPage() {
  const { monitors, loading, refresh } = useMonitors()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState('')
  const { data: downEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: queryKeys.downEvents,
    queryFn: api.getDownEvents,
  })

  const dismissEventMutation = useMutation({
    mutationFn: api.dismissEvent,
    onSuccess: (_, id) => {
      queryClient.setQueryData(queryKeys.downEvents, downEvents.filter(event => event.id !== id))
    },
    onError: () => addToast('Failed to dismiss down event', 'error'),
  })

  const dismissAllMutation = useMutation({
    mutationFn: api.dismissAllEvents,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.downEvents, [])
      void refresh()
    },
    onError: () => addToast('Failed to dismiss down events', 'error'),
  })

  const handleDismiss = async (id: string) => {
    await dismissEventMutation.mutateAsync(id)
  }

  const handleDismissAll = async () => {
    await dismissAllMutation.mutateAsync()
  }

  const filtered = search.trim()
    ? monitors.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.url.toLowerCase().includes(search.toLowerCase()))
    : monitors

  const upCount = filtered.filter(m => m.lastStatus === 'up').length
  const downCount = filtered.filter(m => m.lastStatus === 'down' || m.lastStatus === 'error').length

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text">Your monitors</h1>
          {!loading && filtered.length > 0 && (
            <p className="text-sm mt-0.5 text-text2">
              {upCount > 0 && downCount > 0
                ? `${upCount} up and ${downCount} down`
                : upCount > 0 ? `${upCount} up` : downCount > 0 ? `${downCount} down` : `${filtered.length} monitor${filtered.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => setShowAdd(true)}
          leadingIcon={<svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 3a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H4a1 1 0 1 1 0-2h5V4a1 1 0 0 1 1-1z" clipRule="evenodd" /></svg>}
        >
          Add monitor
        </Button>
      </div>

      {!eventsLoading && downEvents.length > 0 && (
        <Surface className="mb-6 rounded-xl p-4 border-danger">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-5 h-5 shrink-0 text-danger" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM8.707 7.293a1 1 0 0 0-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 1 0 1.414 1.414L10 11.414l1.293 1.293a1 1 0 0 0 1.414-1.414L11.414 10l1.293-1.293a1 1 0 0 0-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-bold text-text truncate">{downEvents.length} down event{downEvents.length !== 1 ? 's' : ''} in the past 24 hours</span>
            </div>
            <Button size="sm" variant="danger" onClick={handleDismissAll}>Dismiss all</Button>
          </div>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {downEvents.map(event => (
              <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 bg-surface2">
                <div className="min-w-0 flex-1">
                  <Link to={`/monitors/${event.monitorId}`} className="text-sm font-medium hover:underline block truncate text-text">{event.monitorName}</Link>
                  <p className="text-xs truncate text-text2">{event.monitorUrl}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-text2">{formatAgo(event.checkedAt)}</span>
                  <Button size="sm" variant="danger" onClick={() => handleDismiss(event.id)}>Dismiss</Button>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      )}

      {monitors.length > 0 && (
        <div className="relative mb-6">
          <svg className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-text2" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM2 8a6 6 0 1 1 10.89 3.476l4.817 4.817a1 1 0 0 1-1.414 1.414l-4.816-4.816A6 6 0 0 1 2 8z" clipRule="evenodd" />
          </svg>
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search monitors..." className="pl-10 pr-10" />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-text2 hover:text-accent">
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>
      ) : monitors.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-accent/15">
            <svg className="h-8 w-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 0 1 7.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
          </div>
          <h3 className="text-base font-bold mb-2 text-text">No monitors yet</h3>
          <p className="text-sm mb-6 text-text2">Add a URL to start monitoring its uptime.</p>
          <Button variant="primary" size="lg" onClick={() => setShowAdd(true)}>Add your first monitor</Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(monitor => <MonitorCard key={monitor.id} monitor={monitor} />)}
        </div>
      )}

      {showAdd && <AddMonitorModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}
