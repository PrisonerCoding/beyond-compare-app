/**
 * diff3 algorithm for three-way merge
 *
 * Compares Base, Left, and Right versions to detect:
 * - Conflicts: Both Left and Right modified the same region differently
 * - Auto-resolvable: Only one side modified, or both modified the same way
 */

export interface Diff3Region {
  type: 'conflict' | 'left-only' | 'right-only' | 'both-same' | 'unchanged'
  baseStart: number
  baseEnd: number
  leftStart: number
  leftEnd: number
  rightStart: number
  rightEnd: number
  baseContent: string[]
  leftContent: string[]
  rightContent: string[]
}

export interface Diff3Result {
  regions: Diff3Region[]
  conflicts: Diff3Region[]
  autoResolvable: Diff3Region[]
}

/**
 * LCS (Longest Common Subsequence) algorithm for diff
 */
function lcs<T>(a: T[], b: T[]): T[] {
  const m = a.length
  const n = b.length

  // Create DP table
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find LCS
  const result: T[] = []
  let i = m
  let j = n

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return result
}

/**
 * Compute diff between two arrays using LCS
 */
interface DiffBlock {
  type: 'equal' | 'delete' | 'insert'
  oldStart: number
  oldEnd: number
  newStart: number
  newEnd: number
  oldContent: string[]
  newContent: string[]
}

function computeDiff(base: string[], modified: string[]): DiffBlock[] {
  const common = lcs(base, modified)
  const blocks: DiffBlock[] = []

  let baseIdx = 0
  let modIdx = 0
  let commonIdx = 0

  while (baseIdx < base.length || modIdx < modified.length) {
    // Check if we're at a common element
    if (commonIdx < common.length && baseIdx < base.length && modIdx < modified.length &&
        base[baseIdx] === common[commonIdx] && modified[modIdx] === common[commonIdx]) {
      // Find run of equal elements
      const oldStart = baseIdx
      const newStart = modIdx

      while (commonIdx < common.length && baseIdx < base.length && modIdx < modified.length &&
             base[baseIdx] === common[commonIdx] && modified[modIdx] === common[commonIdx]) {
        baseIdx++
        modIdx++
        commonIdx++
      }

      blocks.push({
        type: 'equal',
        oldStart,
        oldEnd: baseIdx - 1,
        newStart,
        newEnd: modIdx - 1,
        oldContent: base.slice(oldStart, baseIdx),
        newContent: modified.slice(newStart, modIdx),
      })
    } else {
      // Find differences
      const oldStart = baseIdx
      const newStart = modIdx

      // Skip elements not in LCS from base (deletions)
      while (baseIdx < base.length && (commonIdx >= common.length || base[baseIdx] !== common[commonIdx])) {
        baseIdx++
      }

      // Skip elements not in LCS from modified (insertions)
      while (modIdx < modified.length && (commonIdx >= common.length || modified[modIdx] !== common[commonIdx])) {
        modIdx++
      }

      if (oldStart < baseIdx || newStart < modIdx) {
        blocks.push({
          type: oldStart < baseIdx && newStart < modIdx ? 'delete' :
                oldStart < baseIdx ? 'delete' : 'insert',
          oldStart,
          oldEnd: baseIdx - 1,
          newStart,
          newEnd: modIdx - 1,
          oldContent: base.slice(oldStart, baseIdx),
          newContent: modified.slice(newStart, modIdx),
        })
      }
    }
  }

  return blocks
}

/**
 * Convert diff blocks to hunk format (consecutive changes grouped)
 */
interface Hunk {
  baseStart: number
  baseEnd: number
  modStart: number
  modEnd: number
  baseContent: string[]
  modContent: string[]
  type: 'unchanged' | 'changed'
}

function diffToHunks(blocks: DiffBlock[]): Hunk[] {
  const hunks: Hunk[] = []

  for (const block of blocks) {
    if (block.type === 'equal') {
      hunks.push({
        baseStart: block.oldStart,
        baseEnd: block.oldEnd,
        modStart: block.newStart,
        modEnd: block.newEnd,
        baseContent: block.oldContent,
        modContent: block.newContent,
        type: 'unchanged',
      })
    } else {
      // Combine consecutive changes
      hunks.push({
        baseStart: block.oldStart,
        baseEnd: block.oldEnd,
        modStart: block.newStart,
        modEnd: block.newEnd,
        baseContent: block.oldContent,
        modContent: block.newContent,
        type: 'changed',
      })
    }
  }

  return hunks
}

/**
 * Perform three-way diff: compare Base with Left and Base with Right
 * Then identify conflicts where both sides modified the same region differently
 */
export function diff3(base: string[], left: string[], right: string[]): Diff3Result {
  // Compute diffs
  const leftDiff = diffToHunks(computeDiff(base, left))
  const rightDiff = diffToHunks(computeDiff(base, right))

  const regions: Diff3Region[] = []
  const conflicts: Diff3Region[] = []
  const autoResolvable: Diff3Region[] = []

  // Find overlapping changes (potential conflicts)
  let basePos = 0

  while (basePos < base.length) {
    // Find left change at this position
    const leftHunk = leftDiff.find(h =>
      h.type === 'changed' && basePos >= h.baseStart && basePos <= Math.max(h.baseStart, h.baseEnd)
    )

    // Find right change at this position
    const rightHunk = rightDiff.find(h =>
      h.type === 'changed' && basePos >= h.baseStart && basePos <= Math.max(h.baseStart, h.baseEnd)
    )

    if (leftHunk && rightHunk) {
      // Both sides changed - check if same change or conflict
      const leftContent = left.slice(leftHunk.modStart, leftHunk.modEnd + 1)
      const rightContent = right.slice(rightHunk.modStart, rightHunk.modEnd + 1)

      if (arraysEqual(leftContent, rightContent)) {
        // Both made same change - auto-resolvable
        const region: Diff3Region = {
          type: 'both-same',
          baseStart: Math.max(leftHunk.baseStart, rightHunk.baseStart),
          baseEnd: Math.max(leftHunk.baseEnd, rightHunk.baseEnd),
          leftStart: leftHunk.modStart,
          leftEnd: leftHunk.modEnd,
          rightStart: rightHunk.modStart,
          rightEnd: rightHunk.modEnd,
          baseContent: base.slice(Math.max(leftHunk.baseStart, rightHunk.baseStart), Math.max(leftHunk.baseEnd, rightHunk.baseEnd) + 1),
          leftContent,
          rightContent,
        }
        regions.push(region)
        autoResolvable.push(region)
        basePos = Math.max(leftHunk.baseEnd, rightHunk.baseEnd) + 1
      } else {
        // Conflict - different changes
        const region: Diff3Region = {
          type: 'conflict',
          baseStart: Math.min(leftHunk.baseStart, rightHunk.baseStart),
          baseEnd: Math.max(leftHunk.baseEnd, rightHunk.baseEnd),
          leftStart: leftHunk.modStart,
          leftEnd: leftHunk.modEnd,
          rightStart: rightHunk.modStart,
          rightEnd: rightHunk.modEnd,
          baseContent: base.slice(Math.min(leftHunk.baseStart, rightHunk.baseStart), Math.max(leftHunk.baseEnd, rightHunk.baseEnd) + 1),
          leftContent,
          rightContent,
        }
        regions.push(region)
        conflicts.push(region)
        basePos = Math.max(leftHunk.baseEnd, rightHunk.baseEnd) + 1
      }
    } else if (leftHunk && !rightHunk) {
      // Only left changed - auto-resolvable (use left)
      const region: Diff3Region = {
        type: 'left-only',
        baseStart: leftHunk.baseStart,
        baseEnd: leftHunk.baseEnd,
        leftStart: leftHunk.modStart,
        leftEnd: leftHunk.modEnd,
        rightStart: leftHunk.baseStart,
        rightEnd: leftHunk.baseEnd,
        baseContent: leftHunk.baseContent,
        leftContent: left.slice(leftHunk.modStart, leftHunk.modEnd + 1),
        rightContent: leftHunk.baseContent,
      }
      regions.push(region)
      autoResolvable.push(region)
      basePos = leftHunk.baseEnd + 1
    } else if (!leftHunk && rightHunk) {
      // Only right changed - auto-resolvable (use right)
      const region: Diff3Region = {
        type: 'right-only',
        baseStart: rightHunk.baseStart,
        baseEnd: rightHunk.baseEnd,
        leftStart: rightHunk.baseStart,
        leftEnd: rightHunk.baseEnd,
        rightStart: rightHunk.modStart,
        rightEnd: rightHunk.modEnd,
        baseContent: rightHunk.baseContent,
        leftContent: rightHunk.baseContent,
        rightContent: right.slice(rightHunk.modStart, rightHunk.modEnd + 1),
      }
      regions.push(region)
      autoResolvable.push(region)
      basePos = rightHunk.baseEnd + 1
    } else {
      // No change - unchanged region
      // Find next change position
      const nextLeftChange = leftDiff.find(h => h.type === 'changed' && h.baseStart > basePos)
      const nextRightChange = rightDiff.find(h => h.type === 'changed' && h.baseStart > basePos)

      const nextChangeStart = Math.min(
        nextLeftChange?.baseStart ?? base.length,
        nextRightChange?.baseStart ?? base.length
      )

      if (basePos < nextChangeStart) {
        const region: Diff3Region = {
          type: 'unchanged',
          baseStart: basePos,
          baseEnd: nextChangeStart - 1,
          leftStart: basePos,
          leftEnd: nextChangeStart - 1,
          rightStart: basePos,
          rightEnd: nextChangeStart - 1,
          baseContent: base.slice(basePos, nextChangeStart),
          leftContent: base.slice(basePos, nextChangeStart),
          rightContent: base.slice(basePos, nextChangeStart),
        }
        regions.push(region)
      }

      basePos = nextChangeStart
    }
  }

  // Sort regions by base start
  regions.sort((a, b) => a.baseStart - b.baseStart)

  return { regions, conflicts, autoResolvable }
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Generate merged result based on resolutions
 */
export function generateMergeResult(
  regions: Diff3Region[],
  resolutions: Map<number, 'base' | 'left' | 'right'>
): string[] {
  const result: string[] = []

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i]
    const resolution = resolutions.get(i)

    if (region.type === 'unchanged') {
      result.push(...region.baseContent)
    } else if (region.type === 'both-same') {
      // Both made same change - use that change
      result.push(...region.leftContent)
    } else if (region.type === 'left-only') {
      // Only left changed - use left
      result.push(...region.leftContent)
    } else if (region.type === 'right-only') {
      // Only right changed - use right
      result.push(...region.rightContent)
    } else if (region.type === 'conflict') {
      // Conflict - use resolution if set
      if (resolution) {
        switch (resolution) {
          case 'base':
            result.push(...region.baseContent)
            break
          case 'left':
            result.push(...region.leftContent)
            break
          case 'right':
            result.push(...region.rightContent)
            break
        }
      } else {
        // Unresolved - add conflict markers
        result.push('<<<<<<< LEFT')
        result.push(...region.leftContent)
        result.push('||||||| BASE')
        result.push(...region.baseContent)
        result.push('=======')
        result.push(...region.rightContent)
        result.push('>>>>>>> RIGHT')
      }
    }
  }

  return result
}

/**
 * Get conflict summary for display
 */
export function getConflictSummary(result: Diff3Result): {
  total: number
  conflicts: number
  autoResolvable: number
  unchanged: number
} {
  return {
    total: result.regions.length,
    conflicts: result.conflicts.length,
    autoResolvable: result.autoResolvable.length,
    unchanged: result.regions.filter(r => r.type === 'unchanged').length,
  }
}