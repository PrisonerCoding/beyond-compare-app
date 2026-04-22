import { describe, it, expect } from 'vitest'
import {
  generateSyncOperationsForMode,
  getSyncStats,
  SYNC_MODES,
  type SyncMode
} from './syncOperations'

describe('syncOperations utilities', () => {
  const testItems = [
    { path: 'added.txt', status: 'added' as const, type: 'file' as const },
    { path: 'removed.txt', status: 'removed' as const, type: 'file' as const },
    { path: 'modified.txt', status: 'modified' as const, type: 'file' as const },
    { path: 'equal.txt', status: 'equal' as const, type: 'file' as const },
  ]

  describe('SYNC_MODES', () => {
    it('should have all required modes', () => {
      expect(SYNC_MODES['update-left']).toBeDefined()
      expect(SYNC_MODES['update-right']).toBeDefined()
      expect(SYNC_MODES['mirror-left']).toBeDefined()
      expect(SYNC_MODES['mirror-right']).toBeDefined()
      expect(SYNC_MODES['bidirectional']).toBeDefined()
      expect(SYNC_MODES['differential']).toBeDefined()
    })

    it('should have correct danger levels', () => {
      expect(SYNC_MODES['update-left'].dangerLevel).toBe('safe')
      expect(SYNC_MODES['mirror-left'].dangerLevel).toBe('dangerous')
      expect(SYNC_MODES['bidirectional'].dangerLevel).toBe('warning')
    })

    it('should have labels and descriptions', () => {
      expect(SYNC_MODES['update-left'].label).toBeDefined()
      expect(SYNC_MODES['update-left'].description).toBeDefined()
      expect(SYNC_MODES['update-left'].icon).toBeDefined()
    })
  })

  describe('generateSyncOperationsForMode', () => {
    it('should generate update-left operations', () => {
      const ops = generateSyncOperationsForMode(testItems, 'update-left')
      expect(ops.filter(op => op.type === 'copy-to-left').length).toBe(2) // added + modified
    })

    it('should generate update-right operations', () => {
      const ops = generateSyncOperationsForMode(testItems, 'update-right')
      expect(ops.filter(op => op.type === 'copy-to-right').length).toBe(2) // removed + modified
    })

    it('should generate mirror-left operations', () => {
      const ops = generateSyncOperationsForMode(testItems, 'mirror-left')
      const copyOps = ops.filter(op => op.type === 'copy-to-right')
      const deleteOps = ops.filter(op => op.type === 'delete-right')
      expect(copyOps.length).toBe(2) // removed + modified
      expect(deleteOps.length).toBe(1) // added (delete from right)
    })

    it('should generate mirror-right operations', () => {
      const ops = generateSyncOperationsForMode(testItems, 'mirror-right')
      const copyOps = ops.filter(op => op.type === 'copy-to-left')
      const deleteOps = ops.filter(op => op.type === 'delete-left')
      expect(copyOps.length).toBe(2) // added + modified
      expect(deleteOps.length).toBe(1) // removed (delete from left)
    })

    it('should generate bidirectional operations (skip modified)', () => {
      const ops = generateSyncOperationsForMode(testItems, 'bidirectional')
      expect(ops.some(op => op.type === 'copy-to-left')).toBe(true) // added
      expect(ops.some(op => op.type === 'copy-to-right')).toBe(true) // removed
      // Modified files are skipped in bidirectional mode
      expect(ops.every(op => op.relativePath !== 'modified.txt')).toBe(true)
    })

    it('should return empty for differential mode', () => {
      const ops = generateSyncOperationsForMode(testItems, 'differential')
      expect(ops.length).toBe(0)
    })

    it('should skip folders', () => {
      const itemsWithFolder = [
        ...testItems,
        { path: 'folder', status: 'added' as const, type: 'folder' as const }
      ]
      const ops = generateSyncOperationsForMode(itemsWithFolder, 'update-left')
      expect(ops.every(op => !op.relativePath.includes('folder'))).toBe(true)
    })
  })

  describe('getSyncStats', () => {
    it('should return correct stats for update-left', () => {
      const stats = getSyncStats(testItems, 'update-left')
      expect(stats.copyCount).toBe(2) // added + modified
      expect(stats.deleteCount).toBe(0)
    })

    it('should return correct stats for mirror-left', () => {
      const stats = getSyncStats(testItems, 'mirror-left')
      expect(stats.copyCount).toBe(2)
      expect(stats.deleteCount).toBe(1) // added file deleted from right
    })

    it('should count skipped conflicts in bidirectional', () => {
      const stats = getSyncStats(testItems, 'bidirectional')
      expect(stats.skipCount).toBe(1) // modified file skipped
    })

    it('should return zeros for differential', () => {
      const stats = getSyncStats(testItems, 'differential')
      expect(stats.copyCount).toBe(0)
      expect(stats.deleteCount).toBe(0)
    })
  })
})