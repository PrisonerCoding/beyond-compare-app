import { useState } from 'react'
import type { FolderItem } from '../types'
import {
  type SyncOperation,
  type SyncMode,
  type SyncLogEntry,
  SYNC_MODES,
  generateSyncOperationsForMode,
  getSyncStats,
} from '../utils/syncOperations'
import { SyncPreviewModal } from './SyncPreviewModal'
import {
  ArrowRight,
  ArrowLeft,
  ArrowRightLeft,
  Minus,
  Equal,
  History,
  AlertTriangle,
  Play,
} from 'lucide-react'

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
  allDiffItems,
  onSyncComplete,
}: SyncPanelProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pendingOperations, setPendingOperations] = useState<SyncOperation[]>([])
  const [selectedMode, setSelectedMode] = useState<SyncMode>('update-right')
  const [showModeSelector, setShowModeSelector] = useState(false)
  const [syncHistory, setSyncHistory] = useState<SyncLogEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const selectedFiles = selectedItems.filter(item => item.type === 'file')

  // Get stats for current mode
  const stats = getSyncStats(allDiffItems, selectedMode)

  const openPreview = (direction: 'left-to-right' | 'right-to-left') => {
    if (!leftFolder || !rightFolder) return

    // Generate operations from selected items
    const operations: SyncOperation[] = []

    for (const item of selectedFiles) {
      if (direction === 'left-to-right') {
        if (item.status === 'removed' || item.status === 'modified') {
          operations.push({ type: 'copy-to-right', relativePath: item.path })
        }
      } else {
        if (item.status === 'added' || item.status === 'modified') {
          operations.push({ type: 'copy-to-left', relativePath: item.path })
        }
      }
    }

    setPendingOperations(operations)
    setPreviewOpen(true)
  }

  const openAutoSyncPreview = () => {
    if (!leftFolder || !rightFolder) return

    // Generate operations for selected mode
    const items = allDiffItems.map(item => ({
      path: item.path,
      status: item.status,
      type: item.type,
    }))

    const operations = generateSyncOperationsForMode(items, selectedMode)
    setPendingOperations(operations)
    setPreviewOpen(true)
  }

  const handleCopyToRight = () => openPreview('left-to-right')
  const handleCopyToLeft = () => openPreview('right-to-left')

  const handleDeleteLeft = () => {
    if (!leftFolder || !rightFolder) return

    const operations: SyncOperation[] = []
    for (const item of selectedFiles) {
      if (item.status !== 'added') {
        operations.push({ type: 'delete-left', relativePath: item.path })
      }
    }

    setPendingOperations(operations)
    setPreviewOpen(true)
  }

  const handleDeleteRight = () => {
    if (!leftFolder || !rightFolder) return

    const operations: SyncOperation[] = []
    for (const item of selectedFiles) {
      if (item.status !== 'removed') {
        operations.push({ type: 'delete-right', relativePath: item.path })
      }
    }

    setPendingOperations(operations)
    setPreviewOpen(true)
  }

  const handleSyncComplete = () => {
    setPreviewOpen(false)
    onSyncComplete?.()
  }

  const getModeIcon = (mode: SyncMode) => {
    switch (mode) {
      case 'update-left': return <ArrowLeft size={16} />
      case 'update-right': return <ArrowRight size={16} />
      case 'mirror-left': return <ArrowRight size={16} />
      case 'mirror-right': return <ArrowLeft size={16} />
      case 'bidirectional': return <ArrowRightLeft size={16} />
      case 'differential': return <Equal size={16} />
    }
  }

  return (
    <>
      <div className="sync-panel">
        <div className="sync-header">
          <span className="sync-title">Sync Operations</span>
          {selectedFiles.length > 0 && (
            <span className="sync-count">{selectedFiles.length} files selected</span>
          )}
          <button
            className="sync-history-btn"
            onClick={() => setShowHistory(!showHistory)}
            title="View sync history"
          >
            <History size={14} />
          </button>
        </div>

        {/* Auto Sync Mode Selector */}
        <div className="sync-mode-section">
          <div className="sync-mode-header">
            <span className="sync-mode-label">Auto Sync Mode</span>
            <button
              className="sync-mode-toggle"
              onClick={() => setShowModeSelector(!showModeSelector)}
            >
              {getModeIcon(selectedMode)}
              {SYNC_MODES[selectedMode].label}
            </button>
          </div>

          {showModeSelector && (
            <div className="sync-mode-selector">
              {(Object.keys(SYNC_MODES) as SyncMode[]).map(mode => (
                <button
                  key={mode}
                  className={`sync-mode-option ${selectedMode === mode ? 'selected' : ''} ${SYNC_MODES[mode].dangerLevel}`}
                  onClick={() => {
                    setSelectedMode(mode)
                    setShowModeSelector(false)
                  }}
                >
                  <span className="sync-mode-icon">{getModeIcon(mode)}</span>
                  <span className="sync-mode-name">{SYNC_MODES[mode].label}</span>
                  <span className="sync-mode-desc">{SYNC_MODES[mode].description}</span>
                  {SYNC_MODES[mode].dangerLevel === 'dangerous' && (
                    <AlertTriangle size={12} className="sync-mode-warning" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Stats preview */}
          {selectedMode !== 'differential' && (
            <div className="sync-stats-preview">
              <span className="sync-stat-copy">
                <ArrowRightLeft size={12} />
                {stats.copyCount} copies
              </span>
              {stats.deleteCount > 0 && (
                <span className="sync-stat-delete">
                  <Minus size={12} />
                  {stats.deleteCount} deletions
                </span>
              )}
              {stats.skipCount > 0 && (
                <span className="sync-stat-skip">
                  <Equal size={12} />
                  {stats.skipCount} conflicts skipped
                </span>
              )}
            </div>
          )}

          {/* Auto sync button */}
          <button
            className="sync-auto-btn"
            onClick={openAutoSyncPreview}
            disabled={selectedMode === 'differential' || stats.copyCount + stats.deleteCount === 0}
          >
            <Play size={16} />
            Auto Sync ({stats.copyCount + stats.deleteCount} ops)
          </button>
        </div>

        {/* Manual sync actions */}
        <div className="sync-actions">
          <span className="sync-actions-label">Manual Sync:</span>
          <button
            className="sync-btn copy-to-right"
            onClick={handleCopyToRight}
            disabled={selectedFiles.length === 0}
            title="Copy selected files from left to right"
          >
            <ArrowRight size={14} />
            Copy Right
          </button>

          <button
            className="sync-btn copy-to-left"
            onClick={handleCopyToLeft}
            disabled={selectedFiles.length === 0}
            title="Copy selected files from right to left"
          >
            <ArrowLeft size={14} />
            Copy Left
          </button>

          <button
            className="sync-btn delete"
            onClick={handleDeleteLeft}
            disabled={selectedFiles.length === 0}
            title="Delete selected files from left"
          >
            <Minus size={14} />
            Del Left
          </button>

          <button
            className="sync-btn delete"
            onClick={handleDeleteRight}
            disabled={selectedFiles.length === 0}
            title="Delete selected files from right"
          >
            <Minus size={14} />
            Del Right
          </button>
        </div>

        {/* Sync History */}
        {showHistory && syncHistory.length > 0 && (
          <div className="sync-history-panel">
            <div className="sync-history-header">
              <span className="sync-history-title">Sync History</span>
              <button
                className="sync-history-clear"
                onClick={() => setSyncHistory([])}
              >
                Clear
              </button>
            </div>
            <div className="sync-history-list">
              {syncHistory.map(entry => (
                <div key={entry.id} className="sync-history-item">
                  <span className="sync-history-time">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="sync-history-mode">{SYNC_MODES[entry.mode].label}</span>
                  <span className="sync-history-result">
                    {entry.successCount} / {entry.operations.length}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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