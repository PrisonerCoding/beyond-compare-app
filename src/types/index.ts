export interface FileContent {
  path: string
  content: string
  language?: string
}

export interface DiffLine {
  type: 'equal' | 'added' | 'removed' | 'modified'
  leftContent?: string
  rightContent?: string
  lineNumberLeft?: number
  lineNumberRight?: number
}

export interface CompareMode {
  type: 'text' | 'folder' | 'binary' | 'image' | 'merge' | 'archive' | 'audio'
  label: string
  icon?: string
}

export interface SyncAction {
  type: 'copy-left-to-right' | 'copy-right-to-left' | 'delete-left' | 'delete-right'
  path: string
}

export interface FolderItem {
  path: string
  name: string
  type: 'file' | 'folder'
  status: 'equal' | 'added' | 'removed' | 'modified'
  size?: number
  modifiedTime?: number
  children?: FolderItem[]
}

export interface FileMetadata {
  path: string
  size: number
  created?: string
  modified?: string
  accessed?: string
  is_readonly: boolean
  is_hidden: boolean
  permissions?: string
  mode?: number
}

export type CompareRule = 'content' | 'size' | 'date' | 'binary'

export type LayoutMode = 'horizontal' | 'vertical'