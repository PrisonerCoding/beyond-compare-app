import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getHistory,
  addHistoryEntry,
  clearHistory,
  deleteHistoryEntry,
  getHistoryByType,
  searchHistory,
  compareSnapshots,
  type HistoryEntry,
  type Snapshot
} from './history'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('history utilities', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('getHistory', () => {
    it('should return empty array when no history', () => {
      const history = getHistory()
      expect(history).toEqual([])
    })

    it('should return stored history entries', () => {
      const mockHistory = [
        { id: '1', timestamp: '2024-01-01', type: 'comparison', mode: 'text', leftPath: '/a', rightPath: '/b', leftName: 'a', rightName: 'b' },
      ]
      localStorageMock.setItem('difflens_history', JSON.stringify(mockHistory))
      const history = getHistory()
      expect(history.length).toBe(1)
      expect(history[0].id).toBe('1')
    })

    it('should handle invalid JSON', () => {
      localStorageMock.setItem('difflens_history', 'invalid json')
      const history = getHistory()
      expect(history).toEqual([])
    })
  })

  describe('addHistoryEntry', () => {
    it('should add entry to history', () => {
      const entry = addHistoryEntry({
        type: 'comparison',
        mode: 'text',
        leftPath: '/file1.txt',
        rightPath: '/file2.txt',
        leftName: 'file1',
        rightName: 'file2',
      })

      expect(entry.id).toBeDefined()
      expect(entry.timestamp).toBeDefined()
      expect(entry.type).toBe('comparison')
    })

    it('should limit history to MAX_HISTORY_ENTRIES', () => {
      // Add 105 entries
      for (let i = 0; i < 105; i++) {
        addHistoryEntry({
          type: 'comparison',
          mode: 'text',
          leftPath: `/file${i}.txt`,
          rightPath: `/file${i}-copy.txt`,
          leftName: `file${i}`,
          rightName: `file${i}-copy`,
        })
      }

      const history = getHistory()
      expect(history.length).toBeLessThanOrEqual(100)
    })

    it('should add entries in reverse order (newest first)', () => {
      addHistoryEntry({
        type: 'comparison',
        mode: 'text',
        leftPath: '/first.txt',
        rightPath: '/first-copy.txt',
        leftName: 'first',
        rightName: 'first-copy',
      })

      addHistoryEntry({
        type: 'comparison',
        mode: 'text',
        leftPath: '/second.txt',
        rightPath: '/second-copy.txt',
        leftName: 'second',
        rightName: 'second-copy',
      })

      const history = getHistory()
      expect(history[0].leftName).toBe('second')
      expect(history[1].leftName).toBe('first')
    })
  })

  describe('clearHistory', () => {
    it('should clear all history', () => {
      addHistoryEntry({
        type: 'comparison',
        mode: 'text',
        leftPath: '/test.txt',
        rightPath: '/test-copy.txt',
        leftName: 'test',
        rightName: 'test-copy',
      })

      clearHistory()
      const history = getHistory()
      expect(history).toEqual([])
    })
  })

  describe('deleteHistoryEntry', () => {
    it('should delete specific entry', () => {
      const entry = addHistoryEntry({
        type: 'comparison',
        mode: 'text',
        leftPath: '/delete.txt',
        rightPath: '/delete-copy.txt',
        leftName: 'delete',
        rightName: 'delete-copy',
      })

      deleteHistoryEntry(entry.id)
      const history = getHistory()
      expect(history.find(h => h.id === entry.id)).toBeUndefined()
    })
  })

  describe('getHistoryByType', () => {
    it('should filter by type', () => {
      addHistoryEntry({
        type: 'comparison',
        mode: 'text',
        leftPath: '/comp.txt',
        rightPath: '/comp-copy.txt',
        leftName: 'comp',
        rightName: 'comp-copy',
      })

      addHistoryEntry({
        type: 'sync',
        mode: 'folder',
        leftPath: '/sync-folder',
        rightPath: '/sync-folder-copy',
        leftName: 'sync-folder',
        rightName: 'sync-folder-copy',
      })

      const comparisons = getHistoryByType('comparison')
      const syncs = getHistoryByType('sync')

      expect(comparisons.every(h => h.type === 'comparison')).toBe(true)
      expect(syncs.every(h => h.type === 'sync')).toBe(true)
    })
  })

  describe('searchHistory', () => {
    it('should search by file name', () => {
      addHistoryEntry({
        type: 'comparison',
        mode: 'text',
        leftPath: '/special_file.txt',
        rightPath: '/normal.txt',
        leftName: 'special_file',
        rightName: 'normal',
      })

      const results = searchHistory('special')
      expect(results.length).toBe(1)
      expect(results[0].leftName).toBe('special_file')
    })

    it('should search by notes', () => {
      addHistoryEntry({
        type: 'comparison',
        mode: 'text',
        leftPath: '/a.txt',
        rightPath: '/b.txt',
        leftName: 'a',
        rightName: 'b',
        notes: 'important review',
      })

      const results = searchHistory('important')
      expect(results.length).toBe(1)
    })

    it('should search by tags', () => {
      addHistoryEntry({
        type: 'comparison',
        mode: 'text',
        leftPath: '/a.txt',
        rightPath: '/b.txt',
        leftName: 'a',
        rightName: 'b',
        tags: ['urgent', 'review'],
      })

      const results = searchHistory('urgent')
      expect(results.length).toBe(1)
    })

    it('should be case insensitive', () => {
      addHistoryEntry({
        type: 'comparison',
        mode: 'text',
        leftPath: '/UpperCase.txt',
        rightPath: '/lower.txt',
        leftName: 'UpperCase',
        rightName: 'lower',
      })

      const results = searchHistory('uppercase')
      expect(results.length).toBe(1)
    })
  })

  describe('compareSnapshots', () => {
    it('should compare two snapshots', () => {
      const s1: Snapshot = {
        id: '1',
        timestamp: '2024-01-01T10:00:00',
        name: 'snapshot1',
        leftPath: '/left1',
        rightPath: '/right1',
        leftContent: 'content1',
        rightContent: 'content1',
        session: {} as any,
      }

      const s2: Snapshot = {
        id: '2',
        timestamp: '2024-01-02T14:00:00',
        name: 'snapshot2',
        leftPath: '/left2',
        rightPath: '/right2',
        leftContent: 'content2',
        rightContent: 'content2',
        session: {} as any,
      }

      const comparison = compareSnapshots(s1, s2)
      expect(comparison.snapshot1).toBe(s1)
      expect(comparison.snapshot2).toBe(s2)
      expect(comparison.timestampDiff).toBeDefined()
      expect(comparison.contentDiff?.leftChanged).toBe(true)
      expect(comparison.contentDiff?.rightChanged).toBe(true)
    })

    it('should calculate time difference correctly', () => {
      const s1: Snapshot = {
        id: '1',
        timestamp: '2024-01-01T10:00:00',
        name: 's1',
        leftPath: '/',
        rightPath: '/',
        leftContent: '',
        rightContent: '',
        session: {} as any,
      }

      const s2: Snapshot = {
        id: '2',
        timestamp: '2024-01-03T12:00:00', // 2 days 2 hours later
        name: 's2',
        leftPath: '/',
        rightPath: '/',
        leftContent: '',
        rightContent: '',
        session: {} as any,
      }

      const comparison = compareSnapshots(s1, s2)
      expect(comparison.timestampDiff).toContain('2 days')
      expect(comparison.timestampDiff).toContain('2 hours')
    })

    it('should detect unchanged content', () => {
      const s1: Snapshot = {
        id: '1',
        timestamp: '2024-01-01T10:00:00',
        name: 's1',
        leftPath: '/',
        rightPath: '/',
        leftContent: 'same',
        rightContent: 'same',
        session: {} as any,
      }

      const s2: Snapshot = {
        id: '2',
        timestamp: '2024-01-02T10:00:00',
        name: 's2',
        leftPath: '/',
        rightPath: '/',
        leftContent: 'same',
        rightContent: 'same',
        session: {} as any,
      }

      const comparison = compareSnapshots(s1, s2)
      expect(comparison.contentDiff?.leftChanged).toBe(false)
      expect(comparison.contentDiff?.rightChanged).toBe(false)
    })
  })
})