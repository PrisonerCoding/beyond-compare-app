import type { FolderItem } from '../types'
import { Folder, File, Plus, Minus, FileEdit, Check, ChevronDown, ChevronRight } from 'lucide-react'

interface FolderTreeProps {
  items: FolderItem[]
  onItemClick?: (item: FolderItem) => void
  expandedPaths?: Set<string>
  onToggleExpand?: (path: string) => void
}

export function FolderTree({ items, onItemClick, expandedPaths, onToggleExpand }: FolderTreeProps) {
  const getStatusIcon = (status: FolderItem['status']) => {
    switch (status) {
      case 'added':
        return <Plus size={12} />
      case 'removed':
        return <Minus size={12} />
      case 'modified':
        return <FileEdit size={12} />
      case 'equal':
        return <Check size={12} />
    }
  }

  const getStatusColor = (status: FolderItem['status']) => {
    switch (status) {
      case 'added':
        return 'var(--diff-added-line)'
      case 'removed':
        return 'var(--diff-removed-line)'
      case 'modified':
        return 'var(--diff-modified-line)'
      case 'equal':
        return 'var(--text-muted)'
    }
  }

  const renderItem = (item: FolderItem, depth: number = 0) => {
    const isExpanded = expandedPaths?.has(item.path)
    const hasChildren = item.children && item.children.length > 0

    return (
      <div key={item.path} className="tree-item">
        <div
          className="tree-row"
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            if (item.type === 'folder' && onToggleExpand) {
              onToggleExpand(item.path)
            } else if (onItemClick) {
              onItemClick(item)
            }
          }}
        >
          {item.type === 'folder' && (
            <span className="tree-expand-icon">
              {hasChildren ? (isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />) : '•'}
            </span>
          )}

          <span className="tree-item-icon">
            {item.type === 'folder' ? <Folder size={14} /> : <File size={14} />}
          </span>

          <span className="tree-item-name">{item.name}</span>

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

  if (items.length === 0) {
    return (
      <div className="tree-empty">
        <div className="tree-empty-text">No folder selected</div>
      </div>
    )
  }

  return (
    <div className="folder-tree">
      {items.map((item) => renderItem(item))}
    </div>
  )
}