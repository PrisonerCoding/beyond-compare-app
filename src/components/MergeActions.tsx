import { useState, useRef, useEffect } from 'react'
import { ArrowDownUp, ChevronDown } from 'lucide-react'
import {
  detectLineEnding,
  convertLineEnding,
  getLineEndingStats,
  getLineEndingDisplayName,
  getLineEndingShortName,
  type LineEnding,
  type LineEndingStats
} from '../utils/lineEnding'
import type { FileContent } from '../types'

interface MergeActionsProps {
  leftFile: FileContent | null
  rightFile: FileContent | null
  onMergeLeftToRight: () => void
  onMergeRightToLeft: () => void
  onSaveLeft: () => void
  onSaveRight: () => void
  onLeftContentChange?: (content: string) => void
  onRightContentChange?: (content: string) => void
  hasLeftChanges: boolean
  hasRightChanges: boolean
}

export function MergeActions({
  leftFile,
  rightFile,
  onMergeLeftToRight,
  onMergeRightToLeft,
  onSaveLeft,
  onSaveRight,
  onLeftContentChange,
  onRightContentChange,
  hasLeftChanges,
  hasRightChanges,
}: MergeActionsProps) {
  const [showLineEndingMenu, setShowLineEndingMenu] = useState(false)
  const lineEndingMenuRef = useRef<HTMLDivElement>(null)

  const leftStats = leftFile ? getLineEndingStats(leftFile.content) : null
  const rightStats = rightFile ? getLineEndingStats(rightFile.content) : null

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (lineEndingMenuRef.current && !lineEndingMenuRef.current.contains(e.target as Node)) {
        setShowLineEndingMenu(false)
      }
    }

    if (showLineEndingMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showLineEndingMenu])

  const handleConvertLineEnding = (side: 'left' | 'right', target: LineEnding) => {
    if (side === 'left' && leftFile) {
      const converted = convertLineEnding(leftFile.content, target)
      onLeftContentChange?.(converted)
    } else if (side === 'right' && rightFile) {
      const converted = convertLineEnding(rightFile.content, target)
      onRightContentChange?.(converted)
    }
    setShowLineEndingMenu(false)
  }

  const targets: LineEnding[] = ['LF', 'CRLF', 'CR']

  const lineEndingsDiffer = leftStats && rightStats && leftStats.detected !== rightStats.detected

  return (
    <div className="merge-actions">
      <div className="merge-section">
        <span className="merge-label">Merge:</span>
        <button
          className="merge-btn"
          onClick={onMergeLeftToRight}
          disabled={!leftFile || !rightFile}
          title="Copy left content to right"
        >
          L → R
        </button>
        <button
          className="merge-btn"
          onClick={onMergeRightToLeft}
          disabled={!leftFile || !rightFile}
          title="Copy right content to left"
        >
          R → L
        </button>
      </div>

      {/* Line Ending Converter */}
      {leftFile && rightFile && (
        <div className="merge-section line-ending-section" ref={lineEndingMenuRef}>
          <button
            className={`line-ending-toggle-btn ${lineEndingsDiffer ? 'warning' : ''}`}
            onClick={() => setShowLineEndingMenu(!showLineEndingMenu)}
            title="Convert line endings"
          >
            <ArrowDownUp size={12} />
            <span className="line-ending-display">
              {leftStats && rightStats && (
                <>
                  {getLineEndingShortName(leftStats.detected)} / {getLineEndingShortName(rightStats.detected)}
                </>
              )}
            </span>
            <ChevronDown size={10} />
          </button>

          {showLineEndingMenu && (
            <div className="line-ending-popup">
              <div className="popup-header">Line Ending Conversion</div>

              <div className="popup-stats">
                <div className="popup-stat-row">
                  <span className="stat-side">Left:</span>
                  <span className={`stat-value ${leftStats?.detected === 'Mixed' ? 'mixed' : ''}`}>
                    {leftStats && getLineEndingDisplayName(leftStats.detected)}
                  </span>
                </div>
                <div className="popup-stat-row">
                  <span className="stat-side">Right:</span>
                  <span className={`stat-value ${rightStats?.detected === 'Mixed' ? 'mixed' : ''}`}>
                    {rightStats && getLineEndingDisplayName(rightStats.detected)}
                  </span>
                </div>
              </div>

              <div className="popup-divider" />

              <div className="popup-convert">
                <span className="convert-label">Convert Left:</span>
                <div className="convert-buttons">
                  {targets.map(target => (
                    <button
                      key={`left-${target}`}
                      className="convert-option"
                      onClick={() => handleConvertLineEnding('left', target)}
                      disabled={leftStats?.detected === target}
                    >
                      {target}
                    </button>
                  ))}
                </div>
              </div>

              <div className="popup-convert">
                <span className="convert-label">Convert Right:</span>
                <div className="convert-buttons">
                  {targets.map(target => (
                    <button
                      key={`right-${target}`}
                      className="convert-option"
                      onClick={() => handleConvertLineEnding('right', target)}
                      disabled={rightStats?.detected === target}
                    >
                      {target}
                    </button>
                  ))}
                </div>
              </div>

              {lineEndingsDiffer && (
                <div className="popup-warning">
                  ⚠ Line endings differ between files
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="merge-section">
        <span className="merge-label">Save:</span>
        <button
          className={`save-btn ${hasLeftChanges ? 'has-changes' : ''}`}
          onClick={onSaveLeft}
          disabled={!leftFile}
          title="Save left file"
        >
          💾 Save L
        </button>
        <button
          className={`save-btn ${hasRightChanges ? 'has-changes' : ''}`}
          onClick={onSaveRight}
          disabled={!rightFile}
          title="Save right file"
        >
          💾 Save R
        </button>
      </div>
    </div>
  )
}