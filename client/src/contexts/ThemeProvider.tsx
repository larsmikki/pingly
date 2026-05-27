import { useEffect, useState, type ReactNode } from 'react'
import { ThemeContext, THEMES, type ThemeDefinition } from './ThemeContext'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeDefinition>(() => {
    const stored = localStorage.getItem('pingly-theme')
    if (!stored) return THEMES[0]
    const found = THEMES.find(t => t.name === stored)
    return found || THEMES[0]
  })

  useEffect(() => {
    localStorage.setItem('pingly-theme', theme.name)
    document.documentElement.classList.toggle('dark', theme.mode === 'dark')

    const root = document.documentElement
    root.style.setProperty('--theme-bg', theme.bg)
    root.style.setProperty('--theme-surface', theme.surface)
    root.style.setProperty('--theme-surface2', theme.surface2)
    root.style.setProperty('--theme-border', theme.border)
    root.style.setProperty('--theme-text', theme.text)
    root.style.setProperty('--theme-text2', theme.text2)
    root.style.setProperty('--theme-accent', theme.accent)
  }, [theme])

  const setThemeByName = (name: string) => {
    const found = THEMES.find(t => t.name === name)
    if (found) setTheme(found)
  }

  return (
    <ThemeContext.Provider value={{ theme, setThemeByName }}>
      {children}
    </ThemeContext.Provider>
  )
}
