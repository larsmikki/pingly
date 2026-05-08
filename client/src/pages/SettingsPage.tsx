import { useRef, useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useMonitors } from '@/contexts/MonitorsContext'
import { api } from '@/api'
import ThemePicker from '@/components/ThemePicker'

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
  const { theme } = useTheme()
  const { monitors, refresh, bulkUpdateInterval } = useMonitors()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bulkInterval, setBulkInterval] = useState(300)
  const [updating, setUpdating] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [cleanDays, setCleanDays] = useState(7)
  const [cleaning, setCleaning] = useState(false)
  const [cleanResult, setCleanResult] = useState<number | null>(null)

  const sectionStyle = {
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
  }

  const handleExport = () => {
    const data = monitors.map(({ name, url, interval, enabled }) => ({ name, url, interval, enabled }))
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'pingly-monitors.json'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result as string)
        const monitors = Array.isArray(data) ? data : []
        await api.importMonitors(monitors)
        await refresh()
      } catch {
        alert('Invalid JSON file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleBulkUpdate = async () => {
    setUpdating(true)
    try {
      await bulkUpdateInterval(bulkInterval)
      setUpdated(true)
      setTimeout(() => setUpdated(false), 2000)
    } finally {
      setUpdating(false)
    }
  }

  const handleCleanLogs = async () => {
    if (!confirm(`Delete all check logs older than ${cleanDays} days?`)) return
    setCleaning(true)
    try {
      const result = await api.cleanLogs(cleanDays)
      setCleanResult(result.deleted)
    } finally {
      setCleaning(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight" style={{ color: theme.text }}>
          Settings
        </h1>
        <p className="text-sm mt-0.5" style={{ color: theme.text2 }}>
          Customize your Pingly experience.
        </p>
      </div>

      <div style={sectionStyle}>
        <h2 className="text-base font-bold mb-1" style={{ color: theme.text }}>Theme</h2>
        <p className="text-xs mb-5" style={{ color: theme.text2 }}>
          Choose how Pingly looks to you.
        </p>
        <ThemePicker />
      </div>

      <div style={sectionStyle}>
        <h2 className="text-base font-bold mb-1" style={{ color: theme.text }}>Bulk update</h2>
        <p className="text-xs mb-5" style={{ color: theme.text2 }}>
          Update check interval for all monitors at once.
        </p>
        <div className="flex gap-3 items-center">
          <select
            value={bulkInterval}
            onChange={e => setBulkInterval(Number(e.target.value))}
            className="px-4 py-2.5 text-sm rounded-xl outline-none flex-1 max-w-48"
            style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.text }}
          >
            {INTERVAL_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={handleBulkUpdate}
            disabled={updating}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: theme.gradient }}
          >
            {updated ? 'Updated!' : updating ? 'Updating...' : 'Apply to All'}
          </button>
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 className="text-base font-bold mb-1" style={{ color: theme.text }}>Data</h2>
        <p className="text-xs mb-5" style={{ color: theme.text2 }}>
          Export your monitor configurations as JSON for backup or migration. Import restores monitors without overwriting existing ones.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all hover:opacity-80"
            style={{ background: theme.surface2, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export Settings
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all hover:opacity-80"
            style={{ background: theme.surface2, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Import Settings
          </button>
          <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </div>

      <div style={sectionStyle}>
        <h2 className="text-base font-bold mb-1" style={{ color: theme.text }}>Clean logs</h2>
        <p className="text-xs mb-5" style={{ color: theme.text2 }}>
          Delete check logs older than a certain number of days to free up space.
        </p>
        <div className="flex gap-3 items-center">
          <select
            value={cleanDays}
            onChange={e => { setCleanDays(Number(e.target.value)); setCleanResult(null) }}
            className="px-4 py-2.5 text-sm rounded-xl outline-none flex-1 max-w-48"
            style={{ background: theme.surface2, border: `1px solid ${theme.border}`, color: theme.text }}
          >
            <option value={1}>1 day</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
          <button
            onClick={handleCleanLogs}
            disabled={cleaning}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ background: theme.gradient }}
          >
            {cleanResult !== null ? `${cleanResult} deleted` : cleaning ? 'Cleaning...' : 'Delete Old Logs'}
          </button>
        </div>
      </div>
    </div>
  )
}
