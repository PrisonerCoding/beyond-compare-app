import { describe, it, expect } from 'vitest'
import {
  diff3,
  generateMergeResult,
  getConflictSummary,
  parseGitConflicts,
  generateConflictMarkers,
  autoResolveNonConflicts,
  type Diff3Region
} from './diff3'

describe('diff3 utilities', () => {
  describe('diff3', () => {
    it('should detect unchanged regions when all are same', () => {
      const base = ['line1', 'line2', 'line3']
      const left = ['line1', 'line2', 'line3']
      const right = ['line1', 'line2', 'line3']

      const result = diff3(base, left, right)
      expect(result.conflicts.length).toBe(0)
      expect(result.regions.every(r => r.type === 'unchanged')).toBe(true)
    })

    it('should detect left-only changes', () => {
      const base = ['line1', 'line2', 'line3']
      const left = ['line1', 'modified', 'line3']
      const right = ['line1', 'line2', 'line3']

      const result = diff3(base, left, right)
      expect(result.conflicts.length).toBe(0)
      expect(result.autoResolvable.some(r => r.type === 'left-only')).toBe(true)
    })

    it('should detect right-only changes', () => {
      const base = ['line1', 'line2', 'line3']
      const left = ['line1', 'line2', 'line3']
      const right = ['line1', 'modified', 'line3']

      const result = diff3(base, left, right)
      expect(result.conflicts.length).toBe(0)
      expect(result.autoResolvable.some(r => r.type === 'right-only')).toBe(true)
    })

    it('should detect both-same when both made identical changes', () => {
      const base = ['line1', 'line2', 'line3']
      const left = ['line1', 'modified', 'line3']
      const right = ['line1', 'modified', 'line3']

      const result = diff3(base, left, right)
      expect(result.conflicts.length).toBe(0)
      expect(result.autoResolvable.some(r => r.type === 'both-same')).toBe(true)
    })

    it('should detect conflicts when both made different changes', () => {
      const base = ['line1', 'line2', 'line3']
      const left = ['line1', 'left-mod', 'line3']
      const right = ['line1', 'right-mod', 'line3']

      const result = diff3(base, left, right)
      expect(result.conflicts.length).toBeGreaterThan(0)
      expect(result.conflicts[0].type).toBe('conflict')
    })

    it('should handle multiple changes', () => {
      const base = ['a', 'b', 'c', 'd', 'e']
      const left = ['a', 'b-mod', 'c', 'd-mod', 'e']
      const right = ['a', 'b', 'c-mod', 'd', 'e-mod']

      const result = diff3(base, left, right)
      // Multiple non-conflicting changes
      expect(result.autoResolvable.length).toBeGreaterThan(0)
    })
  })

  describe('getConflictSummary', () => {
    it('should return correct summary', () => {
      const base = ['line1', 'line2', 'line3']
      const left = ['line1', 'left-mod', 'line3']
      const right = ['line1', 'right-mod', 'line3']

      const result = diff3(base, left, right)
      const summary = getConflictSummary(result)

      expect(summary.total).toBe(result.regions.length)
      expect(summary.conflicts).toBe(result.conflicts.length)
      expect(summary.autoResolvable).toBe(result.autoResolvable.length)
    })
  })

  describe('generateMergeResult', () => {
    it('should generate merged result with resolutions', () => {
      const base = ['line1', 'line2', 'line3']
      const left = ['line1', 'left-mod', 'line3']
      const right = ['line1', 'right-mod', 'line3']

      const result = diff3(base, left, right)
      const resolutions = new Map<number, 'base' | 'left' | 'right'>()

      // Resolve conflict by choosing left
      if (result.conflicts.length > 0) {
        const conflictIndex = result.regions.findIndex(r => r.type === 'conflict')
        resolutions.set(conflictIndex, 'left')
      }

      const merged = generateMergeResult(result.regions, resolutions)
      expect(merged).toContain('line1')
      expect(merged).toContain('left-mod')
      expect(merged).toContain('line3')
    })

    it('should include conflict markers for unresolved conflicts', () => {
      const base = ['line1', 'line2', 'line3']
      const left = ['line1', 'left-mod', 'line3']
      const right = ['line1', 'right-mod', 'line3']

      const result = diff3(base, left, right)
      const merged = generateMergeResult(result.regions, new Map())

      expect(merged.some(line => line.includes('<<<<<<<'))).toBe(true)
      expect(merged.some(line => line.includes('>>>>>>>'))).toBe(true)
    })
  })

  describe('parseGitConflicts', () => {
    it('should parse Git conflict markers', () => {
      const content = [
        'line1',
        '<<<<<<< LEFT',
        'left content',
        '||||||| BASE',
        'base content',
        '=======',
        'right content',
        '>>>>>>> RIGHT',
        'line2'
      ]

      const parsed = parseGitConflicts(content)
      expect(parsed.hasConflicts).toBe(true)
      expect(parsed.conflicts.length).toBe(1)
      expect(parsed.conflicts[0].leftContent).toEqual(['left content'])
      expect(parsed.conflicts[0].rightContent).toEqual(['right content'])
    })

    it('should handle content without conflicts', () => {
      const content = ['line1', 'line2', 'line3']
      const parsed = parseGitConflicts(content)
      expect(parsed.hasConflicts).toBe(false)
      expect(parsed.conflicts.length).toBe(0)
    })
  })

  describe('generateConflictMarkers', () => {
    it('should generate proper conflict markers', () => {
      const markers = generateConflictMarkers({
        leftContent: ['left'],
        baseContent: ['base'],
        rightContent: ['right'],
        leftBranch: 'feature',
        rightBranch: 'main'
      })

      expect(markers[0]).toBe('<<<<<<< feature')
      expect(markers).toContain('left')
      expect(markers).toContain('||||||| BASE')
      expect(markers).toContain('base')
      expect(markers).toContain('=======')
      expect(markers).toContain('right')
      expect(markers[markers.length - 1]).toBe('>>>>>>> main')
    })
  })

  describe('autoResolveNonConflicts', () => {
    it('should auto-resolve non-conflicting regions', () => {
      const regions: Diff3Region[] = [
        { type: 'unchanged', baseContent: ['a'], leftContent: ['a'], rightContent: ['a'], baseStart: 0, baseEnd: 0, leftStart: 0, leftEnd: 0, rightStart: 0, rightEnd: 0 },
        { type: 'left-only', baseContent: ['b'], leftContent: ['b-mod'], rightContent: ['b'], baseStart: 1, baseEnd: 1, leftStart: 1, leftEnd: 1, rightStart: 1, rightEnd: 1 },
        { type: 'right-only', baseContent: ['c'], leftContent: ['c'], rightContent: ['c-mod'], baseStart: 2, baseEnd: 2, leftStart: 2, leftEnd: 2, rightStart: 2, rightEnd: 2 },
      ]

      const resolutions = autoResolveNonConflicts(regions)
      expect(resolutions.get(1)).toBe('left')
      expect(resolutions.get(2)).toBe('right')
    })
  })
})