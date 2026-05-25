import { useTheme, THEMES } from '@/contexts/ThemeContext'

const PREVIEW_CLASSES: Record<string, string[]> = {
  Default: ['bg-[#e8eaed]', 'bg-[#d1d5db]', 'bg-[#eab308]'],
  Dark: ['bg-[#1a1a1a]', 'bg-[#2a2a1a]', 'bg-[#eab308]'],
  Midnight: ['bg-[#161b22]', 'bg-[#0d2a35]', 'bg-[#06b6d4]'],
  Rainbow: ['bg-[#fce7f3]', 'bg-[#ede9fe]', 'bg-[#dbeafe]'],
  Ocean: ['bg-[#dbeafe]', 'bg-[#e0f7fa]', 'bg-[#bae6fd]'],
  Forest: ['bg-[#dcfce7]', 'bg-[#d1fae5]', 'bg-[#a7f3d0]'],
  Sunset: ['bg-[#fef3c7]', 'bg-[#fce7f3]', 'bg-[#fde68a]'],
  Lavender: ['bg-[#f3e8ff]', 'bg-[#fce7f3]', 'bg-[#e9d5ff]'],
  Nord: ['bg-[#e5e9f0]', 'bg-[#d8dee9]', 'bg-[#5e81ac]'],
  Mono: ['bg-[#f1f3f5]', 'bg-[#e9ecef]', 'bg-[#dee2e6]'],
}

export default function ThemePicker() {
  const { theme, setThemeByName } = useTheme()
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {THEMES.map(t => {
        const isActive = t.name === theme.name
        return (
          <button
            key={t.name}
            onClick={() => setThemeByName(t.name)}
            className={`flex flex-col items-center p-1.5 rounded-xl border-2 transition-opacity hover:opacity-90 ${isActive ? 'border-accent bg-accent/10' : 'border-transparent'}`}
          >
            <div className="relative w-full aspect-square rounded-lg overflow-hidden flex">
              {(PREVIEW_CLASSES[t.name] ?? []).map((className, i) => (
                <div key={i} className={`flex-1 ${className}`} />
              ))}
              <div className="absolute bottom-0 left-0 right-0 text-center bg-black/40 px-1 py-1">
                <span className="text-[10px] font-medium text-white">{t.name}</span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
