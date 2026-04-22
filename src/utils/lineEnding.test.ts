import { describe, it, expect } from 'vitest'
import {
  detectLineEnding,
  getLineEndingStats,
  convertLineEnding,
  getLineEndingDisplayName,
  getLineEndingShortName,
  hasMixedLineEndings,
  normalizeLineEndings,
  type LineEnding
} from './lineEnding'

describe('lineEnding utilities', () => {
  describe('detectLineEnding', () => {
    it('should detect LF line endings', () => {
      const content = 'line1\nline2\nline3\n'
      expect(detectLineEnding(content)).toBe('LF')
    })

    it('should detect CRLF line endings', () => {
      const content = 'line1\r\nline2\r\nline3\r\n'
      expect(detectLineEnding(content)).toBe('CRLF')
    })

    it('should detect CR line endings', () => {
      const content = 'line1\rline2\rline3\r'
      expect(detectLineEnding(content)).toBe('CR')
    })

    it('should detect Mixed line endings', () => {
      const content = 'line1\nline2\r\nline3\n'
      expect(detectLineEnding(content)).toBe('Mixed')
    })

    it('should return LF for empty content', () => {
      expect(detectLineEnding('')).toBe('LF')
    })

    it('should return LF for content without line endings', () => {
      expect(detectLineEnding('no line endings')).toBe('LF')
    })
  })

  describe('getLineEndingStats', () => {
    it('should count LF line endings correctly', () => {
      const content = 'line1\nline2\nline3\n'
      const stats = getLineEndingStats(content)
      expect(stats.lf).toBe(3)
      expect(stats.crlf).toBe(0)
      expect(stats.cr).toBe(0)
    })

    it('should count CRLF line endings correctly', () => {
      const content = 'line1\r\nline2\r\nline3\r\n'
      const stats = getLineEndingStats(content)
      expect(stats.lf).toBe(0)
      expect(stats.crlf).toBe(3)
      expect(stats.cr).toBe(0)
    })

    it('should count mixed line endings correctly', () => {
      const content = 'a\nb\r\nc\rd\n'
      const stats = getLineEndingStats(content)
      expect(stats.lf).toBe(2)
      expect(stats.crlf).toBe(1)
      expect(stats.cr).toBe(1)
    })

    it('should calculate percentages correctly', () => {
      const content = 'a\nb\nc\r\n' // 2 LF, 1 CRLF = 3 total, 66.67% LF, 33.33% CRLF
      const stats = getLineEndingStats(content)
      expect(stats.percentage.lf).toBeCloseTo(66.67, 1)
      expect(stats.percentage.crlf).toBeCloseTo(33.33, 1)
    })

    it('should return detected type', () => {
      const content = 'line1\nline2\n'
      const stats = getLineEndingStats(content)
      expect(stats.detected).toBe('LF')
    })
  })

  describe('convertLineEnding', () => {
    it('should convert CRLF to LF', () => {
      const content = 'line1\r\nline2\r\n'
      const result = convertLineEnding(content, 'LF')
      expect(result).toBe('line1\nline2\n')
    })

    it('should convert LF to CRLF', () => {
      const content = 'line1\nline2\n'
      const result = convertLineEnding(content, 'CRLF')
      expect(result).toBe('line1\r\nline2\r\n')
    })

    it('should convert CRLF to CR', () => {
      const content = 'line1\r\nline2\r\n'
      const result = convertLineEnding(content, 'CR')
      expect(result).toBe('line1\rline2\r')
    })

    it('should convert mixed to LF', () => {
      const content = 'a\nb\r\nc\r'
      const result = convertLineEnding(content, 'LF')
      expect(result).toBe('a\nb\nc\n')
    })

    it('should handle empty content', () => {
      expect(convertLineEnding('', 'LF')).toBe('')
      expect(convertLineEnding('', 'CRLF')).toBe('')
    })

    it('should handle content without line endings', () => {
      expect(convertLineEnding('no endings', 'CRLF')).toBe('no endings')
    })

    it('should handle Mixed target (defaults to LF)', () => {
      const content = 'a\nb\r\n'
      const result = convertLineEnding(content, 'Mixed')
      expect(result).toBe('a\nb\n')
    })
  })

  describe('getLineEndingDisplayName', () => {
    it('should return full display names', () => {
      expect(getLineEndingDisplayName('LF')).toBe('LF (Unix/Linux/Mac)')
      expect(getLineEndingDisplayName('CRLF')).toBe('CRLF (Windows)')
      expect(getLineEndingDisplayName('CR')).toBe('CR (Classic Mac)')
      expect(getLineEndingDisplayName('Mixed')).toBe('Mixed')
    })
  })

  describe('getLineEndingShortName', () => {
    it('should return short names', () => {
      expect(getLineEndingShortName('LF')).toBe('LF')
      expect(getLineEndingShortName('CRLF')).toBe('CRLF')
      expect(getLineEndingShortName('CR')).toBe('CR')
      expect(getLineEndingShortName('Mixed')).toBe('Mixed')
    })
  })

  describe('hasMixedLineEndings', () => {
    it('should return true for mixed content', () => {
      expect(hasMixedLineEndings('a\nb\r\n')).toBe(true)
      expect(hasMixedLineEndings('a\nb\rc\r\n')).toBe(true)
    })

    it('should return false for uniform content', () => {
      expect(hasMixedLineEndings('a\nb\n')).toBe(false)
      expect(hasMixedLineEndings('a\r\nb\r\n')).toBe(false)
      expect(hasMixedLineEndings('a\rb\r')).toBe(false)
    })

    it('should return false for empty content', () => {
      expect(hasMixedLineEndings('')).toBe(false)
    })
  })

  describe('normalizeLineEndings', () => {
    it('should normalize mixed to LF', () => {
      const content = 'a\nb\r\nc\r'
      const result = normalizeLineEndings(content)
      expect(result).toBe('a\nb\nc\n')
    })

    it('should keep uniform LF content unchanged', () => {
      expect(normalizeLineEndings('a\nb\n')).toBe('a\nb\n')
    })

    it('should keep uniform CRLF content unchanged', () => {
      expect(normalizeLineEndings('a\r\nb\r\n')).toBe('a\r\nb\r\n')
    })
  })
})