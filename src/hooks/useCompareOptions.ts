import { useState, useEffect } from 'react'

export interface CompareOptions {
  ignoreWhitespace: boolean
  ignoreCase: boolean
  ignoreTrimWhitespace: boolean
}

const STORAGE_KEY = 'beyond-compare-options'

const DEFAULT_OPTIONS: CompareOptions = {
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreTrimWhitespace: false,
}

export function useCompareOptions(): {
  options: CompareOptions
  setOptions: (options: CompareOptions) => void
  toggleOption: (key: keyof CompareOptions) => void
  resetOptions: () => void
} {
  const [options, setOptions] = useState<CompareOptions>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        return { ...DEFAULT_OPTIONS, ...JSON.parse(stored) }
      } catch {
        return DEFAULT_OPTIONS
      }
    }
    return DEFAULT_OPTIONS
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
  }, [options])

  const toggleOption = (key: keyof CompareOptions) => {
    setOptions({ ...options, [key]: !options[key] })
  }

  const resetOptions = () => {
    setOptions(DEFAULT_OPTIONS)
  }

  return {
    options,
    setOptions,
    toggleOption,
    resetOptions,
  }
}