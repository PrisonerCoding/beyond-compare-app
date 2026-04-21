import { useState } from 'react'

interface FilterPanelProps {
  filters: string[]
  onFiltersChange: (filters: string[]) => void
}

const DEFAULT_GLOB_FILTERS = [
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  '.DS_Store',
  'Thumbs.db',
  '*.min.js',
  '*.min.css',
  '*.log',
  '.env',
  '.env.local',
  '.env.*.local',
  'dist',
  'build',
  'target',
  '__pycache__',
  '*.pyc',
  '.idea',
  '.vscode',
  '*.swp',
  '*.swo',
]

const COMMON_REGEX_FILTERS = [
  '\\.min\\.(js|css)$',
  '\\.log$',
  '^\\.env',
  '\\.(pyc|pyo)$',
  '(dist|build|target)$',
  '__pycache__',
]

export function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [filterMode, setFilterMode] = useState<'glob' | 'regex'>('glob')
  const [regexError, setRegexError] = useState<string | null>(null)

  const validateRegex = (pattern: string): boolean => {
    try {
      new RegExp(pattern)
      setRegexError(null)
      return true
    } catch (e) {
      setRegexError(`Invalid regex: ${(e as Error).message}`)
      return false
    }
  }

  const addFilter = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    // For regex mode, validate before adding
    if (filterMode === 'regex' && !validateRegex(trimmed)) {
      return
    }

    // Add prefix to distinguish regex from glob
    const patternToAdd = filterMode === 'regex' ? `regex:${trimmed}` : trimmed

    if (!filters.includes(patternToAdd)) {
      onFiltersChange([...filters, patternToAdd])
      setInputValue('')
    }
  }

  const removeFilter = (filter: string) => {
    onFiltersChange(filters.filter(f => f !== filter))
  }

  const toggleFilter = (filter: string) => {
    if (filters.includes(filter)) {
      onFiltersChange(filters.filter(f => f !== filter))
    } else {
      onFiltersChange([...filters, filter])
    }
  }

  const resetToDefaults = () => {
    onFiltersChange(DEFAULT_GLOB_FILTERS)
    setFilterMode('glob')
  }

  const clearAll = () => {
    onFiltersChange([])
  }

  const getFilterDisplay = (filter: string) => {
    if (filter.startsWith('regex:')) {
      return { text: filter.slice(6), badge: 'RX' }
    }
    return { text: filter, badge: null }
  }

  return (
    <div className="filter-panel">
      <div className="filter-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="filter-header-icon">{isExpanded ? '▼' : '▶'}</span>
        <span className="filter-header-title">Filters</span>
        <span className="filter-count">{filters.length} active</span>
      </div>

      {isExpanded && (
        <div className="filter-content">
          {/* Mode toggle */}
          <div className="filter-mode-toggle">
            <button
              className={`filter-mode-btn ${filterMode === 'glob' ? 'active' : ''}`}
              onClick={() => setFilterMode('glob')}
            >
              Glob
            </button>
            <button
              className={`filter-mode-btn ${filterMode === 'regex' ? 'active' : ''}`}
              onClick={() => setFilterMode('regex')}
            >
              Regex
            </button>
          </div>

          <div className="filter-input-row">
            <input
              type="text"
              className="filter-input"
              placeholder={filterMode === 'glob'
                ? 'Glob pattern (e.g., *.log, node_modules)'
                : 'Regex pattern (e.g., \\.min\\.(js|css)$)'
              }
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value)
                if (filterMode === 'regex') {
                  validateRegex(e.target.value)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addFilter()
                }
              }}
            />
            <button
              className="filter-add-btn"
              onClick={addFilter}
              disabled={!inputValue.trim() || (filterMode === 'regex' && regexError !== null)}
            >
              Add
            </button>
          </div>

          {/* Regex error display */}
          {filterMode === 'regex' && regexError && (
            <div className="filter-error">
              {regexError}
            </div>
          )}

          {/* Quick add presets */}
          <div className="filter-presets">
            <span className="filter-presets-label">
              Quick add ({filterMode}):
            </span>
            {(filterMode === 'glob' ? DEFAULT_GLOB_FILTERS.slice(0, 8) : COMMON_REGEX_FILTERS).map((preset) => {
              const patternKey = filterMode === 'regex' ? `regex:${preset}` : preset
              return (
                <button
                  key={preset}
                  className={`filter-preset-btn ${filters.includes(patternKey) ? 'active' : ''}`}
                  onClick={() => toggleFilter(patternKey)}
                >
                  {preset}
                </button>
              )
            })}
          </div>

          {/* Active filters */}
          <div className="filter-active">
            <span className="filter-active-label">Active filters:</span>
            {filters.length === 0 ? (
              <span className="filter-empty-message">No filters active</span>
            ) : (
              <div className="filter-tags">
                {filters.map((filter) => {
                  const display = getFilterDisplay(filter)
                  return (
                    <div key={filter} className="filter-tag">
                      {display.badge && (
                        <span className="filter-tag-badge">{display.badge}</span>
                      )}
                      <span className="filter-tag-name">{display.text}</span>
                      <button
                        className="filter-tag-remove"
                        onClick={() => removeFilter(filter)}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="filter-actions">
            <button className="filter-action-btn" onClick={resetToDefaults}>
              Reset to Defaults
            </button>
            <button className="filter-action-btn danger" onClick={clearAll}>
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Filter matching utility - supports glob and regex patterns
export function matchesFilter(path: string, filters: string[]): boolean {
  const relativePath = path.replace(/\\/g, '/')
  const fileName = relativePath.split('/').pop() || ''

  for (const filter of filters) {
    // Regex pattern (prefixed with regex:)
    if (filter.startsWith('regex:')) {
      const pattern = filter.slice(6)
      try {
        const regex = new RegExp(pattern)
        if (regex.test(relativePath) || regex.test(fileName)) {
          return true
        }
      } catch {
        // Invalid regex, skip
        continue
      }
    }
    // Directory filter (no wildcard)
    else if (!filter.includes('*') && !filter.includes('.')) {
      if (relativePath.includes(`/${filter}/`) || relativePath.startsWith(`${filter}/`)) {
        return true
      }
    }
    // Extension filter (*.ext)
    else if (filter.startsWith('*.')) {
      const ext = filter.slice(1) // *.log -> .log
      if (relativePath.endsWith(ext)) {
        return true
      }
    }
    // Wildcard pattern (*.min.js)
    else if (filter.includes('*')) {
      const pattern = filter.replace(/\*/g, '.*')
      const regex = new RegExp(pattern)
      if (regex.test(fileName)) {
        return true
      }
    }
    // Exact match
    else if (relativePath.endsWith(`/${filter}`) || relativePath === filter) {
      return true
    }
  }

  return false
}