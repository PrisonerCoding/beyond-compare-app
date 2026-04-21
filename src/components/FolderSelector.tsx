import { useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import type { FolderItem } from '../types'
import { Folder, FolderOpen, X, Loader2 } from 'lucide-react'

interface FolderSelectorProps {
  label: 'Left' | 'Right'
  badge: 'L' | 'R'
  folder: FolderItem | null
  onSelect: (folder: FolderItem) => void
  onClear: () => void
}

export function FolderSelector({ label, badge, folder, onSelect, onClear }: FolderSelectorProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectFolder = async () => {
    try {
      setIsLoading(true)

      const selected = await open({
        multiple: false,
        directory: true,
        title: `Select ${label} Folder`,
      })

      if (selected && typeof selected === 'string') {
        onSelect({
          path: selected,
          name: selected.split(/[/\\]/).pop() || selected,
          type: 'folder',
          status: 'equal',
          children: [],
        })
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getFolderName = (path: string) => {
    return path.split(/[/\\]/).pop() || path
  }

  return (
    <div className="folder-selector">
      <div className="folder-selector-header">
        <div className="folder-selector-label">
          <div className="label-badge">{badge}</div>
          <span className="label-text">{label} Folder</span>
        </div>

        <div className="folder-selector-actions">
          <button className="select-btn" onClick={handleSelectFolder} disabled={isLoading}>
            {isLoading ? <><Loader2 size={14} className="animate-spin" /> Loading...</> : <><FolderOpen size={14} /> Select Folder</>}
          </button>
          {folder && (
            <button className="clear-btn" onClick={onClear}>
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {folder ? (
        <div className="folder-info">
          <div className="folder-icon"><Folder size={18} /></div>
          <div className="folder-details">
            <div className="folder-name">{getFolderName(folder.path)}</div>
            <div className="folder-path">{folder.path}</div>
          </div>
        </div>
      ) : (
        <div className="folder-empty">
          <div className="folder-empty-icon"><FolderOpen size={24} /></div>
          <div className="folder-empty-text">Click "Select Folder" to choose a directory</div>
        </div>
      )}
    </div>
  )
}