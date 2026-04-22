import { describe, it, expect } from 'vitest'
import {
  formatFileSize,
  formatDate,
  getFolderStats,
  type FolderItem
} from './folderCompare'

describe('folderCompare utilities', () => {
  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(100)).toBe('100 B')
      expect(formatFileSize(512)).toBe('512 B')
    })

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB')
      expect(formatFileSize(2048)).toBe('2.0 KB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
    })

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB')
    })

    it('should handle undefined', () => {
      expect(formatFileSize(undefined)).toBe('-')
    })

    it('should handle zero', () => {
      // formatFileSize returns '-' for zero because !0 is true
      expect(formatFileSize(0)).toBe('-')
    })
  })

  describe('formatDate', () => {
    it('should format timestamp', () => {
      const timestamp = new Date('2024-01-15T10:30:00').getTime()
      const result = formatDate(timestamp)
      expect(result).toMatch(/2024/)
    })

    it('should handle undefined', () => {
      expect(formatDate(undefined)).toBe('-')
    })
  })

  describe('getFolderStats', () => {
    it('should count file statuses correctly', () => {
      const items: FolderItem[] = [
        { name: 'added.txt', path: 'added.txt', type: 'file', status: 'added' },
        { name: 'removed.txt', path: 'removed.txt', type: 'file', status: 'removed' },
        { name: 'modified.txt', path: 'modified.txt', type: 'file', status: 'modified' },
        { name: 'equal.txt', path: 'equal.txt', type: 'file', status: 'equal' },
        { name: 'folder', path: 'folder', type: 'folder', status: 'equal', children: [
          { name: 'nested.txt', path: 'nested.txt', type: 'file', status: 'added' }
        ]}
      ]

      const stats = getFolderStats(items)
      expect(stats.added).toBe(2) // 1 top + 1 nested
      expect(stats.removed).toBe(1)
      expect(stats.modified).toBe(1)
      expect(stats.equal).toBe(1)
    })

    it('should handle empty items', () => {
      const stats = getFolderStats([])
      expect(stats.added).toBe(0)
      expect(stats.removed).toBe(0)
      expect(stats.modified).toBe(0)
      expect(stats.equal).toBe(0)
    })

    it('should ignore folders in counting', () => {
      const items: FolderItem[] = [
        { name: 'folder1', path: 'folder1', type: 'folder', status: 'added' },
        { name: 'folder2', path: 'folder2', type: 'folder', status: 'removed' }
      ]

      const stats = getFolderStats(items)
      expect(stats.added).toBe(0)
      expect(stats.removed).toBe(0)
    })
  })
})