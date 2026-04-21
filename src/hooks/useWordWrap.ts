import { useState, useEffect } from 'react'

export type WordWrapMode = 'on' | 'off'

const STORAGE_KEY = 'beyond-compare-word-wrap'

export function useWordWrap(): {
  wordWrap: WordWrapMode
  setWordWrap: (mode: WordWrapMode) => void
  toggleWordWrap: () => void
} {
  const [wordWrap, setWordWrap] = useState<WordWrapMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return (stored as WordWrapMode) || 'off'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, wordWrap)
  }, [wordWrap])

  const toggleWordWrap = () => {
    setWordWrap(wordWrap === 'on' ? 'off' : 'on')
  }

  return {
    wordWrap,
    setWordWrap,
    toggleWordWrap,
  }
}