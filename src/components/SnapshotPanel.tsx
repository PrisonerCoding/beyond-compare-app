import { useState } from 'react'
import { Camera, Upload, Trash2, Clock, FolderOpen } from 'lucide-react'
import { save, open } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'

interface SnapshotEntry {
  path: string
  name: string
  type: string
  size: number
  modified_time?: string
  hash?: string
  children?: SnapshotEntry[]
}

interface FolderSnapshot {
  name: string
  path: string
  created_at: string
  entries: SnapshotEntry[]
  total_files: number
  total_folders: number
  total_size: number
}

interface SnapshotPanelProps {
  isOpen: boolean
  onClose: () => void
  currentFolder: string | null
  onLoadSnapshot: (snapshot: FolderSnapshot) => void
}

export function SnapshotPanel({
  isOpen,
  onClose,
  currentFolder,
  onLoadSnapshot,
}: SnapshotPanelProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [savedSnapshots, setSavedSnapshots] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSaveSnapshot = async () => {
    if (!currentFolder) {
      setError('请先选择文件夹')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const outputPath = await save({
        defaultPath: `snapshot-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
        title: '保存文件夹快照',
      })

      if (outputPath) {
        await invoke<string>('save_folder_snapshot', {
          folderPath: currentFolder,
          outputPath,
        })
        setSavedSnapshots(prev => [...prev, outputPath])
      }
    } catch (e) {
      setError(`保存快照失败: ${(e as Error).message}`)
    }

    setIsSaving(false)
  }

  const handleLoadSnapshot = async () => {
    setError(null)

    try {
      const snapshotPath = await open({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        title: '加载文件夹快照',
      })

      if (snapshotPath) {
        const snapshot = await invoke<FolderSnapshot>('load_folder_snapshot', {
          snapshotPath,
        })
        onLoadSnapshot(snapshot)
      }
    } catch (e) {
      setError(`加载快照失败: ${(e as Error).message}`)
    }
  }

  return (
    <div className="snapshot-panel-overlay">
      <div className="snapshot-panel">
        <div className="snapshot-panel-header">
          <div className="snapshot-panel-title">
            <Camera size={16} />
            <span>快照管理</span>
          </div>
          <button className="snapshot-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="snapshot-panel-content">
          {error && (
            <div className="snapshot-error">
              {error}
            </div>
          )}

          <div className="snapshot-info">
            <div className="snapshot-info-row">
              <FolderOpen size={14} />
              <span className="snapshot-info-label">当前文件夹:</span>
              <span className="snapshot-info-value">
                {currentFolder || '未选择'}
              </span>
            </div>
          </div>

          <div className="snapshot-actions">
            <button
              className="snapshot-btn save"
              onClick={handleSaveSnapshot}
              disabled={!currentFolder || isSaving}
            >
              <Camera size={14} />
              {isSaving ? '保存中...' : '保存当前快照'}
            </button>

            <button
              className="snapshot-btn load"
              onClick={handleLoadSnapshot}
            >
              <Upload size={14} />
              加载快照文件
            </button>
          </div>

          {savedSnapshots.length > 0 && (
            <div className="snapshot-history">
              <div className="snapshot-history-title">
                <Clock size={14} />
                <span>已保存的快照</span>
              </div>
              <div className="snapshot-history-list">
                {savedSnapshots.map((path, index) => (
                  <div key={index} className="snapshot-history-item">
                    <span className="snapshot-path">{path}</span>
                    <button
                      className="snapshot-remove-btn"
                      onClick={() => setSavedSnapshots(prev => prev.filter(p => p !== path))}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="snapshot-help">
            <div className="snapshot-help-title">使用说明</div>
            <div className="snapshot-help-text">
              快照保存文件夹的完整结构和文件信息。可用于：
              <ul>
                <li>记录文件夹在某个时间点的状态</li>
                <li>与历史快照对比变化</li>
                <li>无需访问原文件夹即可对比</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}