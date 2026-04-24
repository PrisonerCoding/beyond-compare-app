import { useState } from 'react'
import { X, Link, Check } from 'lucide-react'

interface AlignmentDialogProps {
  isOpen: boolean
  leftPath: string
  onClose: () => void
  onAlign: (leftPath: string, rightPath: string) => void
  availableRightFiles: string[]
}

export function AlignmentDialog({
  isOpen,
  leftPath,
  onClose,
  onAlign,
  availableRightFiles,
}: AlignmentDialogProps) {
  const [selectedRightPath, setSelectedRightPath] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')

  if (!isOpen) return null

  const filteredFiles = availableRightFiles.filter(file =>
    file.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAlign = () => {
    if (selectedRightPath) {
      onAlign(leftPath, selectedRightPath)
      onClose()
    }
  }

  const getFileName = (path: string) => path.split('/').pop() || path

  return (
    <div className="alignment-dialog-overlay">
      <div className="alignment-dialog">
        <div className="alignment-dialog-header">
          <div className="alignment-dialog-title">
            <Link size={16} />
            <span>手动对齐文件</span>
          </div>
          <button className="alignment-close-btn" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="alignment-dialog-content">
          <div className="alignment-left-file">
            <span className="alignment-label">左侧文件:</span>
            <span className="alignment-file-path left">{getFileName(leftPath)}</span>
            <span className="alignment-full-path">{leftPath}</span>
          </div>

          <div className="alignment-search">
            <span className="alignment-label">选择右侧对应文件:</span>
            <input
              type="text"
              className="alignment-search-input"
              placeholder="搜索文件..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="alignment-file-list">
            {filteredFiles.length === 0 ? (
              <div className="alignment-empty">无匹配文件</div>
            ) : (
              filteredFiles.map((file) => (
                <div
                  key={file}
                  className={`alignment-file-item ${selectedRightPath === file ? 'selected' : ''}`}
                  onClick={() => setSelectedRightPath(file)}
                >
                  <span className="alignment-file-name">{getFileName(file)}</span>
                  <span className="alignment-file-path-preview">{file}</span>
                  {selectedRightPath === file && (
                    <Check size={14} className="alignment-check-icon" />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="alignment-actions">
            <button className="alignment-cancel-btn" onClick={onClose}>
              取消
            </button>
            <button
              className="alignment-align-btn"
              onClick={handleAlign}
              disabled={!selectedRightPath}
            >
              <Link size={14} />
              确认对齐
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}