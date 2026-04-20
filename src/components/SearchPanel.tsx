import { useState, useEffect, useRef } from 'react'

interface SearchPanelProps {
  isOpen: boolean
  onClose: () => void
  editorRef: any
  side: 'left' | 'right'
}

const MAX_SEARCH_HISTORY = 20
const SEARCH_HISTORY_KEY = 'bc_search_history'

function getSearchHistory(): string[] {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (!stored) return []
    return JSON.parse(stored) as string[]
  } catch {
    return []
  }
}

function addToSearchHistory(term: string): void {
  if (!term.trim()) return

  const history = getSearchHistory()
  const filtered = history.filter(h => h !== term)
  const updated = [term, ...filtered].slice(0, MAX_SEARCH_HISTORY)
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated))
}

export function SearchPanel({ isOpen, onClose, editorRef, side }: SearchPanelProps) {
  const [searchText, setSearchText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const [isCaseSensitive, setIsCaseSensitive] = useState(false)
  const [matchCount, setMatchCount] = useState(0)
  const [currentMatch, setCurrentMatch] = useState(0)
  const [showReplace, setShowReplace] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  const searchInputRef = useRef<HTMLInputElement>(null)
  const historyRef = useRef<HTMLDivElement>(null)

  // Load history on mount
  useEffect(() => {
    setSearchHistory(getSearchHistory())
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
      setSearchText('')
      setReplaceText('')
      setMatchCount(0)
      setCurrentMatch(0)
    }
  }, [isOpen])

  // Close history menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false)
      }
    }

    if (showHistory) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showHistory])

  const handleSearch = () => {
    if (!editorRef || !searchText) return

    addToSearchHistory(searchText)
    setSearchHistory(getSearchHistory())

    const editor = side === 'left'
      ? editorRef.getOriginalEditor()
      : editorRef.getModifiedEditor()

    if (!editor) return

    const findController = editor.getContribution('editor.contrib.findController')

    if (findController) {
      findController.setSearchString(searchText)

      const options = {
        regex: isRegex,
        caseSensitive: isCaseSensitive,
        wholeWord: false,
      }

      findController.changeOptions(options)

      // Get match count
      const findModel = findController.getModel()
      if (findModel) {
        const matches = findModel.findMatches()
        setMatchCount(matches.length)
        setCurrentMatch(findModel.currentMatchIndex + 1)
      }
    }
  }

  const handleFindNext = () => {
    if (!editorRef) return

    handleSearch()

    const editor = side === 'left'
      ? editorRef.getOriginalEditor()
      : editorRef.getModifiedEditor()

    editor.trigger('search', 'editor.action.nextMatchFindAction', null)

    // Update current match
    setTimeout(() => {
      const findController = editor.getContribution('editor.contrib.findController')
      if (findController) {
        const findModel = findController.getModel()
        if (findModel) {
          setCurrentMatch(findModel.currentMatchIndex + 1)
        }
      }
    }, 100)
  }

  const handleFindPrev = () => {
    if (!editorRef) return

    handleSearch()

    const editor = side === 'left'
      ? editorRef.getOriginalEditor()
      : editorRef.getModifiedEditor()

    editor.trigger('search', 'editor.action.previousMatchFindAction', null)

    // Update current match
    setTimeout(() => {
      const findController = editor.getContribution('editor.contrib.findController')
      if (findController) {
        const findModel = findController.getModel()
        if (findModel) {
          setCurrentMatch(findModel.currentMatchIndex + 1)
        }
      }
    }, 100)
  }

  const handleReplace = () => {
    if (!editorRef || !searchText) return

    const editor = side === 'left'
      ? editorRef.getOriginalEditor()
      : editorRef.getModifiedEditor()

    const findController = editor.getContribution('editor.contrib.findController')

    if (findController && replaceText) {
      findController.setSearchString(searchText)
      findController.setReplaceString(replaceText)
      findController.replace()

      // Update match count after replace
      setTimeout(() => {
        const findModel = findController.getModel()
        if (findModel) {
          const matches = findModel.findMatches()
          setMatchCount(matches.length)
          setCurrentMatch(Math.min(findModel.currentMatchIndex + 1, matches.length))
        }
      }, 100)
    }
  }

  const handleReplaceAll = () => {
    if (!editorRef || !searchText) return

    const editor = side === 'left'
      ? editorRef.getOriginalEditor()
      : editorRef.getModifiedEditor()

    const findController = editor.getContribution('editor.contrib.findController')

    if (findController && replaceText) {
      findController.setSearchString(searchText)
      findController.setReplaceString(replaceText)
      findController.replaceAll()

      setMatchCount(0)
      setCurrentMatch(0)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (showReplace && e.shiftKey) {
        handleReplace()
      } else {
        handleFindNext()
      }
    } else if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown' && showHistory) {
      // Navigate history (handled by history list)
    }
  }

  const selectHistoryItem = (term: string) => {
    setSearchText(term)
    setShowHistory(false)
    searchInputRef.current?.focus()
  }

  if (!isOpen) return null

  return (
    <div className="search-panel">
      <div className="search-header">
        <span className="search-title">Find {showReplace ? '& Replace' : ''}</span>
        <span className="search-side-badge">{side === 'left' ? 'L' : 'R'}</span>
        <button className="search-toggle" onClick={() => setShowReplace(!showReplace)}>
          {showReplace ? '◀ Find' : '▶ Replace'}
        </button>
        <button className="search-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="search-content">
        <div className="search-row">
          <div className="search-input-wrapper" ref={historyRef}>
            <input
              ref={searchInputRef}
              type="text"
              className="search-input"
              placeholder="Search..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value)
                setShowHistory(false)
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (searchHistory.length > 0) {
                  setShowHistory(true)
                }
              }}
            />

            {/* Search History Dropdown */}
            {showHistory && searchHistory.length > 0 && (
              <div className="search-history">
                {searchHistory.slice(0, 10).map((term, index) => (
                  <button
                    key={index}
                    className="search-history-item"
                    onClick={() => selectHistoryItem(term)}
                  >
                    <span className="history-icon">🔍</span>
                    <span className="history-text">{term}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="search-btn" onClick={handleFindPrev} disabled={!searchText} title="Previous match">
            ↑
          </button>
          <button className="search-btn" onClick={handleFindNext} disabled={!searchText} title="Next match">
            ↓
          </button>
        </div>

        {showReplace && (
          <div className="search-row">
            <input
              type="text"
              className="search-input"
              placeholder="Replace with..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="search-btn replace" onClick={handleReplace} disabled={!searchText || !replaceText} title="Replace">
              ⤿
            </button>
            <button className="search-btn replace-all" onClick={handleReplaceAll} disabled={!searchText || !replaceText} title="Replace All">
              ⤿*
            </button>
          </div>
        )}

        <div className="search-options">
          <label className="search-option">
            <input
              type="checkbox"
              className="search-checkbox"
              checked={isCaseSensitive}
              onChange={(e) => setIsCaseSensitive(e.target.checked)}
            />
            Aa
          </label>
          <label className="search-option">
            <input
              type="checkbox"
              className="search-checkbox"
              checked={isRegex}
              onChange={(e) => setIsRegex(e.target.checked)}
            />
            .*
          </label>
        </div>

        {/* Match count */}
        <div className="search-stats">
          {searchText ? (
            matchCount > 0
              ? `${currentMatch} of ${matchCount} matches`
              : 'No matches'
          ) : 'Enter search term'}
        </div>
      </div>
    </div>
  )
}

// Hook for managing search state
export function useSearchPanel(editorRef: any) {
  const [leftSearchOpen, setLeftSearchOpen] = useState(false)
  const [rightSearchOpen, setRightSearchOpen] = useState(false)

  const openLeftSearch = () => setLeftSearchOpen(true)
  const openRightSearch = () => setRightSearchOpen(true)
  const closeLeftSearch = () => setLeftSearchOpen(false)
  const closeRightSearch = () => setRightSearchOpen(false)

  return {
    leftSearchOpen,
    rightSearchOpen,
    openLeftSearch,
    openRightSearch,
    closeLeftSearch,
    closeRightSearch,
  }
}