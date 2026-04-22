import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createDefaultSession,
  getSessionSummary,
  getRecentSessions,
  addRecentSession,
  clearRecentSessions,
  type SessionData,
  type RecentSession
} from './session'

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

describe('session utilities', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  describe('createDefaultSession', () => {
    it('should create a default session', () => {
      const session = createDefaultSession()
      expect(session.version).toBe('1.0')
      expect(session.mode).toBe('text')
      expect(session.left).toBeNull()
      expect(session.right).toBeNull()
      expect(session.created).toBeDefined()
      expect(session.modified).toBeDefined()
    })

    it('should have valid timestamps', () => {
      const session = createDefaultSession()
      const created = new Date(session.created)
      const modified = new Date(session.modified)
      expect(created.getTime()).toBeGreaterThan(0)
      expect(modified.getTime()).toBeGreaterThan(0)
    })
  })

  describe('getSessionSummary', () => {
    it('should generate summary for basic session', () => {
      const session: SessionData = {
        version: '1.0',
        created: '2024-01-01',
        modified: '2024-01-01',
        mode: 'text',
        left: null,
        right: null,
      }

      const summary = getSessionSummary(session)
      expect(summary).toContain('Mode: text')
    })

    it('should include file names in summary', () => {
      const session: SessionData = {
        version: '1.0',
        created: '2024-01-01',
        modified: '2024-01-01',
        mode: 'text',
        left: { type: 'file', path: '/path/to/left.txt' },
        right: { type: 'file', path: '/path/to/right.txt' },
      }

      const summary = getSessionSummary(session)
      expect(summary).toContain('Left: left.txt')
      expect(summary).toContain('Right: right.txt')
    })

    it('should include filters in summary', () => {
      const session: SessionData = {
        version: '1.0',
        created: '2024-01-01',
        modified: '2024-01-01',
        mode: 'folder',
        left: null,
        right: null,
        filters: ['*.txt', '*.md'],
      }

      const summary = getSessionSummary(session)
      expect(summary).toContain('Filters: 2')
    })

    it('should include notes in summary', () => {
      const session: SessionData = {
        version: '1.0',
        created: '2024-01-01',
        modified: '2024-01-01',
        mode: 'text',
        left: null,
        right: null,
        notes: 'Important comparison',
      }

      const summary = getSessionSummary(session)
      expect(summary).toContain('Notes:')
      expect(summary).toContain('Important comparison')
    })

    it('should handle Windows paths', () => {
      const session: SessionData = {
        version: '1.0',
        created: '2024-01-01',
        modified: '2024-01-01',
        mode: 'text',
        left: { type: 'file', path: 'C:\\Users\\test\\file.txt' },
        right: { type: 'file', path: 'D:\\backup\\file.txt' },
      }

      const summary = getSessionSummary(session)
      expect(summary).toContain('file.txt')
    })
  })

  describe('getRecentSessions', () => {
    it('should return empty array when no recent sessions', () => {
      const recent = getRecentSessions()
      expect(recent).toEqual([])
    })

    it('should return stored recent sessions', () => {
      const mockRecent: RecentSession[] = [
        { path: '/session1.bcsession', name: 'session1', modified: '2024-01-01', summary: 'test' },
      ]
      localStorageMock.setItem('bc_recent_sessions', JSON.stringify(mockRecent))
      const recent = getRecentSessions()
      expect(recent.length).toBe(1)
      expect(recent[0].path).toBe('/session1.bcsession')
    })

    it('should handle invalid JSON', () => {
      localStorageMock.setItem('bc_recent_sessions', 'invalid json')
      const recent = getRecentSessions()
      expect(recent).toEqual([])
    })
  })

  describe('addRecentSession', () => {
    it('should add session to recent list', () => {
      const session: SessionData = {
        version: '1.0',
        created: '2024-01-01',
        modified: '2024-01-01',
        mode: 'text',
        left: { type: 'file', path: '/left.txt' },
        right: { type: 'file', path: '/right.txt' },
      }

      addRecentSession(session, '/test/session.bcsession')
      const recent = getRecentSessions()
      expect(recent.length).toBe(1)
      expect(recent[0].path).toBe('/test/session.bcsession')
    })

    it('should extract file name from path', () => {
      const session = createDefaultSession()
      addRecentSession(session, '/path/to/my-session.bcsession')
      const recent = getRecentSessions()
      expect(recent[0].name).toBe('my-session.bcsession')
    })

    it('should remove duplicate paths', () => {
      const session = createDefaultSession()
      addRecentSession(session, '/duplicate.bcsession')
      addRecentSession(session, '/duplicate.bcsession')
      const recent = getRecentSessions()
      expect(recent.length).toBe(1)
    })

    it('should limit to MAX_RECENT_SESSIONS (10)', () => {
      const session = createDefaultSession()
      for (let i = 0; i < 15; i++) {
        addRecentSession(session, `/session${i}.bcsession`)
      }
      const recent = getRecentSessions()
      expect(recent.length).toBeLessThanOrEqual(10)
    })

    it('should add newest session to front', () => {
      const session1 = createDefaultSession()
      const session2 = createDefaultSession()

      addRecentSession(session1, '/first.bcsession')
      addRecentSession(session2, '/second.bcsession')

      const recent = getRecentSessions()
      expect(recent[0].path).toBe('/second.bcsession')
      expect(recent[1].path).toBe('/first.bcsession')
    })
  })

  describe('clearRecentSessions', () => {
    it('should clear all recent sessions', () => {
      const session = createDefaultSession()
      addRecentSession(session, '/test.bcsession')
      clearRecentSessions()
      const recent = getRecentSessions()
      expect(recent).toEqual([])
    })
  })

  describe('SessionData type', () => {
    it('should support all modes', () => {
      const modes = ['text', 'folder', 'merge', 'binary', 'image'] as const
      modes.forEach(mode => {
        const session: SessionData = {
          version: '1.0',
          created: '2024-01-01',
          modified: '2024-01-01',
          mode,
          left: null,
          right: null,
        }
        expect(session.mode).toBe(mode)
      })
    })

    it('should support file and folder types', () => {
      const fileSession: SessionData = {
        version: '1.0',
        created: '2024-01-01',
        modified: '2024-01-01',
        mode: 'text',
        left: { type: 'file', path: '/file.txt' },
        right: null,
      }

      const folderSession: SessionData = {
        version: '1.0',
        created: '2024-01-01',
        modified: '2024-01-01',
        mode: 'folder',
        left: { type: 'folder', path: '/folder' },
        right: null,
      }

      expect(fileSession.left?.type).toBe('file')
      expect(folderSession.left?.type).toBe('folder')
    })
  })
})