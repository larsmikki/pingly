import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { MonitorsProvider } from '@/contexts/MonitorsContext'
import Layout from '@/components/Layout'
import FrontPage from '@/pages/FrontPage'
import MonitorDetailPage from '@/pages/MonitorDetailPage'
import SettingsPage from '@/pages/SettingsPage'
import DonatePage from '@/pages/DonatePage'

export default function App() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  )
}
