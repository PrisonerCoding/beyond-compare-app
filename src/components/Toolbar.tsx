import { useState, useEffect, useRef } from 'react'
import type { CompareMode, LayoutMode } from '../types'
import { getRecentSessions, clearRecentSessions, type RecentSession } from '../utils/session'
import {
  FileText,
  FolderOpen,
  GitMerge,
  Binary,
  Image,
  Plus,
  FolderCog,
  Save,
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  MapPin,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  Settings,
  ArrowDownUp,
  RefreshCw,
  FileOutput,
  ArrowLeftRight,
} from 'lucide-react'

const COMPARE_MODES: CompareMode[] = [
  { type: 'text', label: 'Text', icon: 'FileText' },
  { type: 'folder', label: 'Folder', icon: 'FolderOpen' },
  { type: 'merge', label: 'Merge', icon: 'GitMerge' },
  { type: 'binary', label: 'Binary', icon: 'Binary' },
  { type: 'image', label: 'Image', icon: 'Image' },
]

interface ToolbarProps {
  currentMode: CompareMode
  onModeChange: (mode: CompareMode) => void
  onSwap?: () => void
  onRefresh?: () => void
  onNewSession?: () => void
  onOpenSession?: () => void
  onSaveSession?: () => void
  onOpenRecentSession?: (path: string) => void
  onPrevDiff?: () => void
  onNextDiff?: () => void
  onFirstDiff?: () => void
  onLastDiff?: () => void
  onGoToLine?: () => void
  layoutMode?: LayoutMode
  onLayoutChange?: (mode: LayoutMode) => void
  wordWrap?: 'on' | 'off'
  onWordWrapChange?: (mode: 'on' | 'off') => void
  showCompareOptions?: boolean
  onToggleCompareOptions?: () => void
  showBookmarkPanel?: boolean
  onToggleBookmarkPanel?: () => void
  bookmarkCount?: number
  onPrevBookmark?: () => void
  onNextBookmark?: () => void
  onExportReport?: () => void
  showDiffStats?: boolean
  onToggleDiffStats?: () => void
  diffCount?: number
  currentDiffIndex?: number
  hasFiles?: boolean
}

export function Toolbar({
  currentMode,
  onModeChange,
  onSwap,
  onRefresh,
  onNewSession,
  onOpenSession,
  onSaveSession,
  onOpenRecentSession,
  onPrevDiff,
  onNextDiff,
  onFirstDiff,
  onLastDiff,
  onGoToLine,
  layoutMode = 'horizontal',
  onLayoutChange,
  wordWrap = 'off',
  onWordWrapChange,
  showCompareOptions = false,
  onToggleCompareOptions,
  showBookmarkPanel: _showBookmarkPanel = false,
  onToggleBookmarkPanel,
  bookmarkCount = 0,
  onPrevBookmark,
  onNextBookmark,
  onExportReport,
  showDiffStats: _showDiffStats = false,
  onToggleDiffStats,
  diffCount = 0,
  currentDiffIndex = 0,
  hasFiles = false,
}: ToolbarProps) {
  const [showRecentMenu, setShowRecentMenu] = useState(false)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const recentMenuRef = useRef<HTMLDivElement>(null)

  // Icon mapping for dynamic rendering
  const getModeIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      FileText: <FileText size={14} />,
      FolderOpen: <FolderOpen size={14} />,
      GitMerge: <GitMerge size={14} />,
      Binary: <Binary size={14} />,
      Image: <Image size={14} />,
    }
    return icons[iconName] || null
  }

  // Load recent sessions
  useEffect(() => {
    setRecentSessions(getRecentSessions())
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (recentMenuRef.current && !recentMenuRef.current.contains(e.target as Node)) {
        setShowRecentMenu(false)
      }
    }

    if (showRecentMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showRecentMenu])

  const handleClearRecent = () => {
    clearRecentSessions()
    setRecentSessions([])
    setShowRecentMenu(false)
  }

  const handleOpenRecent = (path: string) => {
    onOpenRecentSession?.(path)
    setShowRecentMenu(false)
  }

  return (
    <div className="toolbar-container">
      {/* Primary Toolbar */}
      <div className="toolbar toolbar-primary">
        <div className="toolbar-logo">
          <div className="toolbar-logo-icon">
            <ArrowDownUp size={14} />
          </div>
          <span className="toolbar-logo-text">DiffLens</span>
        </div>

        <div className="toolbar-divider" />

        {/* Session Controls */}
        <div className="toolbar-session">
          <button className="toolbar-btn" onClick={onNewSession} title="New Session (Ctrl+N)">
            <Plus size={14} />
          </button>

          {/* Open button with dropdown */}
          <div className="toolbar-btn-group" ref={recentMenuRef}>
            <button
              className="toolbar-btn"
              onClick={onOpenSession}
              title="Open Session (Ctrl+O)"
            >
              <FolderOpen size={14} />
            </button>

            {recentSessions.length > 0 && (
              <button
                className={`toolbar-btn dropdown-toggle ${showRecentMenu ? 'active' : ''}`}
                onClick={() => setShowRecentMenu(!showRecentMenu)}
                title="Recent Sessions"
              >
                <ChevronDownIcon size={10} />
              </button>
            )}

            {/* Recent Sessions Dropdown */}
            {showRecentMenu && (
              <div className="recent-menu">
                <div className="recent-menu-header">
                  <span>Recent Sessions</span>
                  <button className="recent-clear-btn" onClick={handleClearRecent}>
                    Clear
                  </button>
                </div>
                <div className="recent-menu-list">
                  {recentSessions.map((session, index) => (
                    <button
                      key={index}
                      className="recent-menu-item"
                      onClick={() => handleOpenRecent(session.path)}
                      title={session.path}
                    >
                      <FolderCog size={14} className="recent-item-icon" />
                      <span className="recent-item-name">{session.name}</span>
                      <span className="recent-item-summary">{session.summary}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button className="toolbar-btn" onClick={onSaveSession} title="Save Session (Ctrl+S)">
            <Save size={14} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Compare Modes */}
        <div className="toolbar-modes">
          {COMPARE_MODES.map((mode) => (
            <button
              key={mode.type}
              className={`mode-btn ${currentMode.type === mode.type ? 'active' : ''}`}
              onClick={() => onModeChange(mode)}
              title={`${mode.label} Compare`}
            >
              <span className="mode-btn-icon">{getModeIcon(mode.icon || '')}</span>
              <span className="mode-btn-text">{mode.label}</span>
            </button>
          ))}
        </div>

        {/* Spacer to push right-aligned items */}
        <div className="toolbar-spacer" />

        {/* Quick Actions */}
        <div className="toolbar-quick-actions">
          {/* Layout Toggle */}
          <button
            className="toolbar-btn"
            onClick={() => onLayoutChange?.(layoutMode === 'horizontal' ? 'vertical' : 'horizontal')}
            title={layoutMode === 'horizontal' ? 'Switch to vertical layout' : 'Switch to horizontal layout'}
          >
            {layoutMode === 'horizontal' ? <ArrowDownUp size={14} /> : <ArrowLeftRight size={14} />}
          </button>

          {/* Compare Options Toggle */}
          <button
            className={`toolbar-btn ${showCompareOptions ? 'active' : ''}`}
            onClick={onToggleCompareOptions}
            title="Toggle compare options"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Secondary Toolbar */}
      <div className="toolbar toolbar-secondary">
        {/* Navigation Controls */}
        <div className="toolbar-nav">
          <span className="nav-label">Diff:</span>
          <button
            className="nav-btn"
            onClick={onFirstDiff}
            disabled={!hasFiles || diffCount === 0}
            title="First Difference"
          >
            <ChevronFirst size={12} />
          </button>
          <button
            className="nav-btn"
            onClick={onPrevDiff}
            disabled={!hasFiles || diffCount === 0}
            title="Previous Difference (F7)"
          >
            <ChevronUp size={12} />
          </button>
          <div className="diff-counter" title={`${currentDiffIndex + 1} of ${diffCount} differences`}>
            {hasFiles && diffCount > 0 ? `${currentDiffIndex + 1}/${diffCount}` : '0/0'}
          </div>
          <button
            className="nav-btn"
            onClick={onNextDiff}
            disabled={!hasFiles || diffCount === 0}
            title="Next Difference (F8)"
          >
            <ChevronDown size={12} />
          </button>
          <button
            className="nav-btn"
            onClick={onLastDiff}
            disabled={!hasFiles || diffCount === 0}
            title="Last Difference"
          >
            <ChevronLast size={12} />
          </button>
          <button
            className="nav-btn goto-btn"
            onClick={onGoToLine}
            disabled={!hasFiles}
            title="Go to Line (Ctrl+G)"
          >
            <MapPin size={12} />
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* Bookmark Navigation */}
        <div className="toolbar-bookmarks">
          <span className="nav-label">Bookmarks:</span>
          <button
            className="nav-btn bookmark-toggle-btn"
            onClick={onToggleBookmarkPanel}
            title="Toggle bookmark panel"
          >
            <Bookmark size={12} />
            {bookmarkCount > 0 && (
              <span className="bookmark-badge">{bookmarkCount}</span>
            )}
          </button>
          <button
            className="nav-btn"
            onClick={onPrevBookmark}
            disabled={bookmarkCount === 0}
            title="Previous bookmark"
          >
            <ChevronLeft size={12} />
          </button>
          <button
            className="nav-btn"
            onClick={onNextBookmark}
            disabled={bookmarkCount === 0}
            title="Next bookmark"
          >
            <ChevronRight size={12} />
          </button>
        </div>

        {/* Spacer */}
        <div className="toolbar-spacer" />

        {/* Secondary Actions */}
        <div className="toolbar-secondary-actions">
          {/* Diff Stats Toggle */}
          <button
            className="toolbar-btn icon-only"
            onClick={onToggleDiffStats}
            title="Show detailed statistics"
          >
            <BarChart2 size={14} />
          </button>

          {/* Word Wrap Toggle */}
          <button
            className={`toolbar-btn icon-only ${wordWrap === 'on' ? 'active' : ''}`}
            onClick={() => onWordWrapChange?.(wordWrap === 'on' ? 'off' : 'on')}
            title={wordWrap === 'on' ? 'Disable word wrap' : 'Enable word wrap'}
          >
            <ArrowDownUp size={14} />
          </button>

          {/* Refresh */}
          <button className="toolbar-btn icon-only" onClick={onRefresh} title="Refresh (F5)">
            <RefreshCw size={14} />
          </button>

          {/* Export Report */}
          <button
            className="toolbar-btn icon-only"
            onClick={onExportReport}
            disabled={!hasFiles}
            title="Export diff report as HTML"
          >
            <FileOutput size={14} />
          </button>

          {/* Swap */}
          <button className="toolbar-btn icon-only" onClick={onSwap} title="Swap Sides (Ctrl+Shift+S)">
            <ArrowLeftRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}