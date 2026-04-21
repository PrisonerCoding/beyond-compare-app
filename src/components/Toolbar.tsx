import { useState, useEffect, useRef } from 'react'
import type { CompareMode, LayoutMode } from '../types'
import { getRecentSessions, clearRecentSessions, type RecentSession } from '../utils/session'

const COMPARE_MODES: CompareMode[] = [
  { type: 'text', label: 'Text', icon: '📄' },
  { type: 'folder', label: 'Folder', icon: '📁' },
  { type: 'merge', label: 'Merge', icon: '🔀' },
  { type: 'binary', label: 'Binary', icon: '🔢' },
  { type: 'image', label: 'Image', icon: '🖼️' },
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
  diffCount = 0,
  currentDiffIndex = 0,
  hasFiles = false,
}: ToolbarProps) {
  const [showRecentMenu, setShowRecentMenu] = useState(false)
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([])
  const recentMenuRef = useRef<HTMLDivElement>(null)

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
    <div className="toolbar">
      <div className="toolbar-logo">
        <div className="toolbar-logo-icon">⚡</div>
        <span className="toolbar-logo-text">Beyond Compare</span>
      </div>

      <div className="toolbar-divider" />

      {/* Session Controls */}
      <div className="toolbar-session">
        <button className="toolbar-btn" onClick={onNewSession} title="New Session (Ctrl+N)">
          <span className="toolbar-btn-icon">+</span>
        </button>

        {/* Open button with dropdown */}
        <div className="toolbar-btn-group" ref={recentMenuRef}>
          <button
            className="toolbar-btn"
            onClick={onOpenSession}
            title="Open Session (Ctrl+O)"
          >
            <span className="toolbar-btn-icon">📂</span>
          </button>

          {recentSessions.length > 0 && (
            <button
              className={`toolbar-btn dropdown-toggle ${showRecentMenu ? 'active' : ''}`}
              onClick={() => setShowRecentMenu(!showRecentMenu)}
              title="Recent Sessions"
            >
              <span className="toolbar-btn-icon">▼</span>
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
                    <span className="recent-item-icon">📋</span>
                    <span className="recent-item-name">{session.name}</span>
                    <span className="recent-item-summary">{session.summary}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="toolbar-btn" onClick={onSaveSession} title="Save Session (Ctrl+S)">
          <span className="toolbar-btn-icon">💾</span>
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
            <span className="mode-btn-icon">{mode.icon}</span>
            <span className="mode-btn-text">{mode.label}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-divider" />

      {/* Navigation Controls */}
      <div className="toolbar-nav">
        <button
          className="nav-btn"
          onClick={onFirstDiff}
          disabled={!hasFiles || diffCount === 0}
          title="First Difference"
        >
          <span className="nav-btn-icon">⏮</span>
        </button>
        <button
          className="nav-btn"
          onClick={onPrevDiff}
          disabled={!hasFiles || diffCount === 0}
          title="Previous Difference (F7)"
        >
          <span className="nav-btn-icon">▲</span>
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
          <span className="nav-btn-icon">▼</span>
        </button>
        <button
          className="nav-btn"
          onClick={onLastDiff}
          disabled={!hasFiles || diffCount === 0}
          title="Last Difference"
        >
          <span className="nav-btn-icon">⏭</span>
        </button>
        <button
          className="nav-btn goto-btn"
          onClick={onGoToLine}
          disabled={!hasFiles}
          title="Go to Line (Ctrl+G)"
        >
          <span className="nav-btn-icon">📍</span>
        </button>
      </div>

      <div className="toolbar-divider" />

      {/* Actions */}
      <div className="toolbar-actions">
        {/* Compare Options Toggle */}
        <button
          className={`options-btn ${showCompareOptions ? 'active' : ''}`}
          onClick={onToggleCompareOptions}
          title="Toggle compare options"
        >
          <span className="options-btn-icon">⚙</span>
        </button>

        {/* Word Wrap Toggle */}
        <button
          className={`wrap-btn ${wordWrap === 'on' ? 'active' : ''}`}
          onClick={() => onWordWrapChange?.(wordWrap === 'on' ? 'off' : 'on')}
          title={wordWrap === 'on' ? 'Disable word wrap' : 'Enable word wrap'}
        >
          <span className="wrap-btn-icon">↩</span>
        </button>

        {/* Layout Toggle */}
        <button
          className="layout-btn"
          onClick={() => onLayoutChange?.(layoutMode === 'horizontal' ? 'vertical' : 'horizontal')}
          title={layoutMode === 'horizontal' ? 'Switch to vertical layout' : 'Switch to horizontal layout'}
        >
          <span className="layout-btn-icon">
            {layoutMode === 'horizontal' ? '⬍' : '⬌'}
          </span>
        </button>

        <button className="action-btn" onClick={onRefresh} title="Refresh (F5)">
          <span className="action-btn-icon">🔄</span>
          Refresh
        </button>
        <button className="action-btn" onClick={onSwap} title="Swap Sides (Ctrl+Shift+S)">
          <span className="action-btn-icon">⇄</span>
          Swap
        </button>
      </div>
    </div>
  )
}