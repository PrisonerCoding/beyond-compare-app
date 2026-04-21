import type { FileContent } from '../types'

interface MergeActionsProps {
  leftFile: FileContent | null
  rightFile: FileContent | null
  onMergeLeftToRight: () => void
  onMergeRightToLeft: () => void
  onSaveLeft: () => void
  onSaveRight: () => void
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
  hasLeftChanges,
  hasRightChanges,
}: MergeActionsProps) {
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