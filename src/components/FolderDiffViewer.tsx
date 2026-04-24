import { useState, useEffect, useCallback } from 'react'
import type { FolderItem, FileContent, CompareRule } from '../types'
import { getLanguageFromPath } from '../utils/diff'
import { getFileCategory } from '../utils/binaryCheck'
import { SyncPanel } from './SyncPanel'
import { FilePreviewPanel } from './FilePreviewPanel'
import { AlignmentDialog } from './AlignmentDialog'
import { formatFileSize, formatDate } from '../utils/folderCompare'
import { Folder, File, BarChart2, List, ChevronUp, ChevronDown, Link2 } from 'lucide-react'

type CompareMode = 'text' | 'image' | 'audio' | 'archive' | 'binary' | 'folder'

interface AlignmentMap {
  [leftPath: string]: string
}

interface FolderDiffViewerProps {
  leftFolder: FolderItem | null
  rightFolder: FolderItem | null
  diffItems: FolderItem[]
  alignmentMap?: AlignmentMap
  onAlignmentChange?: (map: AlignmentMap) => void
  onFileSelect?: (leftFile: FileContent, rightFile: FileContent | null) => void
  onOpenInMode?: (mode: CompareMode, leftPath: string, rightPath: string | null) => void
  onRefresh?: () => void
  onCompareRuleChange?: (rule: CompareRule) => void
  compareRule?: CompareRule
}

export function FolderDiffViewer({
  leftFolder,
  rightFolder,
  diffItems,
  alignmentMap = {},
  onAlignmentChange,
  onFileSelect,
  onOpenInMode,
  onRefresh,
  onCompareRuleChange,
  compareRule = 'content',
}: FolderDiffViewerProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [showAttributes, setShowAttributes] = useState(true)
  const [selectedFile, setSelectedFile] = useState<FolderItem | null>(null)
  const [currentDiffIndex, setCurrentDiffIndex] = useState<number>(0)
  const [showAlignmentDialog, setShowAlignmentDialog] = useState(false)
  const [alignmentTarget, setAlignmentTarget] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: FolderItem } | null>(null)

  // 获取所有差异文件列表（有序）
  const getDiffFileList = useCallback((): FolderItem[] => {
    const diffFiles: FolderItem[] = []
    const traverse = (items: FolderItem[]) => {
      for (const item of items) {
        if (item.type === 'file' && item.status !== 'equal') {
          diffFiles.push(item)
        }
        if (item.children) {
          traverse(item.children)
        }
      }
    }
    traverse(diffItems)
    return diffFiles
  }, [diffItems])

  const diffFileList = getDiffFileList()
  const totalDiffs = diffFileList.length

  // 导航到下一个差异
  const goToNextDiff = useCallback(() => {
    if (totalDiffs === 0) return
    const nextIndex = currentDiffIndex < totalDiffs - 1 ? currentDiffIndex + 1 : 0
    setCurrentDiffIndex(nextIndex)
    const nextFile = diffFileList[nextIndex]
    if (nextFile) {
      setSelectedPaths(new Set([nextFile.path]))
      setSelectedFile(nextFile)
      // 展开父目录
      expandPathParents(nextFile.path)
    }
  }, [currentDiffIndex, totalDiffs, diffFileList])

  // 导航到上一个差异
  const goToPrevDiff = useCallback(() => {
    if (totalDiffs === 0) return
    const prevIndex = currentDiffIndex > 0 ? currentDiffIndex - 1 : totalDiffs - 1
    setCurrentDiffIndex(prevIndex)
    const prevFile = diffFileList[prevIndex]
    if (prevFile) {
      setSelectedPaths(new Set([prevFile.path]))
      setSelectedFile(prevFile)
      // 展开父目录
      expandPathParents(prevFile.path)
    }
  }, [currentDiffIndex, totalDiffs, diffFileList])

  // 展开路径的所有父目录
  const expandPathParents = (path: string) => {
    const parts = path.split('/')
    const parents: string[] = []
    for (let i = 0; i < parts.length - 1; i++) {
      parents.push(parts.slice(0, i + 1).join('/'))
    }
    setExpandedPaths(prev => {
      const newExpanded = new Set(prev)
      parents.forEach(p => newExpanded.add(p))
      return newExpanded
    })
  }

  // 键盘快捷键支持 (F7 = 下一个差异, F8 = 上一个差异)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F7' || (e.key === 'n' && e.ctrlKey)) {
        e.preventDefault()
        goToNextDiff()
      } else if (e.key === 'F8' || (e.key === 'p' && e.ctrlKey)) {
        e.preventDefault()
        goToPrevDiff()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToNextDiff, goToPrevDiff])

  // 当选择文件时更新当前差异索引
  useEffect(() => {
    if (selectedFile) {
      const index = diffFileList.findIndex(f => f.path === selectedFile.path)
      if (index !== -1) {
        setCurrentDiffIndex(index)
      }
    }
  }, [selectedFile, diffFileList])

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

  // 获取右侧所有文件路径列表
  const getAllRightFiles = useCallback((): string[] => {
    const files: string[] = []
    const traverse = (items: FolderItem[]) => {
      for (const item of items) {
        if (item.type === 'file') {
          files.push(item.path)
        }
        if (item.children) {
          traverse(item.children)
        }
      }
    }
    if (rightFolder) {
      traverse([rightFolder])
    }
    return files
  }, [rightFolder])

  // 右键菜单处理
  const handleContextMenu = (item: FolderItem, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (item.type === 'file') {
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        item,
      })
    }
  }

  const closeContextMenu = () => {
    setContextMenu(null)
  }

  // 打开对齐对话框
  const openAlignmentDialog = (leftPath: string) => {
    setAlignmentTarget(leftPath)
    setShowAlignmentDialog(true)
    closeContextMenu()
  }

  // 处理对齐
  const handleAlignment = (leftPath: string, rightPath: string) => {
    if (onAlignmentChange) {
      const newMap = { ...alignmentMap, [leftPath]: rightPath }
      onAlignmentChange(newMap)
    }
    setShowAlignmentDialog(false)
    setAlignmentTarget(null)
  }

  // 清除对齐
  const clearAlignment = (leftPath: string) => {
    if (onAlignmentChange) {
      const newMap = { ...alignmentMap }
      delete newMap[leftPath]
      onAlignmentChange(newMap)
    }
    closeContextMenu()
  }

  // 点击其他地方关闭右键菜单
  useEffect(() => {
    const handleClickOutside = () => closeContextMenu()
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

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
      setSelectedFile(item)
    }
  }

  const handleItemDoubleClick = (item: FolderItem) => {
    if (item.type === 'file' && leftFolder && rightFolder) {
      const normalizePath = (base: string, relative: string) => {
        const baseNormalized = base.replace(/\\/g, '/')
        const relativeNormalized = relative.replace(/\\/g, '/')
        return `${baseNormalized}/${relativeNormalized}`
      }

      const leftPath = normalizePath(leftFolder.path, item.path)
      const rightPath = item.status === 'added' ? null : normalizePath(rightFolder.path, item.path)

      // 检测文件类型，自动选择合适的对比模式
      const category = getFileCategory(item.path)

      // 如果有模式切换回调，使用智能模式切换
      if (onOpenInMode) {
        let targetMode: CompareMode = 'text'

        switch (category) {
          case 'image':
            targetMode = 'image'
            break
          case 'audio':
            targetMode = 'audio'
            break
          case 'archive':
            targetMode = 'archive'
            break
          case 'binary':
            targetMode = 'binary'
            break
          default:
            targetMode = 'text'
        }

        onOpenInMode(targetMode, leftPath, rightPath)
      } else if (onFileSelect) {
        // 传统回调，仅用于文本文件
        onFileSelect({
          path: leftPath,
          content: '',
          language: getLanguageFromPath(leftPath),
        }, rightPath ? {
          path: rightPath,
          content: '',
          language: getLanguageFromPath(rightPath),
        } : null)
      }
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
          onContextMenu={(e) => handleContextMenu(item, e)}
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

        {/* Navigation controls */}
        {totalDiffs > 0 && (
          <div className="folder-nav-controls">
            <button
              className="folder-nav-btn"
              onClick={goToPrevDiff}
              disabled={totalDiffs === 0}
              title="Previous difference (F8)"
            >
              <ChevronUp size={14} />
            </button>
            <span className="folder-nav-counter">
              {currentDiffIndex + 1}/{totalDiffs}
            </span>
            <button
              className="folder-nav-btn"
              onClick={goToNextDiff}
              disabled={totalDiffs === 0}
              title="Next difference (F7)"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        )}

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

      {/* File Preview Panel */}
      {selectedFile && leftFolder && rightFolder && (
        <FilePreviewPanel
          leftPath={selectedFile.status === 'added' ? null : selectedFile.path}
          rightPath={selectedFile.status === 'removed' ? null : selectedFile.path}
          status={selectedFile.status}
          leftFolder={leftFolder.path}
          rightFolder={rightFolder.path}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="context-menu-item" onClick={() => openAlignmentDialog(contextMenu.item.path)}>
            <Link2 size={14} />
            <span>手动对齐到右侧文件</span>
          </div>
          {alignmentMap[contextMenu.item.path] && (
            <div className="context-menu-item" onClick={() => clearAlignment(contextMenu.item.path)}>
              <span>取消对齐</span>
              <span className="context-menu-hint">
                (已对齐到 {alignmentMap[contextMenu.item.path]})
              </span>
            </div>
          )}
          <div className="context-menu-divider" />
          <div className="context-menu-item" onClick={closeContextMenu}>
            <span>关闭</span>
          </div>
        </div>
      )}

      {/* Alignment Dialog */}
      {showAlignmentDialog && alignmentTarget && (
        <AlignmentDialog
          isOpen={showAlignmentDialog}
          leftPath={alignmentTarget}
          onClose={() => {
            setShowAlignmentDialog(false)
            setAlignmentTarget(null)
          }}
          onAlign={handleAlignment}
          availableRightFiles={getAllRightFiles()}
        />
      )}
    </div>
  )
}