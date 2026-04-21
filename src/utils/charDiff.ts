import DiffMatchPatch from 'diff-match-patch'

const dmp = new DiffMatchPatch()

export interface CharDiff {
  type: 'equal' | 'insert' | 'delete'
  text: string
}

export interface LineCharDiff {
  lineNumber: number
  diffs: CharDiff[]
}

/**
 * Compute character-level differences between two strings
 */
export function computeCharDiff(text1: string, text2: string): CharDiff[] {
  const diffs = dmp.diff_main(text1, text2)
  dmp.diff_cleanupSemantic(diffs) // Improve diff readability

  return diffs.map(([type, text]: [number, string]) => ({
    type: type === 0 ? 'equal' : type === 1 ? 'insert' : 'delete',
    text,
  }))
}

/**
 * Compute character-level differences for a specific line
 */
export function computeLineCharDiff(
  leftContent: string,
  rightContent: string,
  lineNumber: number
): LineCharDiff | null {
  const leftLines = leftContent.split('\n')
  const rightLines = rightContent.split('\n')

  if (lineNumber < 1 || lineNumber > leftLines.length || lineNumber > rightLines.length) {
    return null
  }

  const leftLine = leftLines[lineNumber - 1]
  const rightLine = rightLines[lineNumber - 1]

  if (leftLine === rightLine) {
    return {
      lineNumber,
      diffs: [{ type: 'equal', text: leftLine }],
    }
  }

  const diffs = computeCharDiff(leftLine, rightLine)

  return {
    lineNumber,
    diffs,
  }
}

/**
 * Compute all character-level differences for modified lines
 */
export function computeAllLineCharDiffs(
  leftContent: string,
  rightContent: string
): LineCharDiff[] {
  const leftLines = leftContent.split('\n')
  const rightLines = rightContent.split('\n')
  const maxLines = Math.max(leftLines.length, rightLines.length)

  const result: LineCharDiff[] = []

  for (let i = 1; i <= maxLines; i++) {
    const leftLine = leftLines[i - 1] ?? ''
    const rightLine = rightLines[i - 1] ?? ''

    if (leftLine !== rightLine) {
      const diffs = computeCharDiff(leftLine, rightLine)
      result.push({
        lineNumber: i,
        diffs,
      })
    }
  }

  return result
}

/**
 * Get inline diff decorations for Monaco Editor
 */
export function getInlineDiffDecorations(
  diffs: CharDiff[],
  startColumn: number
): Array<{
  startColumn: number
  endColumn: number
  className: string
  inlineClassName: string
}> {
  const decorations: Array<{
    startColumn: number
    endColumn: number
    className: string
    inlineClassName: string
  }> = []

  let currentColumn = startColumn

  for (const diff of diffs) {
    const length = diff.text.length

    if (diff.type === 'insert') {
      decorations.push({
        startColumn: currentColumn,
        endColumn: currentColumn + length,
        className: 'char-diff-insert-bg',
        inlineClassName: 'char-diff-insert',
      })
    } else if (diff.type === 'delete') {
      decorations.push({
        startColumn: currentColumn,
        endColumn: currentColumn + length,
        className: 'char-diff-delete-bg',
        inlineClassName: 'char-diff-delete',
      })
    }

    currentColumn += length
  }

  return decorations
}

/**
 * Get diff summary text
 */
export function getCharDiffSummary(diffs: CharDiff[]): {
  insertedChars: number
  deletedChars: number
  unchangedChars: number
} {
  let insertedChars = 0
  let deletedChars = 0
  let unchangedChars = 0

  for (const diff of diffs) {
    switch (diff.type) {
      case 'insert':
        insertedChars += diff.text.length
        break
      case 'delete':
        deletedChars += diff.text.length
        break
      case 'equal':
        unchangedChars += diff.text.length
        break
    }
  }

  return { insertedChars, deletedChars, unchangedChars }
}