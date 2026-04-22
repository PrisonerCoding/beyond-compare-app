import { useState, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { FolderOpen, File, ChevronRight, ChevronDown, Download } from 'lucide-react'

interface ArchiveEntry {
  path: string
  name: string
  is_dir: boolean
  size: number
  modified?: string
  compressed_size?: number
}

interface ArchiveDiffViewerProps {
  leftPath: string | null
  rightPath: string | null
  onFileExtract?: (leftContent: Uint8Array | null, rightContent: Uint8Array | null, entryPath: string) => void
}

// Build tree structure from flat list
function buildArchiveTree(entries: ArchiveEntry[]): ArchiveEntryNode {
  const root: ArchiveEntryNode = {
    name: '',
    path: '',
    is_dir: true,
    size: 0,
    children: [],
  }

  for (const entry of entries) {
    const parts = entry.path.split('/').filter(p => p)
    let current = root

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      let child = current.children.find(c => c.name === part && c.is_dir)

      if (!child) {
        child = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          is_dir: true,
          size: 0,
          children: [],
        }
        current.children.push(child)
      }

      current = child
    }

    // Add the final entry
    if (parts.length > 0) {
      const finalName = parts[parts.length - 1]
      const exists = current.children.find(c => c.name === finalName)

      if (!exists) {
        current.children.push({
          name: finalName,
          path: entry.path,
          is_dir: entry.is_dir,
          size: entry.size,
          compressed_size: entry.compressed_size,
          children: [],
        })
      }
    }
  }

  // Sort children: directories first, then files, alphabetically
  const sortChildren = (node: ArchiveEntryNode) => {
    node.children.sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    node.children.forEach(sortChildren)
  }

  sortChildren(root)
  return root
}

interface ArchiveEntryNode extends ArchiveEntry {
  children: ArchiveEntryNode[]
}

// Status comparison between two archives
type EntryStatus = 'equal' | 'added' | 'removed' | 'modified'

function compareArchiveEntries(
  leftEntries: ArchiveEntry[],
  rightEntries: ArchiveEntry[]
): Map<string, EntryStatus> {
  const statusMap = new Map<string, EntryStatus>()
  const leftPaths = new Set(leftEntries.map(e => e.path))
  const rightPaths = new Set(rightEntries.map(e => e.path))

  // Check left entries
  for (const entry of leftEntries) {
    if (rightPaths.has(entry.path)) {
      // Exists in both - check if modified
      const rightEntry = rightEntries.find(e => e.path === entry.path)
      if (rightEntry && entry.size !== rightEntry.size) {
        statusMap.set(entry.path, 'modified')
      } else {
        statusMap.set(entry.path, 'equal')
      }
    } else {
      statusMap.set(entry.path, 'removed')
    }
  }

  // Check right entries for added files
  for (const entry of rightEntries) {
    if (!leftPaths.has(entry.path)) {
      statusMap.set(entry.path, 'added')
    }
  }

  return statusMap
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ArchiveDiffViewer({ leftPath, rightPath, onFileExtract }: ArchiveDiffViewerProps) {
  const [leftEntries, setLeftEntries] = useState<ArchiveEntry[]>([])
  const [rightEntries, setRightEntries] = useState<ArchiveEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['']))
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  // Load archive contents
  useEffect(() => {
    const loadArchives = async () => {
      if (!leftPath && !rightPath) return

      setIsLoading(true)
      setError(null)

      try {
        if (leftPath) {
          const entries = await invoke<ArchiveEntry[]>('list_archive_entries', { path: leftPath })
          setLeftEntries(entries)
        } else {
          setLeftEntries([])
        }

        if (rightPath) {
          const entries = await invoke<ArchiveEntry[]>('list_archive_entries', { path: rightPath })
          setRightEntries(entries)
        } else {
          setRightEntries([])
        }
      } catch (e) {
        setError(String(e))
      } finally {
        setIsLoading(false)
      }
    }

    loadArchives()
  }, [leftPath, rightPath])

  // Compute comparison status
  const statusMap = useMemo(() => {
    return compareArchiveEntries(leftEntries, rightEntries)
  }, [leftEntries, rightEntries])

  // Build trees
  const leftTree = useMemo(() => buildArchiveTree(leftEntries), [leftEntries])
  const rightTree = useMemo(() => buildArchiveTree(rightEntries), [rightEntries])

  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const handleDoubleClick = async (entry: ArchiveEntryNode) => {
    if (entry.is_dir) return

    setIsLoading(true)
    try {
      let leftContent: Uint8Array | null = null
      let rightContent: Uint8Array | null = null

      if (leftPath && leftEntries.find(e => e.path === entry.path)) {
        leftContent = await invoke<Uint8Array>('extract_archive_file', {
          archivePath: leftPath,
          entryPath: entry.path,
        })
      }

      if (rightPath && rightEntries.find(e => e.path === entry.path)) {
        rightContent = await invoke<Uint8Array>('extract_archive_file', {
          archivePath: rightPath,
          entryPath: entry.path,
        })
      }

      onFileExtract?.(leftContent, rightContent, entry.path)
    } catch (e) {
      setError(`Failed to extract file: ${e}`)
    } finally {
      setIsLoading(false)
    }
  }

  const getFileName = (path: string) => path.split(/[/\\]/).pop() || path

  // Stats
  const stats = useMemo(() => {
    const added = leftEntries.filter(e => statusMap.get(e.path) === 'added').length
    const removed = leftEntries.filter(e => statusMap.get(e.path) === 'removed').length
    const modified = leftEntries.filter(e => statusMap.get(e.path) === 'modified').length
    return { added, removed, modified }
  }, [leftEntries, statusMap])

  // Render tree node
  const renderNode = (node: ArchiveEntryNode, depth: number = 0, side: 'left' | 'right' = 'left') => {
    const status = statusMap.get(node.path) || 'equal'
    const isExpanded = expandedPaths.has(node.path)
    const isSelected = selectedPath === node.path

    return (
      <div key={node.path}>
        <div
          className={`archive-node depth-${depth} ${node.is_dir ? 'dir' : 'file'} ${status} ${isSelected ? 'selected' : ''}`}
          onClick={() => {
            setSelectedPath(node.path)
            if (node.is_dir) toggleExpand(node.path)
          }}
          onDoubleClick={() => handleDoubleClick(node)}
        >
          {node.is_dir && (
            <span className="archive-expand-icon">
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          )}
          {!node.is_dir && <span className="archive-file-icon"><File size={12} /></span>}
          {node.is_dir && <span className="archive-dir-icon"><FolderOpen size={12} /></span>}
          <span className="archive-name">{node.name}</span>
          {!node.is_dir && (
            <span className="archive-size">
              {node.compressed_size && node.compressed_size !== node.size
                ? `${formatSize(node.size)} (${formatSize(node.compressed_size)} packed)`
                : formatSize(node.size)}
            </span>
          )}
          <span className={`archive-status ${status}`}>
            {status === 'equal' ? '=' : status === 'added' ? '+' : status === 'removed' ? '-' : '~'}
          </span>
        </div>

        {node.is_dir && isExpanded && (
          <div className="archive-children">
            {node.children.map(child => renderNode(child, depth + 1, side))}
          </div>
        )}
      </div>
    )
  }

  if (!leftPath && !rightPath) {
    return (
      <div className="archive-empty">
        <div className="archive-empty-icon">📦</div>
        <div className="archive-empty-title">Select archive files to compare</div>
        <div className="archive-empty-subtitle">
          Supported: .zip, .tar, .tar.gz, .tar.bz2
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="archive-loading">
        <span className="archive-spinner">⏳</span>
        <span className="archive-loading-text">Loading archive contents...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="archive-error">
        <span className="archive-error-icon">❌</span>
        <span className="archive-error-text">{error}</span>
      </div>
    )
  }

  return (
    <div className="archive-container">
      <div className="archive-header">
        <div className="archive-info">
          {leftPath && (
            <div className="archive-file-info left">
              <span className="archive-badge">L</span>
              <span className="archive-name">{getFileName(leftPath)}</span>
              <span className="archive-count">{leftEntries.length} entries</span>
            </div>
          )}
          {rightPath && (
            <div className="archive-file-info right">
              <span className="archive-badge">R</span>
              <span className="archive-name">{getFileName(rightPath)}</span>
              <span className="archive-count">{rightEntries.length} entries</span>
            </div>
          )}
        </div>

        <div className="archive-stats">
          {stats.added > 0 && <span className="stat-added">+{stats.added}</span>}
          {stats.removed > 0 && <span className="stat-removed">-{stats.removed}</span>}
          {stats.modified > 0 && <span className="stat-modified">~{stats.modified}</span>}
        </div>

        <div className="archive-actions">
          <button className="archive-expand-all" onClick={() => {
            const allPaths = new Set<string>()
            const collectPaths = (node: ArchiveEntryNode) => {
              if (node.is_dir) allPaths.add(node.path)
              node.children.forEach(collectPaths)
            }
            collectPaths(leftTree)
            collectPaths(rightTree)
            setExpandedPaths(allPaths)
          }}>
            Expand All
          </button>
          <button className="archive-collapse-all" onClick={() => setExpandedPaths(new Set())}>
            Collapse All
          </button>
        </div>
      </div>

      <div className="archive-views">
        <div className="archive-pane left-pane">
          <div className="archive-pane-header">
            <span className="pane-badge">L</span>
            {leftPath ? getFileName(leftPath) : 'No archive'}
          </div>
          <div className="archive-tree">
            {renderNode(leftTree, 0, 'left')}
          </div>
        </div>

        <div className="archive-divider" />

        <div className="archive-pane right-pane">
          <div className="archive-pane-header">
            <span className="pane-badge">R</span>
            {rightPath ? getFileName(rightPath) : 'No archive'}
          </div>
          <div className="archive-tree">
            {renderNode(rightTree, 0, 'right')}
          </div>
        </div>
      </div>

      <div className="archive-status-bar">
        <div className="status-item">
          <Download size={12} />
          <span>Double-click file to extract and compare</span>
        </div>
      </div>
    </div>
  )
}