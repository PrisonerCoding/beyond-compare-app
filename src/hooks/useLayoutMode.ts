import { useState, useEffect } from 'react'

export type LayoutMode = 'horizontal' | 'vertical'

const STORAGE_KEY = 'beyond-compare-layout-mode'

export function useLayoutMode(): {
  layoutMode: LayoutMode
  setLayoutMode: (mode: LayoutMode) => void
  toggleLayout: () => void
} {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return (stored as LayoutMode) || 'horizontal'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, layoutMode)
  }, [layoutMode])

  const toggleLayout = () => {
    setLayoutMode(layoutMode === 'horizontal' ? 'vertical' : 'horizontal')
  }

  return {
    layoutMode,
    setLayoutMode,
    toggleLayout,
  }
}