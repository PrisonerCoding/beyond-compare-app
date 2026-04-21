import { open } from '@tauri-apps/plugin-dialog'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { useState } from 'react'
import type { FileContent } from '../types'
import { getLanguageFromPath } from '../utils/diff'
import { isBinaryFile, getFileTypeDescription } from '../utils/binaryCheck'
import { FileText, FileType, File, FolderOpen, X, AlertCircle, Loader2 } from 'lucide-react'

interface FileSelectorProps {
  label: 'Left' | 'Right'
  badge: 'L' | 'R'
  file: FileContent | null
  onSelect: (file: FileContent) => void
  onClear: () => void
}

export function FileSelector({ label, badge, file, onSelect, onClear }: FileSelectorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSelectFile = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const selected = await open({
        multiple: false,
        title: `Select ${label} File`,
      })

      if (selected && typeof selected === 'string') {
        // 检测是否为二进制文件
        if (isBinaryFile(selected)) {
          setError(`⚠️ ${getFileTypeDescription(selected)} - Binary files cannot be displayed as text. Use "Binary Compare" mode instead.`)
          setIsLoading(false)
          return
        }

        const content = await readTextFile(selected)

        onSelect({
          path: selected,
          content: content,
          language: getLanguageFromPath(selected),
        })
      }
    } catch (error) {
      console.error('Failed to read file:', error)
      setError('Failed to read file. It may be a binary file.')
    } finally {
      setIsLoading(false)
    }
  }

  const getFileName = (path: string) => {
    return path.split(/[/\\]/).pop() || path
  }

  const getFileIcon = (language: string) => {
    const iconComponents: Record<string, React.ReactNode> = {
      javascript: <FileText size={18} />,
      typescript: <FileType size={18} />,
      json: <FileText size={18} />,
      html: <FileText size={18} />,
      css: <FileText size={18} />,
      python: <FileText size={18} />,
      rust: <FileText size={18} />,
      go: <FileText size={18} />,
      java: <FileText size={18} />,
      markdown: <FileText size={18} />,
    }
    return iconComponents[language] || <File size={18} />
  }

  return (
    <div className="file-selector">
      <div className="file-selector-header">
        <div className="file-selector-label">
          <div className="label-badge">{badge}</div>
          <span className="label-text">{label} File</span>
        </div>

        <div className="file-selector-actions">
          <button className="select-btn" onClick={handleSelectFile} disabled={isLoading}>
            {isLoading ? <><Loader2 size={14} className="animate-spin" /> Loading...</> : <><FolderOpen size={14} /> Select File</>}
          </button>
          {file && (
            <button className="clear-btn" onClick={onClear}>
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="file-error">
          <div className="file-error-icon"><AlertCircle size={18} /></div>
          <div className="file-error-text">{error}</div>
        </div>
      )}

      {file ? (
        <div className="file-info">
          <div className="file-icon">{getFileIcon(file.language || 'plaintext')}</div>
          <div className="file-details">
            <div className="file-name">{getFileName(file.path)}</div>
            <div className="file-path">{file.path}</div>
          </div>
          <div className="file-language-badge">{file.language}</div>
        </div>
      ) : !error ? (
        <div className="file-empty">
          <div className="file-empty-icon"><FolderOpen size={24} /></div>
          <div className="file-empty-text">Click "Select File" to choose a file</div>
        </div>
      ) : null}
    </div>
  )
}