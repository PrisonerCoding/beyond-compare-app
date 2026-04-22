import { describe, it, expect } from 'vitest'
import {
  computeCharDiff,
  computeLineCharDiff,
  computeAllLineCharDiffs,
  getCharDiffSummary,
  type CharDiff
} from './charDiff'

describe('charDiff utilities', () => {
  describe('computeCharDiff', () => {
    it('should compute character diff for identical strings', () => {
      const diffs = computeCharDiff('hello', 'hello')
      expect(diffs.length).toBe(1)
      expect(diffs[0].type).toBe('equal')
      expect(diffs[0].text).toBe('hello')
    })

    it('should compute character diff for inserted text', () => {
      const diffs = computeCharDiff('', 'hello')
      expect(diffs.length).toBe(1)
      expect(diffs[0].type).toBe('insert')
      expect(diffs[0].text).toBe('hello')
    })

    it('should compute character diff for deleted text', () => {
      const diffs = computeCharDiff('hello', '')
      expect(diffs.length).toBe(1)
      expect(diffs[0].type).toBe('delete')
      expect(diffs[0].text).toBe('hello')
    })

    it('should compute character diff for modified text', () => {
      const diffs = computeCharDiff('abc', 'xyz')
      expect(diffs.some(d => d.type === 'delete')).toBe(true)
      expect(diffs.some(d => d.type === 'insert')).toBe(true)
    })

    it('should compute character diff with partial match', () => {
      const diffs = computeCharDiff('hello world', 'hello there')
      // 'hello ' should be equal
      expect(diffs.some(d => d.type === 'equal' && d.text === 'hello ')).toBe(true)
      // 'world' should be deleted
      expect(diffs.some(d => d.type === 'delete' && d.text.includes('world'))).toBe(true)
      // 'there' should be inserted
      expect(diffs.some(d => d.type === 'insert' && d.text.includes('there'))).toBe(true)
    })
  })

  describe('computeLineCharDiff', () => {
    it('should compute diff for a specific line', () => {
      const left = 'line1\nline2\nline3'
      const right = 'line1\nmodified\nline3'
      const result = computeLineCharDiff(left, right, 2)

      expect(result).not.toBe(null)
      expect(result?.lineNumber).toBe(2)
      expect(result?.diffs.some(d => d.type !== 'equal')).toBe(true)
    })

    it('should return null for invalid line number', () => {
      const left = 'line1\nline2'
      const right = 'line1\nline2'
      expect(computeLineCharDiff(left, right, 0)).toBe(null)
      expect(computeLineCharDiff(left, right, 10)).toBe(null)
    })

    it('should return equal diff for identical lines', () => {
      const left = 'line1\nsame line\nline3'
      const right = 'line1\nsame line\nline3'
      const result = computeLineCharDiff(left, right, 2)

      expect(result?.diffs.length).toBe(1)
      expect(result?.diffs[0].type).toBe('equal')
      expect(result?.diffs[0].text).toBe('same line')
    })
  })

  describe('computeAllLineCharDiffs', () => {
    it('should compute diffs for all modified lines', () => {
      const left = 'line1\nline2\nline3\nline4'
      const right = 'line1\nmodified2\nmodified3\nline4'
      const results = computeAllLineCharDiffs(left, right)

      expect(results.length).toBe(2) // Lines 2 and 3 are modified
      expect(results.every(r => r.diffs.some(d => d.type !== 'equal'))).toBe(true)
    })

    it('should return empty for identical content', () => {
      const content = 'line1\nline2\nline3'
      const results = computeAllLineCharDiffs(content, content)
      expect(results.length).toBe(0)
    })

    it('should handle different number of lines', () => {
      const left = 'line1\nline2'
      const right = 'line1\nline2\nline3'
      const results = computeAllLineCharDiffs(left, right)

      // Line 3 is new (treated as modification)
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('getCharDiffSummary', () => {
    it('should summarize character diffs', () => {
      const diffs: CharDiff[] = [
        { type: 'equal', text: 'hello ' },
        { type: 'delete', text: 'world' },
        { type: 'insert', text: 'there' },
      ]

      const summary = getCharDiffSummary(diffs)
      expect(summary.unchangedChars).toBe(6) // 'hello '
      expect(summary.deletedChars).toBe(5) // 'world'
      expect(summary.insertedChars).toBe(5) // 'there'
    })

    it('should handle all equal', () => {
      const diffs: CharDiff[] = [{ type: 'equal', text: 'hello world' }]
      const summary = getCharDiffSummary(diffs)
      expect(summary.unchangedChars).toBe(11)
      expect(summary.deletedChars).toBe(0)
      expect(summary.insertedChars).toBe(0)
    })

    it('should handle empty diffs', () => {
      const summary = getCharDiffSummary([])
      expect(summary.unchangedChars).toBe(0)
      expect(summary.deletedChars).toBe(0)
      expect(summary.insertedChars).toBe(0)
    })
  })
})