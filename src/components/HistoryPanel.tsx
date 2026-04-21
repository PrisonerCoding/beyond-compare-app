import { useState, useEffect } from 'react'
import {
  getHistory,
  clearHistory,
  deleteHistoryEntry,
  searchHistory,
  type HistoryEntry,
} from '../utils/history'
import {
  History as HistoryIcon,
  Trash2,
  Search,
  FileText,
  FolderOpen,
  GitMerge,
  Binary,
  Image,
  Tag,
  X,
  ChevronRight,
} from 'lucide-react'

interface HistoryPanelProps {
  onOpenHistoryEntry?: (entry: HistoryEntry) => void
  onClose?: () => void
}

export function HistoryPanel({ onOpenHistoryEntry, onClose }: HistoryPanelProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'comparison' | 'sync' | 'merge'>('all')
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = () => {
    const history = getHistory()
    setEntries(history)
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      const results = searchHistory(query)
      setEntries(results)
    } else {
      loadHistory()
    }
  }

  const handleFilter = (type: 'all' | 'comparison' | 'sync' | 'merge') => {
    setFilterType(type)
    const all = getHistory()
    if (type === 'all') {
      setEntries(searchQuery.trim() ? searchHistory(searchQuery) : all)
    } else {
      setEntries(all.filter(e => e.type === type))
    }
  }

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id)
    setEntries(entries.filter(e => e.id !== id))
    if (selectedEntry?.id === id) {
      setSelectedEntry(null)
    }
  }

  const handleClearAll = () => {
    if (window.confirm('Clear all history? This cannot be undone.')) {
      clearHistory()
      setEntries([])
      setSelectedEntry(null)
    }
  }

  const handleOpen = (entry: HistoryEntry) => {
    onOpenHistoryEntry?.(entry)
  }

  const getTypeIcon = (_type: HistoryEntry['type'], mode: HistoryEntry['mode']) => {
    if (mode === 'text') return <FileText size={14} />
    if (mode === 'folder') return <FolderOpen size={14} />
    if (mode === 'merge') return <GitMerge size={14} />
    if (mode === 'binary') return <Binary size={14} />
    if (mode === 'image') return <Image size={14} />
    return <FileText size={14} />
  }

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  const filteredEntries = filterType === 'all'
    ? entries
    : entries.filter(e => e.type === filterType)

  return (
    <div className="history-panel">
      <div className="history-panel-header">
        <span className="history-panel-title">
          <HistoryIcon size={16} />
          Comparison History
        </span>
        <span className="history-count">{entries.length} entries</span>
        {onClose && (
          <button className="history-close-btn" onClick={onClose}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="history-search">
        <Search size={14} className="history-search-icon" />
        <input
          type="text"
          placeholder="Search history..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="history-search-input"
        />
      </div>

      {/* Filters */}
      <div className="history-filters">
        <button
          className={`history-filter-btn ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => handleFilter('all')}
        >
          All
        </button>
        <button
          className={`history-filter-btn ${filterType === 'comparison' ? 'active' : ''}`}
          onClick={() => handleFilter('comparison')}
        >
          Compare
        </button>
        <button
          className={`history-filter-btn ${filterType === 'sync' ? 'active' : ''}`}
          onClick={() => handleFilter('sync')}
        >
          Sync
        </button>
        <button
          className={`history-filter-btn ${filterType === 'merge' ? 'active' : ''}`}
          onClick={() => handleFilter('merge')}
        >
          Merge
        </button>
      </div>

      {/* History list */}
      <div className="history-list">
        {filteredEntries.length === 0 ? (
          <div className="history-empty">
            No history entries found
          </div>
        ) : (
          filteredEntries.map(entry => (
            <div
              key={entry.id}
              className={`history-entry ${selectedEntry?.id === entry.id ? 'selected' : ''}`}
              onClick={() => setSelectedEntry(entry)}
            >
              <div className="history-entry-icon">
                {getTypeIcon(entry.type, entry.mode)}
              </div>
              <div className="history-entry-content">
                <div className="history-entry-title">
                  <span className="history-left-name">{entry.leftName}</span>
                  <span className="history-vs">vs</span>
                  <span className="history-right-name">{entry.rightName}</span>
                </div>
                <div className="history-entry-meta">
                  <span className="history-entry-time">{formatDate(entry.timestamp)}</span>
                  {entry.stats && (
                    <span className="history-entry-stats">
                      {entry.stats.modified ?? entry.stats.diffPixels ?? 0} changes
                    </span>
                  )}
                </div>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="history-entry-tags">
                    {entry.tags.map(tag => (
                      <span key={tag} className="history-tag">
                        <Tag size={10} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="history-entry-open"
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpen(entry)
                }}
                title="Open this comparison"
              >
                <ChevronRight size={14} />
              </button>
              <button
                className="history-entry-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(entry.id)
                }}
                title="Delete from history"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="history-actions">
        <button
          className="history-clear-btn"
          onClick={handleClearAll}
          disabled={entries.length === 0}
        >
          <Trash2 size={14} />
          Clear All
        </button>
      </div>
    </div>
  )
}