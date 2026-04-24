import { useState, useEffect } from 'react'
import { readFile } from '@tauri-apps/plugin-fs'
import { FileText, Image, Music, Binary, Eye, EyeOff, Info } from 'lucide-react'
import { getFileCategory, isBinaryFile } from '../utils/binaryCheck'
import { formatFileSize, getExtendedMetadata } from '../utils/folderCompare'
import type { FileMetadata } from '../types'

interface FilePreviewPanelProps {
  leftPath: string | null
  rightPath: string | null
  status: 'equal' | 'added' | 'removed' | 'modified'
  leftFolder: string
  rightFolder: string
}

type FileCategory = 'text' | 'image' | 'audio' | 'archive' | 'binary' | 'unknown'

export function FilePreviewPanel({
  leftPath,
  rightPath,
  status,
  leftFolder,
  rightFolder,
}: FilePreviewPanelProps) {
  const [leftContent, setLeftContent] = useState<string | null>(null)
  const [rightContent, setRightContent] = useState<string | null>(null)
  const [leftCategory, setLeftCategory] = useState<FileCategory>('unknown')
  const [rightCategory, setRightCategory] = useState<FileCategory>('unknown')
  const [leftSize, setLeftSize] = useState<number>(0)
  const [rightSize, setRightSize] = useState<number>(0)
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMetadata, setShowMetadata] = useState(false)
  const [leftMetadata, setLeftMetadata] = useState<FileMetadata | null>(null)
  const [rightMetadata, setRightMetadata] = useState<FileMetadata | null>(null)

  // Resolve full paths
  const fullLeftPath = leftPath ? `${leftFolder}/${leftPath}` : null
  const fullRightPath = rightPath ? `${rightFolder}/${rightPath}` : null

  // Load file content when paths change
  useEffect(() => {
    const loadFiles = async () => {
      setIsLoading(true)
      setError(null)
      setLeftContent(null)
      setRightContent(null)
      setLeftSize(0)
      setRightSize(0)
      setLeftMetadata(null)
      setRightMetadata(null)

      try {
        // Load left file
        if (fullLeftPath) {
          const leftBytes = await readFile(fullLeftPath)
          setLeftSize(leftBytes.length)
          const category = getFileCategory(fullLeftPath)
          setLeftCategory(category)

          if (category === 'text' && !isBinaryFile(fullLeftPath)) {
            const decoder = new TextDecoder('utf-8', { fatal: false })
            const text = decoder.decode(leftBytes)
            // Limit preview to first 50KB
            setLeftContent(text.length > 50000 ? text.slice(0, 50000) + '\n... (内容过长，已截断)' : text)
          } else if (category === 'image') {
            // For images, create base64 URL
            const base64 = arrayBufferToBase64(leftBytes)
            const mimeType = getMimeType(fullLeftPath)
            setLeftContent(`data:${mimeType};base64,${base64}`)
          } else if (category === 'binary') {
            // For binary, show hex preview
            const hexPreview = bytesToHex(leftBytes.slice(0, 1024))
            setLeftContent(hexPreview)
          }

          // Load extended metadata
          const meta = await getExtendedMetadata(fullLeftPath)
          setLeftMetadata(meta)
        }

        // Load right file
        if (fullRightPath) {
          const rightBytes = await readFile(fullRightPath)
          setRightSize(rightBytes.length)
          const category = getFileCategory(fullRightPath)
          setRightCategory(category)

          if (category === 'text' && !isBinaryFile(fullRightPath)) {
            const decoder = new TextDecoder('utf-8', { fatal: false })
            const text = decoder.decode(rightBytes)
            setRightContent(text.length > 50000 ? text.slice(0, 50000) + '\n... (内容过长，已截断)' : text)
          } else if (category === 'image') {
            const base64 = arrayBufferToBase64(rightBytes)
            const mimeType = getMimeType(fullRightPath)
            setRightContent(`data:${mimeType};base64,${base64}`)
          } else if (category === 'binary') {
            const hexPreview = bytesToHex(rightBytes.slice(0, 1024))
            setRightContent(hexPreview)
          }

          // Load extended metadata
          const meta = await getExtendedMetadata(fullRightPath)
          setRightMetadata(meta)
        }
      } catch (e) {
        setError(`加载失败: ${(e as Error).message}`)
      }

      setIsLoading(false)
    }

    if (fullLeftPath || fullRightPath) {
      loadFiles()
    }
  }, [fullLeftPath, fullRightPath])

  const arrayBufferToBase64 = (buffer: Uint8Array): string => {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  const bytesToHex = (bytes: Uint8Array): string => {
    const hexLines: string[] = []
    for (let i = 0; i < bytes.length; i += 16) {
      const slice = bytes.slice(i, i + 16)
      const hex = Array.from(slice)
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ')
      const ascii = Array.from(slice)
        .map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.')
        .join('')
      hexLines.push(`${i.toString(16).padStart(8, '0')}: ${hex}  |${ascii}|`)
    }
    return hexLines.join('\n')
  }

  const getMimeType = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || ''
    const mimeTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
    }
    return mimeTypes[ext] || 'image/png'
  }

  const getCategoryIcon = (category: FileCategory) => {
    switch (category) {
      case 'text': return <FileText size={14} />
      case 'image': return <Image size={14} />
      case 'audio': return <Music size={14} />
      case 'binary': return <Binary size={14} />
      default: return <FileText size={14} />
    }
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'equal': return '相同'
      case 'added': return '新增'
      case 'removed': return '删除'
      case 'modified': return '修改'
    }
  }

  if (!leftPath && !rightPath) {
    return (
      <div className="file-preview-panel collapsed">
        <div className="preview-header">
          <span className="preview-title">文件预览</span>
          <span className="preview-hint">选择文件查看内容</span>
        </div>
      </div>
    )
  }

  const fileName = leftPath || rightPath || ''

  return (
    <div className={`file-preview-panel ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="preview-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="preview-title">
          {getCategoryIcon(leftCategory || rightCategory)}
          {fileName}
        </span>
        <div className="preview-meta">
          <span className={`preview-status ${status}`}>{getStatusLabel()}</span>
          {leftSize > 0 && <span className="preview-size">{formatFileSize(leftSize)}</span>}
          {rightSize > 0 && rightSize !== leftSize && (
            <span className="preview-size">{formatFileSize(rightSize)}</span>
          )}
          {/* Metadata toggle button */}
          {(leftMetadata || rightMetadata) && (
            <button
              className={`preview-meta-btn ${showMetadata ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                setShowMetadata(!showMetadata)
              }}
              title="显示文件属性"
            >
              <Info size={14} />
            </button>
          )}
          <button className="preview-toggle">
            {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="preview-content">
          {/* Metadata comparison panel */}
          {showMetadata && (leftMetadata || rightMetadata) && (
            <div className="metadata-comparison">
              <div className="metadata-row">
                <span className="metadata-label">大小</span>
                <span className="metadata-value left">{leftMetadata ? formatFileSize(leftMetadata.size) : '-'}</span>
                <span className={`metadata-diff ${leftSize !== rightSize ? 'diff' : ''}`}>
                  {leftSize !== rightSize ? '≠' : '='}
                </span>
                <span className="metadata-value right">{rightMetadata ? formatFileSize(rightMetadata.size) : '-'}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">创建时间</span>
                <span className="metadata-value left">{leftMetadata?.created || '-'}</span>
                <span className="metadata-diff">
                  {leftMetadata?.created !== rightMetadata?.created ? '≠' : '='}
                </span>
                <span className="metadata-value right">{rightMetadata?.created || '-'}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">修改时间</span>
                <span className="metadata-value left">{leftMetadata?.modified || '-'}</span>
                <span className={`metadata-diff ${leftMetadata?.modified !== rightMetadata?.modified ? 'diff' : ''}`}>
                  {leftMetadata?.modified !== rightMetadata?.modified ? '≠' : '='}
                </span>
                <span className="metadata-value right">{rightMetadata?.modified || '-'}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">访问时间</span>
                <span className="metadata-value left">{leftMetadata?.accessed || '-'}</span>
                <span className="metadata-diff">
                  {leftMetadata?.accessed !== rightMetadata?.accessed ? '≠' : '='}
                </span>
                <span className="metadata-value right">{rightMetadata?.accessed || '-'}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">只读</span>
                <span className="metadata-value left">{leftMetadata?.is_readonly ? '是' : '否'}</span>
                <span className={`metadata-diff ${leftMetadata?.is_readonly !== rightMetadata?.is_readonly ? 'diff' : ''}`}>
                  {leftMetadata?.is_readonly !== rightMetadata?.is_readonly ? '≠' : '='}
                </span>
                <span className="metadata-value right">{rightMetadata?.is_readonly ? '是' : '否'}</span>
              </div>
              <div className="metadata-row">
                <span className="metadata-label">隐藏</span>
                <span className="metadata-value left">{leftMetadata?.is_hidden ? '是' : '否'}</span>
                <span className="metadata-diff">
                  {leftMetadata?.is_hidden !== rightMetadata?.is_hidden ? '≠' : '='}
                </span>
                <span className="metadata-value right">{rightMetadata?.is_hidden ? '是' : '否'}</span>
              </div>
              {leftMetadata?.permissions && rightMetadata?.permissions && (
                <div className="metadata-row">
                  <span className="metadata-label">权限</span>
                  <span className="metadata-value left">{leftMetadata.permissions}</span>
                  <span className={`metadata-diff ${leftMetadata.permissions !== rightMetadata.permissions ? 'diff' : ''}`}>
                    {leftMetadata.permissions !== rightMetadata.permissions ? '≠' : '='}
                  </span>
                  <span className="metadata-value right">{rightMetadata.permissions}</span>
                </div>
              )}
            </div>
          )}

          {isLoading && (
            <div className="preview-loading">
              <span className="loading-spinner">⏳</span>
              <span>加载中...</span>
            </div>
          )}

          {error && (
            <div className="preview-error">
              <span>❌ {error}</span>
            </div>
          )}

          {!isLoading && !error && !showMetadata && (
            <div className="preview-files">
              {/* Left file preview */}
              {fullLeftPath && leftContent && (
                <div className="preview-pane left">
                  <div className="preview-pane-header">
                    <span className="pane-badge">L</span>
                    <span className="pane-label">{leftPath}</span>
                  </div>
                  <div className="preview-pane-content">
                    {leftCategory === 'image' ? (
                      <img
                        src={leftContent}
                        alt="Left preview"
                        className="preview-image"
                      />
                    ) : leftCategory === 'binary' ? (
                      <pre className="preview-hex">{leftContent}</pre>
                    ) : (
                      <pre className="preview-text">{leftContent}</pre>
                    )}
                  </div>
                </div>
              )}

              {/* Right file preview */}
              {fullRightPath && rightContent && (
                <div className="preview-pane right">
                  <div className="preview-pane-header">
                    <span className="pane-badge">R</span>
                    <span className="pane-label">{rightPath}</span>
                  </div>
                  <div className="preview-pane-content">
                    {rightCategory === 'image' ? (
                      <img
                        src={rightContent}
                        alt="Right preview"
                        className="preview-image"
                      />
                    ) : rightCategory === 'binary' ? (
                      <pre className="preview-hex">{rightContent}</pre>
                    ) : (
                      <pre className="preview-text">{rightContent}</pre>
                    )}
                  </div>
                </div>
              )}

              {/* Show placeholder for missing files */}
              {status === 'added' && !fullLeftPath && (
                <div className="preview-pane left empty">
                  <div className="preview-pane-header">
                    <span className="pane-badge">L</span>
                    <span className="pane-label">不存在</span>
                  </div>
                  <div className="preview-pane-empty">
                    <span>文件仅存在于右侧</span>
                  </div>
                </div>
              )}

              {status === 'removed' && !fullRightPath && (
                <div className="preview-pane right empty">
                  <div className="preview-pane-header">
                    <span className="pane-badge">R</span>
                    <span className="pane-label">不存在</span>
                  </div>
                  <div className="preview-pane-empty">
                    <span>文件仅存在于左侧</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}