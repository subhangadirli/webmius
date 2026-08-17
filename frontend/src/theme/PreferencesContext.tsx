import { createContext, useContext, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'webmius-terminal-font-size'
const DEFAULT_FONT_SIZE = 14
const MIN_FONT_SIZE = 10
const MAX_FONT_SIZE = 24

function clamp(size: number): number {
  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size))
}

// localStorage can be unavailable or throw (Safari private browsing, a
// sandboxed test environment, etc.), and that should never break rendering —
// worst case the preference just stops persisting across reloads.
function readStoredFontSize(): number {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY))
    return stored ? clamp(stored) : DEFAULT_FONT_SIZE
  } catch {
    return DEFAULT_FONT_SIZE
  }
}

function writeStoredFontSize(size: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(size))
  } catch {
    // ignore
  }
}

interface PreferencesContextValue {
  terminalFontSize: number
  setTerminalFontSize: (size: number) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [terminalFontSize, setFontSize] = useState<number>(readStoredFontSize)

  const setTerminalFontSize = (size: number) => {
    const clamped = clamp(size)
    setFontSize(clamped)
    writeStoredFontSize(clamped)
  }

  return (
    <PreferencesContext.Provider value={{ terminalFontSize, setTerminalFontSize }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within a PreferencesProvider')
  return ctx
}

export { MIN_FONT_SIZE, MAX_FONT_SIZE }
