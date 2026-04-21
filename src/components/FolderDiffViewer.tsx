import { useState } from 'react'
import type { FolderItem, FileContent, CompareRule } from '../types'
import { getLanguageFromPath } from '../utils/diff'
import { SyncPanel } from './SyncPanel'
import { formatFileSize, formatDate } from '../utils/folderCompare'
import { Folder, File, BarChart2, List } from 'lucide-react'

interface FolderDiffViewerProps {
  leftFolder: FolderItem | null
  rightFolder: FolderItem | null
  diffItems: FolderItem[]
  onFileSelect?: (leftFile: FileContent, rightFile: FileContent | null) => void
  onRefresh?: () => void
  onCompareRuleChange?: (rule: CompareRule) => void
  compareRule?: CompareRule
}

export function FolderDiffViewer({
  leftFolder,
  rightFolder,
  diffItems,
  onFileSelect,
  onRefresh,
  onCompareRuleChange,
  compareRule = 'content',
}: FolderDiffViewerProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [showAttributes, setShowAttributes] = useState(true)

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedPaths)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    setExpandedPaths(newExpanded)
  }

  const toggleSelect = (path: string, isCtrlPressed: boolean) => {
    if (isCtrlPressed) {
      const newSelected = new Set(selectedPaths)
      if (newSelected.has(path)) {
        newSelected.delete(path)
      } else {
        newSelected.add(path)
      }
      setSelectedPaths(newSelected)
    } else {
      setSelectedPaths(new Set([path]))
    }
  }

  const selectAllDiffs = () => {
    const diffPaths = new Set<string>()
    const traverse = (items: FolderItem[]) => {
      for (const item of items) {
        if (item.type === 'file' && item.status !== 'equal') {
          diffPaths.add(item.path)
        }
        if (item.children) {
          traverse(item.children)
        }
      }
    }
    traverse(diffItems)
    setSelectedPaths(diffPaths)
  }

  const clearSelection = () => {
    setSelectedPaths(new Set())
  }

  const getStatusIcon = (status: FolderItem['status']) => {
    switch (status) {
      case 'added': return '➕'
      case 'removed': return '➖'
      case 'modified': return '📝'
      case 'equal': return '✓'
    }
  }

  const getStatusColor = (status: FolderItem['status']) => {
    switch (status) {
      case 'added': return 'var(--diff-added-line)'
      case 'removed': return 'var(--diff-removed-line)'
      case 'modified': return 'var(--diff-modified-line)'
      case 'equal': return 'var(--text-muted)'
    }
  }

  const getStatusBg = (status: FolderItem['status']) => {
    switch (status) {
      case 'added': return 'var(--diff-added-bg)'
      case 'removed': return 'var(--diff-removed-bg)'
      case 'modified': return 'var(--diff-modified-bg)'
      case 'equal': return 'transparent'
    }
  }

  const handleItemClick = (item: FolderItem, event: React.MouseEvent) => {
    event.stopPropagation()

    if (item.type === 'folder') {
      toggleExpand(item.path)
    } else {
      toggleSelect(item.path, event.ctrlKey || event.metaKey)
    }
  }

  const handleItemDoubleClick = (item: FolderItem) => {
    if (item.type === 'file' && onFileSelect && leftFolder && rightFolder) {
      const normalizePath = (base: string, relative: string) => {
        const baseNormalized = base.replace(/\\/g, '/')
        const relativeNormalized = relative.replace(/\\/g, '/')
        return `${baseNormalized}/${relativeNormalized}`
      }

      const leftPath = normalizePath(leftFolder.path, item.path)
      const rightPath = normalizePath(rightFolder.path, item.path)

      onFileSelect({
        path: leftPath,
        content: '',
        language: getLanguageFromPath(leftPath),
      }, item.status === 'added' ? null : {
        path: rightPath,
        content: '',
        language: getLanguageFromPath(rightPath),
      })
    }
  }

  const getSelectedItems = (): FolderItem[] => {
    const selected: FolderItem[] = []
    const traverse = (items: FolderItem[]) => {
      for (const item of items) {
        if (selectedPaths.has(item.path)) {
          selected.push(item)
        }
        if (item.children) {
          traverse(item.children)
        }
      }
    }
    traverse(diffItems)
    return selected
  }

  const renderItem = (item: FolderItem, depth: number = 0) => {
    const isExpanded = expandedPaths.has(item.path)
    const hasChildren = item.children && item.children.length > 0
    const isSelected = selectedPaths.has(item.path)

    return (
      <div key={item.path} className="tree-item">
        <div
          className={`tree-row ${isSelected ? 'selected' : ''}`}
          style={{
            paddingLeft: `${depth * 20 + 8}px`,
            backgroundColor: isSelected
              ? 'rgba(233, 69, 96, 0.2)'
              : getStatusBg(item.status),
          }}
          onClick={(e) => handleItemClick(item, e)}
          onDoubleClick={() => handleItemDoubleClick(item)}
        >
          {item.type === 'folder' && (
            <span className="tree-expand-icon">
              {hasChildren ? (isExpanded ? '▼' : '▶') : '•'}
            </span>
          )}

          {item.type !== 'folder' && (
            <span className="tree-expand-icon" style={{ width: '16px' }} />
          )}

          <span className="tree-item-icon">
            {item.type === 'folder' ? <Folder size={14} /> : <File size={14} />}
          </span>

          <span className="tree-item-name">{item.name}</span>

          {/* File attributes */}
          {showAttributes && item.type === 'file' && (
            <>
              <span className="tree-item-size" title="File size">
                {formatFileSize(item.size)}
              </span>
              <span className="tree-item-date" title="Modified date">
                {formatDate(item.modifiedTime)}
              </span>
            </>
          )}

          <span
            className="tree-status-icon"
            style={{ color: getStatusColor(item.status) }}
          >
            {getStatusIcon(item.status)}
          </span>
        </div>

        {isExpanded && item.children && (
          <div className="tree-children">
            {item.children.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (!leftFolder && !rightFolder) {
    return (
      <div className="folder-diff-empty">
        <div className="folder-empty-icon"><Folder size={48} /></div>
        <div className="folder-empty-title">Select folders to compare</div>
        <div className="folder-empty-subtitle">
          Choose two directories to see their differences
        </div>
      </div>
    )
  }

  if (diffItems.length === 0) {
    return (
      <div className="folder-diff-empty">
        <div className="folder-empty-icon">✓</div>
        <div className="folder-empty-title">Folders are identical</div>
        <div className="folder-empty-subtitle">
          No differences found between the selected folders
        </div>
      </div>
    )
  }

  return (
    <div className="folder-diff-container">
      <div className="folder-diff-header">
        <span className="folder-diff-title">
          {leftFolder?.name} vs {rightFolder?.name}
        </span>

        <div className="folder-diff-actions">
          {/* Compare rule selector */}
          <select
            className="compare-rule-select"
            value={compareRule}
            onChange={(e) => onCompareRuleChange?.(e.target.value as CompareRule)}
            title="Comparison rule"
          >
            <option value="content">Content</option>
            <option value="size">Size</option>
            <option value="date">Date</option>
          </select>

          {/* Toggle attributes */}
          <button
            className={`folder-attr-btn ${showAttributes ? 'active' : ''}`}
            onClick={() => setShowAttributes(!showAttributes)}
            title={showAttributes ? 'Hide file attributes' : 'Show file attributes'}
          >
            {showAttributes ? <BarChart2 size={14} /> : <List size={14} />}
          </button>

          <button
            className="folder-action-btn"
            onClick={selectAllDiffs}
            title="Select all files with differences"
          >
            Select All Diff
          </button>
          <button
            className="folder-action-btn"
            onClick={clearSelection}
            disabled={selectedPaths.size === 0}
            title="Clear selection"
          >
            Clear Selection
          </button>
        </div>
      </div>

      <SyncPanel
        leftFolder={leftFolder}
        rightFolder={rightFolder}
        selectedItems={getSelectedItems()}
        allDiffItems={diffItems}
        onSyncComplete={onRefresh}
      />

      {/* Attribute header when shown */}
      {showAttributes && (
        <div className="tree-header">
          <span className="tree-header-expand" style={{ width: '16px' }} />
          <span className="tree-header-icon" style={{ width: '20px' }} />
          <span className="tree-header-name">Name</span>
          <span className="tree-header-size">Size</span>
          <span className="tree-header-date">Modified</span>
          <span className="tree-header-status">Status</span>
        </div>
      )}

      <div className="folder-tree">
        {diffItems.map((item) => renderItem(item))}
      </div>
    </div>
  )
}