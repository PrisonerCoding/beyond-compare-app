/**
 * Line ending detection and conversion utilities
 */

export type LineEnding = 'LF' | 'CRLF' | 'CR' | 'Mixed'

export interface LineEndingStats {
  lf: number      // Unix/Linux/Mac (modern): \n
  crlf: number    // Windows: \r\n
  cr: number      // Old Mac: \r
  detected: LineEnding
  percentage: {
    lf: number
    crlf: number
    cr: number
  }
}

/**
 * Detect the dominant line ending style in content
 */
export function detectLineEnding(content: string): LineEnding {
  const stats = getLineEndingStats(content)

  if (stats.percentage.crlf > 80) return 'CRLF'
  if (stats.percentage.lf > 80) return 'LF'
  if (stats.percentage.cr > 80) return 'CR'

  // If mixed or unclear
  if (stats.crlf > 0 && stats.lf > 0) return 'Mixed'
  if (stats.crlf > 0) return 'CRLF'
  if (stats.lf > 0) return 'LF'
  if (stats.cr > 0) return 'CR'

  // Default for empty or no line endings
  return 'LF'
}

/**
 * Get detailed statistics about line endings
 */
export function getLineEndingStats(content: string): LineEndingStats {
  let lf = 0
  let crlf = 0
  let cr = 0

  // Count line endings
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '\r') {
      if (i + 1 < content.length && content[i + 1] === '\n') {
        crlf++
        i++ // Skip the \n part
      } else {
        cr++
      }
    } else if (content[i] === '\n') {
      // Standalone \n (not preceded by \r)
      if (i === 0 || content[i - 1] !== '\r') {
        lf++
      }
    }
  }

  const total = lf + crlf + cr
  const detected = detectLineEnding(content)

  return {
    lf,
    crlf,
    cr,
    detected,
    percentage: {
      lf: total > 0 ? (lf / total) * 100 : 0,
      crlf: total > 0 ? (crlf / total) * 100 : 0,
      cr: total > 0 ? (cr / total) * 100 : 0,
    }
  }
}

/**
 * Convert content to target line ending style
 */
export function convertLineEnding(content: string, target: LineEnding): string {
  // First normalize to LF (remove all \r)
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Then convert to target
  switch (target) {
    case 'CRLF':
      return normalized.replace(/\n/g, '\r\n')
    case 'CR':
      return normalized.replace(/\n/g, '\r')
    case 'LF':
      return normalized
    case 'Mixed':
      // Cannot convert to mixed - default to LF
      return normalized
    default:
      return normalized
  }
}

/**
 * Get display name for line ending type
 */
export function getLineEndingDisplayName(lineEnding: LineEnding): string {
  const names: Record<LineEnding, string> = {
    'LF': 'LF (Unix/Linux/Mac)',
    'CRLF': 'CRLF (Windows)',
    'CR': 'CR (Classic Mac)',
    'Mixed': 'Mixed',
  }
  return names[lineEnding] || lineEnding
}

/**
 * Get short display name for line ending type
 */
export function getLineEndingShortName(lineEnding: LineEnding): string {
  const names: Record<LineEnding, string> = {
    'LF': 'LF',
    'CRLF': 'CRLF',
    'CR': 'CR',
    'Mixed': 'Mixed',
  }
  return names[lineEnding] || lineEnding
}

/**
 * Check if content has mixed line endings
 */
export function hasMixedLineEndings(content: string): boolean {
  const stats = getLineEndingStats(content)
  const typesUsed = [stats.lf, stats.crlf, stats.cr].filter(n => n > 0).length
  return typesUsed > 1
}

/**
 * Normalize line endings (convert mixed to dominant type)
 */
export function normalizeLineEndings(content: string): string {
  const detected = detectLineEnding(content)
  if (detected === 'Mixed') {
    // Default to LF for mixed
    return convertLineEnding(content, 'LF')
  }
  return content
}