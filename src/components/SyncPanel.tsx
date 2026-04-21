import { useState } from 'react'
import type { FolderItem } from '../types'
import type { SyncOperation } from '../utils/syncOperations'
import { SyncPreviewModal } from './SyncPreviewModal'

interface SyncPanelProps {
  leftFolder: FolderItem | null
  rightFolder: FolderItem | null
  selectedItems: FolderItem[]
  allDiffItems: FolderItem[]
  onSyncComplete?: () => void
}

export function SyncPanel({
  leftFolder,
  rightFolder,
  selectedItems,
  allDiffItems: _allDiffItemsUnused,
  onSyncComplete,
}: SyncPanelProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pendingOperations, setPendingOperations] = useState<SyncOperation[]>([])
  const selectedFiles = selectedItems.filter(item => item.type === 'file')

  const openPreview = (direction: 'left-to-right' | 'right-to-left') => {
    if (!leftFolder || !rightFolder) return

    // Generate operations from selected items
    const operations: SyncOperation[] = []

    for (const item of selectedFiles) {
      if (direction === 'left-to-right') {
        // Copy selected files from left to right
        if (item.status === 'removed' || item.status === 'modified') {
          operations.push({
            type: 'copy-to-right',
            relativePath: item.path,
          })
        }
      } else {
        // Copy selected files from right to left
        if (item.status === 'added' || item.status === 'modified') {
          operations.push({
            type: 'copy-to-left',
            relativePath: item.path,
          })
        }
      }
    }

    setPendingOperations(operations)
    setPreviewOpen(true)
  }

  const handleCopyToRight = () => {
    openPreview('left-to-right')
  }

  const handleCopyToLeft = () => {
    openPreview('right-to-left')
  }

  const handleDeleteLeft = () => {
    if (!leftFolder || !rightFolder) return

    const operations: SyncOperation[] = []
    for (const item of selectedFiles) {
      if (item.status === 'added') {
        // File exists only on right, delete from left is not applicable
        // Actually this means file doesn't exist on left, can't delete
      } else {
        operations.push({
          type: 'delete-left',
          relativePath: item.path,
        })
      }
    }

    setPendingOperations(operations)
    setPreviewOpen(true)
  }

  const handleDeleteRight = () => {
    if (!leftFolder || !rightFolder) return

    const operations: SyncOperation[] = []
    for (const item of selectedFiles) {
      if (item.status === 'removed') {
        // File exists only on left, delete from right is not applicable
      } else {
        operations.push({
          type: 'delete-right',
          relativePath: item.path,
        })
      }
    }

    setPendingOperations(operations)
    setPreviewOpen(true)
  }

  const handleSyncComplete = () => {
    setPreviewOpen(false)
    onSyncComplete?.()
  }

  return (
    <>
      <div className="sync-panel">
        <div className="sync-header">
          <span className="sync-title">Sync Operations</span>
          {selectedFiles.length > 0 && (
            <span className="sync-count">{selectedFiles.length} files selected</span>
          )}
        </div>

        <div className="sync-actions">
          <button
            className="sync-btn copy-to-right"
            onClick={handleCopyToRight}
            disabled={selectedFiles.length === 0}
            title="Copy selected files from left to right"
          >
            <span className="sync-btn-icon">→</span>
            Copy to Right
          </button>

          <button
            className="sync-btn copy-to-left"
            onClick={handleCopyToLeft}
            disabled={selectedFiles.length === 0}
            title="Copy selected files from right to left"
          >
            <span className="sync-btn-icon">←</span>
            Copy to Left
          </button>

          <button
            className="sync-btn delete-left"
            onClick={handleDeleteLeft}
            disabled={selectedFiles.length === 0}
            title="Delete selected files from left"
          >
            <span className="sync-btn-icon">✕</span>
            Delete Left
          </button>

          <button
            className="sync-btn delete-right"
            onClick={handleDeleteRight}
            disabled={selectedFiles.length === 0}
            title="Delete selected files from right"
          >
            <span className="sync-btn-icon">✕</span>
            Delete Right
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {leftFolder && rightFolder && (
        <SyncPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          leftFolderPath={leftFolder.path}
          rightFolderPath={rightFolder.path}
          operations={pendingOperations}
          onSyncComplete={handleSyncComplete}
        />
      )}
    </>
  )
}