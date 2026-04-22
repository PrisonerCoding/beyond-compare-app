import { useState, useRef, useEffect } from 'react'
import {
  detectLineEnding,
  convertLineEnding,
  getLineEndingStats,
  getLineEndingDisplayName,
  getLineEndingShortName,
  type LineEnding,
  type LineEndingStats
} from '../utils/lineEnding'
import { ChevronDown, ArrowDownUp } from 'lucide-react'

interface LineEndingConverterProps {
  leftContent: string
  rightContent: string
  onLeftConvert?: (content: string) => void
  onRightConvert?: (content: string) => void
}

export function LineEndingConverter({
  leftContent,
  rightContent,
  onLeftConvert,
  onRightConvert,
}: LineEndingConverterProps) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const leftStats = getLineEndingStats(leftContent)
  const rightStats = getLineEndingStats(rightContent)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  const handleConvert = (side: 'left' | 'right', target: LineEnding) => {
    const content = side === 'left' ? leftContent : rightContent
    const converted = convertLineEnding(content, target)

    if (side === 'left') {
      onLeftConvert?.(converted)
    } else {
      onRightConvert?.(converted)
    }
    setShowMenu(false)
  }

  const targets: LineEnding[] = ['LF', 'CRLF', 'CR']

  return (
    <div className="line-ending-converter" ref={menuRef}>
      <button
        className="line-ending-btn"
        onClick={() => setShowMenu(!showMenu)}
        title="Convert line endings"
      >
        <ArrowDownUp size={14} />
        <span className="line-ending-indicator">
          L:{getLineEndingShortName(leftStats.detected)}
          R:{getLineEndingShortName(rightStats.detected)}
        </span>
        <ChevronDown size={10} />
      </button>

      {showMenu && (
        <div className="line-ending-menu">
          <div className="line-ending-menu-header">
            <span>Line Ending Conversion</span>
          </div>

          <div className="line-ending-stats-section">
            <div className="line-ending-stats-item">
              <span className="stats-label">Left File:</span>
              <span className={`stats-value ${leftStats.detected === 'Mixed' ? 'mixed' : ''}`}>
                {getLineEndingDisplayName(leftStats.detected)}
              </span>
              <span className="stats-detail">
                {leftStats.percentage.lf.toFixed(0)}% LF, {leftStats.percentage.crlf.toFixed(0)}% CRLF
              </span>
            </div>
            <div className="line-ending-stats-item">
              <span className="stats-label">Right File:</span>
              <span className={`stats-value ${rightStats.detected === 'Mixed' ? 'mixed' : ''}`}>
                {getLineEndingDisplayName(rightStats.detected)}
              </span>
              <span className="stats-detail">
                {rightStats.percentage.lf.toFixed(0)}% LF, {rightStats.percentage.crlf.toFixed(0)}% CRLF
              </span>
            </div>
          </div>

          <div className="line-ending-divider" />

          <div className="line-ending-convert-section">
            <div className="convert-header">Convert Left to:</div>
            {targets.map(target => (
              <button
                key={`left-${target}`}
                className="convert-btn"
                onClick={() => handleConvert('left', target)}
                disabled={leftStats.detected === target}
              >
                {getLineEndingDisplayName(target)}
                {leftStats.detected === target && <span className="current-badge">Current</span>}
              </button>
            ))}
          </div>

          <div className="line-ending-convert-section">
            <div className="convert-header">Convert Right to:</div>
            {targets.map(target => (
              <button
                key={`right-${target}`}
                className="convert-btn"
                onClick={() => handleConvert('right', target)}
                disabled={rightStats.detected === target}
              >
                {getLineEndingDisplayName(target)}
                {rightStats.detected === target && <span className="current-badge">Current</span>}
              </button>
            ))}
          </div>

          {leftStats.detected !== rightStats.detected && (
            <div className="line-ending-warning">
              Line endings differ between files
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Compact inline display component
export function LineEndingIndicator({ content }: { content: string }) {
  const stats = getLineEndingStats(content)

  return (
    <span className={`line-ending-indicator-inline ${stats.detected.toLowerCase()}`}>
      {getLineEndingShortName(stats.detected)}
      {stats.detected === 'Mixed' && (
        <span className="mixed-warning" title="Mixed line endings detected">⚠</span>
      )}
    </span>
  )
}