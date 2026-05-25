import { useRef, useState, type ChangeEvent } from 'react'
import { api } from '@/api'
import ThemePicker from '@/components/ThemePicker'
import { useMonitors } from '@/contexts/MonitorsContext'
import { Button, ConfirmDialog, Select, Surface, useToast } from '@/components/ui'

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

export default function SettingsPage() {
  const { monitors, refresh, bulkUpdateInterval } = useMonitors()
  const { addToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bulkInterval, setBulkInterval] = useState(300)
  const [updating, setUpdating] = useState(false)
  const [cleanDays, setCleanDays] = useState(7)
  const [cleaning, setCleaning] = useState(false)
  const [cleanOpen, setCleanOpen] = useState(false)

  const handleExport = () => {
    const data = monitors.map(({ name, url, interval, enabled }) => ({ name, url, interval, enabled }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'pingly-monitors.json'
    link.click()
    URL.revokeObjectURL(link.href)
    addToast('Export ready', 'success')
  }

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string)
        await api.importMonitors(Array.isArray(data) ? data : [])
        await refresh()
        addToast('Monitors imported', 'success')
      } catch {
        addToast('Invalid JSON file', 'error')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleBulkUpdate = async () => {
    setUpdating(true)
    try {
      await bulkUpdateInterval(bulkInterval)
      addToast('Intervals updated', 'success')
    } finally {
      setUpdating(false)
    }
  }

  const handleCleanLogs = async () => {
    setCleaning(true)
    try {
      const result = await api.cleanLogs(cleanDays)
      addToast(`${result.deleted} log${result.deleted === 1 ? '' : 's'} deleted`, 'success')
    } finally {
      setCleaning(false)
      setCleanOpen(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-text">Settings</h1>
        <p className="text-sm mt-0.5 text-text2">Customize your Pingly experience.</p>
      </div>

      <Surface className="p-6 mb-5">
        <h2 className="text-base font-bold mb-1 text-text">Themes</h2>
        <p className="text-xs mb-5 text-text2">Choose how Pingly looks to you.</p>
        <ThemePicker />
      </Surface>

      <Surface className="p-6 mb-5">
        <h2 className="text-base font-bold mb-1 text-text">Bulk update</h2>
        <p className="text-xs mb-5 text-text2">Update the check interval for all monitors at once.</p>
        <div className="flex gap-3 items-center">
          <Select value={bulkInterval} onChange={e => setBulkInterval(Number(e.target.value))} className="max-w-48">
            {INTERVAL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
          <Button variant="primary" onClick={handleBulkUpdate} disabled={updating}>{updating ? 'Updating...' : 'Apply to all'}</Button>
        </div>
      </Surface>

      <Surface className="p-6 mb-5">
        <h2 className="text-base font-bold mb-1 text-text">Data</h2>
        <p className="text-xs mb-5 text-text2">Export your monitor configurations as a JSON backup, or import monitors without overwriting existing ones.</p>
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleExport}
            leadingIcon={<svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M3 17a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zm3.293-7.707a1 1 0 0 1 1.414 0L9 10.586V3a1 1 0 1 1 2 0v7.586l1.293-1.293a1 1 0 1 1 1.414 1.414l-3 3a1 1 0 0 1-1.414 0l-3-3a1 1 0 0 1 0-1.414z" clipRule="evenodd" /></svg>}
          >
            Export settings
          </Button>
          <Button
            onClick={() => fileInputRef.current?.click()}
            leadingIcon={<svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M3 17a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1zM6.293 6.707a1 1 0 0 1 0-1.414l3-3a1 1 0 0 1 1.414 0l3 3a1 1 0 0 1-1.414 1.414L11 5.414V13a1 1 0 1 1-2 0V5.414L7.707 6.707a1 1 0 0 1-1.414 0z" clipRule="evenodd" /></svg>}
          >
            Import settings
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        </div>
      </Surface>

      <Surface className="p-6 mb-0">
        <h2 className="text-base font-bold mb-1 text-text">Clean logs</h2>
        <p className="text-xs mb-5 text-text2">Delete old check logs to reduce stored history.</p>
        <div className="flex gap-3 items-center">
          <Select value={cleanDays} onChange={e => setCleanDays(Number(e.target.value))} className="max-w-48">
            <option value={1}>1 day</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </Select>
          <Button variant="danger" onClick={() => setCleanOpen(true)} disabled={cleaning}>{cleaning ? 'Cleaning...' : 'Delete old logs'}</Button>
        </div>
      </Surface>

      <ConfirmDialog
        open={cleanOpen}
        title="Delete old logs"
        message={`Check logs older than ${cleanDays} day${cleanDays === 1 ? '' : 's'} will be deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleCleanLogs}
        onClose={() => setCleanOpen(false)}
      />
    </div>
  )
}
