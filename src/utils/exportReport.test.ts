import { describe, it, expect } from 'vitest'
import {
  generateDiffReport,
  type DiffReportOptions
} from './exportReport'
import type { FileContent } from '../types'

describe('exportReport utilities', () => {
  describe('generateDiffReport', () => {
    const createMockFile = (path: string, content: string, language?: string): FileContent => ({
      path,
      content,
      language,
      encoding: 'UTF-8',
    })

    it('should generate HTML report', () => {
      const leftFile = createMockFile('/path/left.txt', 'line1\nline2')
      const rightFile = createMockFile('/path/right.txt', 'line1\nmodified')
      const diffStats = { added: 1, removed: 0, modified: 1 }

      const options: DiffReportOptions = {
        leftFile,
        rightFile,
        diffStats,
      }

      const report = generateDiffReport(options)
      expect(report).toContain('<!DOCTYPE html>')
      expect(report).toContain('<html')
      expect(report).toContain('Diff Comparison Report')
      expect(report).toContain('left.txt')
      expect(report).toContain('right.txt')
    })

    it('should include diff stats in report', () => {
      const leftFile = createMockFile('/test/a.txt', 'original')
      const rightFile = createMockFile('/test/b.txt', 'modified')
      const diffStats = { added: 5, removed: 2, modified: 3 }

      const report = generateDiffReport({ leftFile, rightFile, diffStats })
      expect(report).toContain('+5 added')
      expect(report).toContain('-2 removed')
      expect(report).toContain('~3 modified')
    })

    it('should include language in report', () => {
      const leftFile = createMockFile('/test/code.js', 'const x = 1', 'javascript')
      const rightFile = createMockFile('/test/code.js', 'const x = 2', 'javascript')
      const diffStats = { added: 0, removed: 0, modified: 1 }

      const report = generateDiffReport({ leftFile, rightFile, diffStats })
      expect(report).toContain('javascript')
    })

    it('should handle empty files', () => {
      const leftFile = createMockFile('/test/empty.txt', '')
      const rightFile = createMockFile('/test/empty.txt', '')
      const diffStats = { added: 0, removed: 0, modified: 0 }

      const report = generateDiffReport({ leftFile, rightFile, diffStats })
      expect(report).toContain('Diff Comparison Report')
      expect(report).toContain('+0 added')
    })

    it('should handle files with special characters', () => {
      const leftFile = createMockFile('/test/special.txt', '<tag> & "quoted"')
      const rightFile = createMockFile('/test/special.txt', 'normal')
      const diffStats = { added: 1, removed: 1, modified: 0 }

      const report = generateDiffReport({ leftFile, rightFile, diffStats })
      // HTML entities should be escaped
      expect(report).toContain('&lt;tag&gt;')
      expect(report).toContain('&amp;')
    })

    it('should include CSS styles', () => {
      const leftFile = createMockFile('/test/a.txt', 'test')
      const rightFile = createMockFile('/test/b.txt', 'test')
      const diffStats = { added: 0, removed: 0, modified: 0 }

      const report = generateDiffReport({ leftFile, rightFile, diffStats })
      expect(report).toContain('<style>')
      expect(report).toContain('--bg-primary')
      expect(report).toContain('--diff-added-bg')
    })

    it('should extract file names from paths', () => {
      const leftFile = createMockFile('/long/path/to/deep/left-file.txt', 'content')
      const rightFile = createMockFile('C:\\Users\\test\\right-file.txt', 'content')
      const diffStats = { added: 0, removed: 0, modified: 0 }

      const report = generateDiffReport({ leftFile, rightFile, diffStats })
      expect(report).toContain('left-file.txt')
      expect(report).toContain('right-file.txt')
    })
  })
})