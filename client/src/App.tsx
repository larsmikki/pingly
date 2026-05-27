import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeProvider'
import { MonitorsProvider } from '@/contexts/MonitorsProvider'
import Layout from '@/components/Layout'
import FrontPage from '@/pages/FrontPage'
import MonitorDetailPage from '@/pages/MonitorDetailPage'
import SettingsPage from '@/pages/SettingsPage'
import DonatePage from '@/pages/DonatePage'
import { ToastProvider } from '@/components/ui'

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <MonitorsProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<FrontPage />} />
                <Route path="/monitors/:id" element={<MonitorDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/donate" element={<DonatePage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </MonitorsProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
