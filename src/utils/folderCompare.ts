import { readDir, readTextFile, stat } from '@tauri-apps/plugin-fs'
import type { FolderItem, CompareRule } from '../types'
import { matchesFilter } from '../components/FilterPanel'

interface DirEntry {
  name: string
  path: string
  isDirectory: boolean
  size?: number
  modifiedTime?: number
}

async function scanDirectory(dirPath: string, recursive: boolean = true): Promise<DirEntry[]> {
  const entries: DirEntry[] = []

  try {
    const files = await readDir(dirPath)

    for (const file of files) {
      const entry: DirEntry = {
        name: file.name,
        path: `${dirPath}/${file.name}`,
        isDirectory: file.isDirectory ?? false,
      }

      // Get file metadata for files
      if (!file.isDirectory) {
        try {
          const fileStat = await stat(entry.path)
          entry.size = fileStat.size
          entry.modifiedTime = fileStat.mtime?.getTime()
        } catch {
          // Skip if can't get metadata
        }
      }

      entries.push(entry)

      if (recursive && file.isDirectory) {
        const subEntries = await scanDirectory(entry.path, recursive)
        entries.push(...subEntries)
      }
    }
  } catch (error) {
    console.error(`Failed to scan directory ${dirPath}:`, error)
  }

  return entries
}

function buildTree(entries: DirEntry[], basePath: string): FolderItem[] {
  const root: Map<string, FolderItem> = new Map()

  for (const entry of entries) {
    const relativePath = entry.path.replace(basePath, '').replace(/^[/\\]/, '')
    const parts = relativePath.split(/[/\\]/)

    let current = root
    let currentPath = basePath

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      currentPath = `${currentPath}/${part}`

      if (!current.has(part)) {
        const isLastPart = i === parts.length - 1
        current.set(part, {
          name: part,
          path: currentPath,
          type: isLastPart && !entry.isDirectory ? 'file' : 'folder',
          status: 'equal',
          size: entry.size,
          modifiedTime: entry.modifiedTime,
          children: isLastPart ? undefined : [],
        })
      }

      if (i < parts.length - 1) {
        const item = current.get(part)!
        if (!item.children) {
          item.children = []
        }
        current = new Map(item.children.map(c => [c.name, c]))
      }
    }
  }

  return Array.from(root.values())
}

function compareByRule(
  leftEntry: DirEntry,
  rightEntry: DirEntry,
  rule: CompareRule
): FolderItem['status'] {
  if (rule === 'date') {
    // Compare by modification time
    if (leftEntry.modifiedTime && rightEntry.modifiedTime) {
      if (leftEntry.modifiedTime === rightEntry.modifiedTime) return 'equal'
      if (leftEntry.modifiedTime < rightEntry.modifiedTime) return 'modified'
      if (leftEntry.modifiedTime > rightEntry.modifiedTime) return 'modified'
    }
    return 'modified'
  }

  if (rule === 'size') {
    // Compare by file size
    if (leftEntry.size && rightEntry.size) {
      return leftEntry.size === rightEntry.size ? 'equal' : 'modified'
    }
    return 'modified'
  }

  if (rule === 'binary') {
    // For binary comparison, we just check size for now
    // Full binary comparison would require reading and comparing content
    if (leftEntry.size && rightEntry.size) {
      return leftEntry.size === rightEntry.size ? 'equal' : 'modified'
    }
    return 'modified'
  }

  // Content comparison (default)
  return 'modified' // Will be determined by actual content comparison
}

async function compareTextFiles(leftContent: string, rightContent: string): boolean {
  return leftContent === rightContent
}

export async function compareFolders(
  leftPath: string,
  rightPath: string,
  options?: {
    recursive?: boolean
    ignorePatterns?: string[]
    compareRule?: CompareRule
  }
): Promise<FolderItem[]> {
  const recursive = options?.recursive ?? true
  const ignorePatterns = options?.ignorePatterns ?? ['node_modules', '.git', '.DS_Store', 'Thumbs.db']
  const compareRule = options?.compareRule ?? 'content'

  const leftEntries = await scanDirectory(leftPath, recursive)
  const rightEntries = await scanDirectory(rightPath, recursive)

  const leftMap = new Map<string, DirEntry>()
  const rightMap = new Map<string, DirEntry>()

  for (const entry of leftEntries) {
    const relativePath = entry.path.replace(leftPath, '').replace(/^[/\\]/, '')
    if (!matchesFilter(relativePath, ignorePatterns)) {
      leftMap.set(relativePath, entry)
    }
  }

  for (const entry of rightEntries) {
    const relativePath = entry.path.replace(rightPath, '').replace(/^[/\\]/, '')
    if (!matchesFilter(relativePath, ignorePatterns)) {
      rightMap.set(relativePath, entry)
    }
  }

  const allPaths = new Set([...leftMap.keys(), ...rightMap.keys()])
  const result: FolderItem[] = []

  for (const relativePath of allPaths) {
    const parts = relativePath.split(/[/\\]/)
    const leftEntry = leftMap.get(relativePath)
    const rightEntry = rightMap.get(relativePath)

    let status: FolderItem['status'] = 'equal'

    if (leftEntry && !rightEntry) {
      status = 'removed'
    } else if (!leftEntry && rightEntry) {
      status = 'added'
    } else if (leftEntry && rightEntry) {
      if (leftEntry.isDirectory && rightEntry.isDirectory) {
        status = 'equal'
      } else if (!leftEntry.isDirectory && !rightEntry.isDirectory) {
        if (compareRule === 'content') {
          try {
            const leftContent = await readTextFile(leftEntry.path)
            const rightContent = await readTextFile(rightEntry.path)
            status = compareTextFiles(leftContent, rightContent) ? 'equal' : 'modified'
          } catch {
            status = compareByRule(leftEntry, rightEntry, 'size')
          }
        } else {
          status = compareByRule(leftEntry, rightEntry, compareRule)
        }
      } else {
        status = 'modified'
      }
    }

    // Build tree structure
    let current = result
    let currentPath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const isLastPart = i === parts.length - 1
      const isDirectory = isLastPart
        ? (leftEntry?.isDirectory ?? rightEntry?.isDirectory ?? false)
        : true

      const size = isLastPart && !isDirectory
        ? (leftEntry?.size ?? rightEntry?.size)
        : undefined

      const modifiedTime = isLastPart && !isDirectory
        ? (leftEntry?.modifiedTime ?? rightEntry?.modifiedTime)
        : undefined

      let item = current.find(c => c.name === part)

      if (!item) {
        item = {
          name: part,
          path: currentPath,
          type: isDirectory ? 'folder' : 'file',
          status: isLastPart ? status : 'equal',
          size,
          modifiedTime,
          children: isLastPart && !isDirectory ? undefined : [],
        }
        current.push(item)
      } else if (isLastPart) {
        item.status = status
        if (size) item.size = size
        if (modifiedTime) item.modifiedTime = modifiedTime
      }

      if (!isLastPart && item.children) {
        current = item.children
      }
    }
  }

  // Sort: folders first, then files, alphabetically
  const sortItems = (items: FolderItem[]): FolderItem[] => {
    return items
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1
        }
        return a.name.localeCompare(b.name)
      })
      .map(item => {
        if (item.children) {
          return { ...item, children: sortItems(item.children) }
        }
        return item
      })
  }

  return sortItems(result)
}

export function getFolderStats(items: FolderItem[]): {
  added: number
  removed: number
  modified: number
  equal: number
} {
  let added = 0
  let removed = 0
  let modified = 0
  let equal = 0

  const traverse = (item: FolderItem) => {
    if (item.type === 'file') {
      switch (item.status) {
        case 'added':
          added++
          break
        case 'removed':
          removed++
          break
        case 'modified':
          modified++
          break
        case 'equal':
          equal++
          break
      }
    }
    if (item.children) {
      item.children.forEach(traverse)
    }
  }

  items.forEach(traverse)

  return { added, removed, modified, equal }
}

// Format file size for display
export function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return '-'

  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// Format date for display
export function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return '-'

  const date = new Date(timestamp)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}