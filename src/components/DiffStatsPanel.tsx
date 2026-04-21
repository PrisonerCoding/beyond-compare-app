import type { FileContent } from '../types'
import { computeDiffStats } from '../utils/diff'
import { BarChart2, X } from 'lucide-react'

interface DiffStatsPanelProps {
  leftFile: FileContent | null
  rightFile: FileContent | null
  isOpen: boolean
  onClose: () => void
}

export function DiffStatsPanel({
  leftFile,
  rightFile,
  isOpen,
  onClose,
}: DiffStatsPanelProps) {
  if (!isOpen) return null

  const stats = leftFile && rightFile ? computeDiffStats(leftFile.content, rightFile.content) : null

  const leftLines = leftFile?.content.split('\n').length || 0
  const rightLines = rightFile?.content.split('\n').length || 0
  const totalChanges = stats ? stats.added + stats.removed + stats.modified : 0

  const leftChars = leftFile?.content.length || 0
  const rightChars = rightFile?.content.length || 0
  const charDiff = rightChars - leftChars

  const similarityPercent = stats && totalChanges > 0
    ? Math.round(100 - (totalChanges / Math.max(leftLines, rightLines) * 100))
    : leftFile && rightFile ? 100 : 0

  return (
    <div className="diff-stats-panel-overlay" onClick={onClose}>
      <div className="diff-stats-panel" onClick={(e) => e.stopPropagation()}>
        <div className="diff-stats-header">
          <span className="diff-stats-title">
            <BarChart2 size={14} /> Detailed Statistics
          </span>
          <button className="diff-stats-close-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="diff-stats-content">
          {!leftFile || !rightFile ? (
            <div className="diff-stats-empty">
              <BarChart2 size={24} className="diff-stats-empty-icon" />
              <span className="diff-stats-empty-text">No files loaded</span>
            </div>
          ) : (
            <>
              {/* Line Statistics */}
              <div className="stats-section">
                <div className="stats-section-title">Line Statistics</div>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-card-label">Left File</div>
                    <div className="stat-card-value">{leftLines}</div>
                    <div className="stat-card-unit">lines</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-label">Right File</div>
                    <div className="stat-card-value">{rightLines}</div>
                    <div className="stat-card-unit">lines</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-label">Line Diff</div>
                    <div className={`stat-card-value ${rightLines - leftLines >= 0 ? 'positive' : 'negative'}`}>
                      {rightLines - leftLines >= 0 ? '+' : ''}{rightLines - leftLines}
                    </div>
                    <div className="stat-card-unit">lines</div>
                  </div>
                </div>
              </div>

              {/* Change Statistics */}
              <div className="stats-section">
                <div className="stats-section-title">Change Breakdown</div>
                <div className="stats-grid">
                  <div className="stat-card added">
                    <div className="stat-card-icon">+</div>
                    <div className="stat-card-label">Added</div>
                    <div className="stat-card-value">{stats?.added || 0}</div>
                  </div>
                  <div className="stat-card removed">
                    <div className="stat-card-icon">-</div>
                    <div className="stat-card-label">Removed</div>
                    <div className="stat-card-value">{stats?.removed || 0}</div>
                  </div>
                  <div className="stat-card modified">
                    <div className="stat-card-icon">~</div>
                    <div className="stat-card-label">Modified</div>
                    <div className="stat-card-value">{stats?.modified || 0}</div>
                  </div>
                </div>
              </div>

              {/* Character Statistics */}
              <div className="stats-section">
                <div className="stats-section-title">Character Statistics</div>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-card-label">Left Size</div>
                    <div className="stat-card-value">{formatNumber(leftChars)}</div>
                    <div className="stat-card-unit">chars</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-label">Right Size</div>
                    <div className="stat-card-value">{formatNumber(rightChars)}</div>
                    <div className="stat-card-unit">chars</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-card-label">Char Diff</div>
                    <div className={`stat-card-value ${charDiff >= 0 ? 'positive' : 'negative'}`}>
                      {charDiff >= 0 ? '+' : ''}{formatNumber(charDiff)}
                    </div>
                    <div className="stat-card-unit">chars</div>
                  </div>
                </div>
              </div>

              {/* Similarity Score */}
              <div className="stats-section similarity-section">
                <div className="stats-section-title">Similarity Score</div>
                <div className="similarity-container">
                  <div className="similarity-bar">
                    <div
                      className="similarity-fill"
                      style={{ width: `${similarityPercent}%` }}
                    />
                  </div>
                  <div className="similarity-percent">{similarityPercent}%</div>
                </div>
                <div className="similarity-label">
                  {similarityPercent >= 90 ? 'Very similar' :
                   similarityPercent >= 70 ? 'Moderately similar' :
                   similarityPercent >= 50 ? 'Somewhat different' :
                   'Significantly different'}
                </div>
              </div>

              {/* Visual Distribution */}
              <div className="stats-section">
                <div className="stats-section-title">Change Distribution</div>
                <div className="distribution-chart">
                  <div className="distribution-bar">
                    {stats && totalChanges > 0 && (
                      <>
                        <div
                          className="distribution-segment added"
                          style={{ width: `${(stats.added / totalChanges) * 100}%` }}
                          title={`Added: ${stats.added}`}
                        />
                        <div
                          className="distribution-segment removed"
                          style={{ width: `${(stats.removed / totalChanges) * 100}%` }}
                          title={`Removed: ${stats.removed}`}
                        />
                        <div
                          className="distribution-segment modified"
                          style={{ width: `${(stats.modified / totalChanges) * 100}%` }}
                          title={`Modified: ${stats.modified}`}
                        />
                      </>
                    )}
                  </div>
                  <div className="distribution-labels">
                    {stats && stats.added > 0 && (
                      <div className="distribution-label added">
                        <span className="label-dot"></span>
                        Added: {Math.round((stats.added / totalChanges) * 100)}%
                      </div>
                    )}
                    {stats && stats.removed > 0 && (
                      <div className="distribution-label removed">
                        <span className="label-dot"></span>
                        Removed: {Math.round((stats.removed / totalChanges) * 100)}%
                      </div>
                    )}
                    {stats && stats.modified > 0 && (
                      <div className="distribution-label modified">
                        <span className="label-dot"></span>
                        Modified: {Math.round((stats.modified / totalChanges) * 100)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}