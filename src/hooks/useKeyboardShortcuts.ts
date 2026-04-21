import { useEffect, useCallback } from 'react'

interface KeyboardShortcuts {
  onSaveLeft?: () => void
  onSaveRight?: () => void
  onOpenLeft?: () => void
  onOpenRight?: () => void
  onSwap?: () => void
  onRefresh?: () => void
  onNextDiff?: () => void
  onPrevDiff?: () => void
  onNewSession?: () => void
  onOpenSession?: () => void
  onSaveSession?: () => void
  onGoToLine?: () => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ctrl/Cmd + S: Save
    if ((event.ctrlKey || event.metaKey) && event.key === 's' && !event.shiftKey) {
      event.preventDefault()

      const activeElement = document.activeElement
      const leftPane = document.querySelector('.left-pane')
      const rightPane = document.querySelector('.right-pane')

      if (leftPane?.contains(activeElement)) {
        shortcuts.onSaveLeft?.()
      } else if (rightPane?.contains(activeElement)) {
        shortcuts.onSaveRight?.()
      } else {
        shortcuts.onSaveLeft?.()
        shortcuts.onSaveRight?.()
      }
    }

    // Ctrl/Cmd + Shift + S: Swap files
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
      event.preventDefault()
      shortcuts.onSwap?.()
    }

    // Ctrl/Cmd + O: Open file
    if ((event.ctrlKey || event.metaKey) && event.key === 'o' && !event.shiftKey) {
      event.preventDefault()
      shortcuts.onOpenLeft?.()
    }

    // Ctrl/Cmd + Shift + O: Open right file
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'O') {
      event.preventDefault()
      shortcuts.onOpenRight?.()
    }

    // Ctrl/Cmd + W: Close/Refresh
    if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
      event.preventDefault()
      shortcuts.onRefresh?.()
    }

    // F7: Previous difference
    if (event.key === 'F7') {
      event.preventDefault()
      shortcuts.onPrevDiff?.()
    }

    // F8: Next difference
    if (event.key === 'F8') {
      event.preventDefault()
      shortcuts.onNextDiff?.()
    }

    // Ctrl/Cmd + N: New session
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault()
      shortcuts.onNewSession?.()
    }

    // Ctrl/Cmd + Shift + S: Save session (when no files loaded)
    if ((event.ctrlKey || event.metaKey) && event.key === 's' && event.shiftKey) {
      // Already handled by swap, but we can also use for session save
    }

    // Ctrl/Cmd + G: Go to line
    if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
      event.preventDefault()
      shortcuts.onGoToLine?.()
    }

    // Escape: Cancel/close
    if (event.key === 'Escape') {
      shortcuts.onRefresh?.()
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}