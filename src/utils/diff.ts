import DiffMatchPatch from 'diff-match-patch'
import type { DiffLine } from '../types'

const dmp = new DiffMatchPatch()

export function computeDiff(left: string, right: string): DiffLine[] {
  const diffs = dmp.diff_main(left, right)
  dmp.diff_cleanupSemantic(diffs)

  const lines: DiffLine[] = []

  let leftLineNum = 0
  let rightLineNum = 0

  for (const [op, text] of diffs) {
    const textLines = text.split('\n').filter(l => l.length > 0 || text.endsWith('\n'))

    for (const line of textLines) {
      if (op === 0) {
        lines.push({
          type: 'equal',
          leftContent: line,
          rightContent: line,
          lineNumberLeft: ++leftLineNum,
          lineNumberRight: ++rightLineNum,
        })
      } else if (op === -1) {
        lines.push({
          type: 'removed',
          leftContent: line,
          lineNumberLeft: ++leftLineNum,
        })
      } else if (op === 1) {
        lines.push({
          type: 'added',
          rightContent: line,
          lineNumberRight: ++rightLineNum,
        })
      }
    }
  }

  return mergeModifiedLines(lines)
}

function mergeModifiedLines(lines: DiffLine[]): DiffLine[] {
  const merged: DiffLine[] = []
  let i = 0

  while (i < lines.length) {
    const current = lines[i]

    if (current.type === 'removed' && i + 1 < lines.length && lines[i + 1].type === 'added') {
      merged.push({
        type: 'modified',
        leftContent: current.leftContent,
        rightContent: lines[i + 1].rightContent,
        lineNumberLeft: current.lineNumberLeft,
        lineNumberRight: lines[i + 1].lineNumberRight,
      })
      i += 2
    } else {
      merged.push(current)
      i++
    }
  }

  return merged
}

export function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''

  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    md: 'markdown',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    sh: 'shell',
    bash: 'shell',
    vue: 'vue',
    svelte: 'svelte',
  }

  return languageMap[ext] || 'plaintext'
}

export interface DiffStats {
  added: number
  removed: number
  modified: number
  equal: number
}

export function computeDiffStats(left: string, right: string): DiffStats {
  const lines = computeDiff(left, right)

  const stats: DiffStats = {
    added: 0,
    removed: 0,
    modified: 0,
    equal: 0,
  }

  for (const line of lines) {
    switch (line.type) {
      case 'added':
        stats.added++
        break
      case 'removed':
        stats.removed++
        break
      case 'modified':
        stats.modified++
        break
      case 'equal':
        stats.equal++
        break
    }
  }

  return stats
}