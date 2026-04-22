import { describe, it, expect } from 'vitest'
import {
  computeDiff,
  getLanguageFromPath,
  computeDiffStats
} from './diff'

describe('diff utilities', () => {
  describe('computeDiff', () => {
    it('should compute diff for identical content', () => {
      const result = computeDiff('hello world', 'hello world')
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].type).toBe('equal')
    })

    it('should compute diff for added content', () => {
      const result = computeDiff('hello', 'hello world')
      expect(result.some(line => line.type === 'added')).toBe(true)
    })

    it('should compute diff for removed content', () => {
      const result = computeDiff('hello world', 'hello')
      expect(result.some(line => line.type === 'removed')).toBe(true)
    })

    it('should compute diff for modified content', () => {
      const result = computeDiff('hello', 'world')
      expect(result.some(line => line.type === 'modified')).toBe(true)
    })

    it('should handle multiline content', () => {
      const left = 'line1\nline2\nline3'
      const right = 'line1\nline2 modified\nline3'
      const result = computeDiff(left, right)
      // The diff algorithm may produce removed + added instead of modified
      expect(result.some(line => line.type === 'modified' || line.type === 'removed' || line.type === 'added')).toBe(true)
    })
  })

  describe('getLanguageFromPath', () => {
    it('should identify JavaScript files', () => {
      expect(getLanguageFromPath('test.js')).toBe('javascript')
      expect(getLanguageFromPath('test.jsx')).toBe('javascript')
    })

    it('should identify TypeScript files', () => {
      expect(getLanguageFromPath('test.ts')).toBe('typescript')
      expect(getLanguageFromPath('test.tsx')).toBe('typescript')
    })

    it('should identify JSON files', () => {
      expect(getLanguageFromPath('package.json')).toBe('json')
    })

    it('should identify Python files', () => {
      expect(getLanguageFromPath('script.py')).toBe('python')
    })

    it('should identify Go files', () => {
      expect(getLanguageFromPath('main.go')).toBe('go')
    })

    it('should identify Rust files', () => {
      expect(getLanguageFromPath('main.rs')).toBe('rust')
    })

    it('should return plaintext for unknown extensions', () => {
      expect(getLanguageFromPath('unknown.xyz')).toBe('plaintext')
      expect(getLanguageFromPath('noextension')).toBe('plaintext')
    })

    it('should handle paths with multiple dots', () => {
      expect(getLanguageFromPath('src/components/test.tsx')).toBe('typescript')
    })
  })

  describe('computeDiffStats', () => {
    it('should compute stats for identical content', () => {
      const stats = computeDiffStats('hello', 'hello')
      expect(stats.equal).toBe(1)
      expect(stats.added).toBe(0)
      expect(stats.removed).toBe(0)
      expect(stats.modified).toBe(0)
    })

    it('should compute stats for added content', () => {
      const stats = computeDiffStats('', 'hello')
      expect(stats.added).toBe(1)
    })

    it('should compute stats for removed content', () => {
      const stats = computeDiffStats('hello', '')
      expect(stats.removed).toBe(1)
    })

    it('should compute stats for modified content', () => {
      const stats = computeDiffStats('hello', 'world')
      expect(stats.modified).toBe(1)
    })
  })
})