import { useState } from 'react'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'

interface FilterRule {
  pattern: string
  type: 'exclude' | 'include'
  mode: 'glob' | 'regex'
}

interface FilterSet {
  name: string
  rules: FilterRule[]
}

interface FilterPanelProps {
  filters: string[]
  onFiltersChange: (filters: string[]) => void
  includeFilters?: string[]
  onIncludeFiltersChange?: (filters: string[]) => void
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

const PRESET_FILTER_SETS: FilterSet[] = [
  {
    name: 'Node.js Project',
    rules: [
      { pattern: 'node_modules', type: 'exclude', mode: 'glob' },
      { pattern: 'dist', type: 'exclude', mode: 'glob' },
      { pattern: 'build', type: 'exclude', mode: 'glob' },
      { pattern: '*.log', type: 'exclude', mode: 'glob' },
      { pattern: '.env*', type: 'exclude', mode: 'glob' },
    ]
  },
  {
    name: 'Python Project',
    rules: [
      { pattern: '__pycache__', type: 'exclude', mode: 'glob' },
      { pattern: '*.pyc', type: 'exclude', mode: 'glob' },
      { pattern: '.venv', type: 'exclude', mode: 'glob' },
      { pattern: 'venv', type: 'exclude', mode: 'glob' },
      { pattern: '*.egg-info', type: 'exclude', mode: 'glob' },
    ]
  },
  {
    name: 'Rust Project',
    rules: [
      { pattern: 'target', type: 'exclude', mode: 'glob' },
      { pattern: '*.rs.bk', type: 'exclude', mode: 'glob' },
    ]
  },
  {
    name: 'Git Repository',
    rules: [
      { pattern: '.git', type: 'exclude', mode: 'glob' },
      { pattern: '.gitignore', type: 'exclude', mode: 'glob' },
    ]
  },
]

export function FilterPanel({
  filters,
  onFiltersChange,
  includeFilters = [],
  onIncludeFiltersChange,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [filterMode, setFilterMode] = useState<'glob' | 'regex'>('glob')
  const [ruleType, setRuleType] = useState<'exclude' | 'include'>('exclude')
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

    if (ruleType === 'exclude') {
      if (!filters.includes(patternToAdd)) {
        onFiltersChange([...filters, patternToAdd])
      }
    } else {
      if (!includeFilters.includes(patternToAdd) && onIncludeFiltersChange) {
        onIncludeFiltersChange([...includeFilters, patternToAdd])
      }
    }
    setInputValue('')
  }

  const removeFilter = (filter: string, type: 'exclude' | 'include') => {
    if (type === 'exclude') {
      onFiltersChange(filters.filter(f => f !== filter))
    } else if (onIncludeFiltersChange) {
      onIncludeFiltersChange(includeFilters.filter(f => f !== filter))
    }
  }

  const toggleFilter = (filter: string, type: 'exclude' | 'include') => {
    if (type === 'exclude') {
      if (filters.includes(filter)) {
        onFiltersChange(filters.filter(f => f !== filter))
      } else {
        onFiltersChange([...filters, filter])
      }
    } else if (onIncludeFiltersChange) {
      if (includeFilters.includes(filter)) {
        onIncludeFiltersChange(includeFilters.filter(f => f !== filter))
      } else {
        onIncludeFiltersChange([...includeFilters, filter])
      }
    }
  }

  const applyPreset = (preset: FilterSet) => {
    const excludePatterns = preset.rules
      .filter(r => r.type === 'exclude')
      .map(r => r.mode === 'regex' ? `regex:${r.pattern}` : r.pattern)
    const includePatterns = preset.rules
      .filter(r => r.type === 'include')
      .map(r => r.mode === 'regex' ? `regex:${r.pattern}` : r.pattern)

    onFiltersChange(excludePatterns)
    if (onIncludeFiltersChange) {
      onIncludeFiltersChange(includePatterns)
    }
  }

  const exportFilters = async () => {
    const filterSet: FilterSet = {
      name: 'Custom Filter Set',
      rules: [
        ...filters.map(f => ({
          pattern: f.startsWith('regex:') ? f.slice(6) : f,
          type: 'exclude' as const,
          mode: f.startsWith('regex:') ? 'regex' as const : 'glob' as const,
        })),
        ...includeFilters.map(f => ({
          pattern: f.startsWith('regex:') ? f.slice(6) : f,
          type: 'include' as const,
          mode: f.startsWith('regex:') ? 'regex' as const : 'glob' as const,
        })),
      ]
    }

    const filePath = await save({
      defaultPath: 'filter-rules.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      title: 'Export Filter Rules',
    })

    if (filePath) {
      await writeTextFile(filePath, JSON.stringify(filterSet, null, 2))
    }
  }

  const importFilters = async () => {
    const filePath = await open({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      title: 'Import Filter Rules',
    })

    if (filePath) {
      try {
        const content = await readTextFile(filePath as string)
        const filterSet = JSON.parse(content) as FilterSet

        const excludePatterns = filterSet.rules
          .filter(r => r.type === 'exclude')
          .map(r => r.mode === 'regex' ? `regex:${r.pattern}` : r.pattern)
        const includePatterns = filterSet.rules
          .filter(r => r.type === 'include')
          .map(r => r.mode === 'regex' ? `regex:${r.pattern}` : r.pattern)

        onFiltersChange(excludePatterns)
        if (onIncludeFiltersChange) {
          onIncludeFiltersChange(includePatterns)
        }
      } catch (e) {
        console.error('Failed to import filters:', e)
      }
    }
  }

  const resetToDefaults = () => {
    onFiltersChange(DEFAULT_GLOB_FILTERS)
    if (onIncludeFiltersChange) {
      onIncludeFiltersChange([])
    }
    setFilterMode('glob')
    setRuleType('exclude')
  }

  const clearAll = () => {
    onFiltersChange([])
    if (onIncludeFiltersChange) {
      onIncludeFiltersChange([])
    }
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
        <span className="filter-count">
          {filters.length + includeFilters.length} active
        </span>
      </div>

      {isExpanded && (
        <div className="filter-content">
          {/* Rule type toggle */}
          <div className="filter-rule-type">
            <span className="filter-rule-label">Rule type:</span>
            <button
              className={`filter-type-btn ${ruleType === 'exclude' ? 'active' : ''}`}
              onClick={() => setRuleType('exclude')}
            >
              Exclude
            </button>
            <button
              className={`filter-type-btn ${ruleType === 'include' ? 'active' : ''}`}
              onClick={() => setRuleType('include')}
            >
              Include
            </button>
          </div>

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
                ? `Glob pattern (${ruleType === 'exclude' ? 'exclude' : 'include only'}...)`
                : `Regex pattern (${ruleType === 'exclude' ? 'exclude' : 'include only'}...)`
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
              className={`filter-add-btn ${ruleType}`}
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

          {/* Preset filter sets */}
          <div className="filter-presets-section">
            <span className="filter-presets-label">Presets:</span>
            <div className="filter-presets-grid">
              {PRESET_FILTER_SETS.map((preset) => (
                <button
                  key={preset.name}
                  className="filter-preset-set-btn"
                  onClick={() => applyPreset(preset)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Quick add presets */}
          <div className="filter-presets">
            <span className="filter-presets-label">
              Quick add ({filterMode}):
            </span>
            {(filterMode === 'glob' ? DEFAULT_GLOB_FILTERS.slice(0, 8) : COMMON_REGEX_FILTERS).map((preset) => {
              const patternKey = filterMode === 'regex' ? `regex:${preset}` : preset
              const isActive = ruleType === 'exclude'
                ? filters.includes(patternKey)
                : includeFilters.includes(patternKey)
              return (
                <button
                  key={preset}
                  className={`filter-preset-btn ${isActive ? 'active' : ''}`}
                  onClick={() => toggleFilter(patternKey, ruleType)}
                >
                  {preset}
                </button>
              )
            })}
          </div>

          {/* Active filters - Exclude */}
          {filters.length > 0 && (
            <div className="filter-active">
              <span className="filter-active-label exclude">
                ❌ Exclude ({filters.length}):
              </span>
              <div className="filter-tags">
                {filters.map((filter) => {
                  const display = getFilterDisplay(filter)
                  return (
                    <div key={filter} className="filter-tag exclude">
                      {display.badge && (
                        <span className="filter-tag-badge">{display.badge}</span>
                      )}
                      <span className="filter-tag-name">{display.text}</span>
                      <button
                        className="filter-tag-remove"
                        onClick={() => removeFilter(filter, 'exclude')}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Active filters - Include */}
          {includeFilters.length > 0 && (
            <div className="filter-active">
              <span className="filter-active-label include">
                ✅ Include only ({includeFilters.length}):
              </span>
              <div className="filter-tags">
                {includeFilters.map((filter) => {
                  const display = getFilterDisplay(filter)
                  return (
                    <div key={filter} className="filter-tag include">
                      {display.badge && (
                        <span className="filter-tag-badge">{display.badge}</span>
                      )}
                      <span className="filter-tag-name">{display.text}</span>
                      <button
                        className="filter-tag-remove"
                        onClick={() => removeFilter(filter, 'include')}
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="filter-actions">
            <button className="filter-action-btn" onClick={resetToDefaults}>
              Reset Defaults
            </button>
            <button className="filter-action-btn" onClick={importFilters}>
              Import
            </button>
            <button className="filter-action-btn" onClick={exportFilters}>
              Export
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