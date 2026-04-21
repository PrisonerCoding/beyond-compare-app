import mammoth from 'mammoth'

export interface WordDocument {
  text: string
  html: string
  paragraphs: Paragraph[]
  metadata: WordMetadata
}

export interface Paragraph {
  index: number
  text: string
  style?: string
  alignment?: string
  fontSize?: number
  fontName?: string
  isBold?: boolean
  isItalic?: boolean
  hasBullet?: boolean
  numbering?: string
}

export interface WordMetadata {
  title?: string
  author?: string
  subject?: string
  keywords?: string
  creator?: string
  lastModifiedBy?: string
  revision?: number
  paragraphCount: number
}

export interface WordComparisonResult {
  leftDoc: WordDocument
  rightDoc: WordDocument
  diffs: WordDiff[]
  metadataMatch: boolean
}

export interface WordDiff {
  type: 'paragraph-added' | 'paragraph-deleted' | 'paragraph-modified' | 'format-change'
  paragraphIndex: number
  leftParagraph?: Paragraph
  rightParagraph?: Paragraph
  details: string[]
}

/**
 * Parse Word document (.docx)
 */
export async function parseWordDocument(data: Uint8Array): Promise<WordDocument> {
  // Convert Uint8Array to ArrayBuffer (ensure it's ArrayBuffer, not SharedArrayBuffer)
  const arrayBuffer = new ArrayBuffer(data.length)
  const view = new Uint8Array(arrayBuffer)
  view.set(data)

  // Extract text
  const textResult = await mammoth.extractRawText({ arrayBuffer })
  const text = textResult.value

  // Extract HTML for format info
  const htmlResult = await mammoth.convertToHtml({ arrayBuffer })
  const html = htmlResult.value

  // Parse paragraphs from text
  const paragraphs: Paragraph[] = []
  const textLines = text.split('\n').filter(line => line.trim())

  for (let i = 0; i < textLines.length; i++) {
    paragraphs.push({
      index: i,
      text: textLines[i].trim(),
    })
  }

  // Extract format info from HTML
  const formatInfo = parseHtmlForFormatInfo(html)
  for (let i = 0; i < paragraphs.length && i < formatInfo.length; i++) {
    paragraphs[i] = { ...paragraphs[i], ...formatInfo[i] }
  }

  // Metadata (mammoth doesn't provide extensive metadata, use defaults)
  const metadata: WordMetadata = {
    paragraphCount: paragraphs.length,
  }

  return {
    text,
    html,
    paragraphs,
    metadata,
  }
}

/**
 * Parse HTML to extract format information
 */
function parseHtmlForFormatInfo(html: string): Partial<Paragraph>[] {
  const info: Partial<Paragraph>[] = []

  // Simple regex-based parsing for common formats
  const pRegex = /<p[^>]*>(.*?)<\/p>/gi
  let match

  while ((match = pRegex.exec(html)) !== null) {
    const content = match[1]
    const paragraphInfo: Partial<Paragraph> = {}

    // Check for bold
    if (content.includes('<strong>') || content.includes('<b>')) {
      paragraphInfo.isBold = true
    }

    // Check for italic
    if (content.includes('<em>') || content.includes('<i>')) {
      paragraphInfo.isItalic = true
    }

    // Check for bullet/numbering
    if (html.slice(match.index - 50, match.index).includes('<ul>') ||
        html.slice(match.index - 50, match.index).includes('<ol>')) {
      paragraphInfo.hasBullet = true
    }

    info.push(paragraphInfo)
  }

  return info
}

/**
 * Compare two Word documents
 */
export async function compareWordDocuments(
  leftData: Uint8Array,
  rightData: Uint8Array
): Promise<WordComparisonResult> {
  const leftDoc = await parseWordDocument(leftData)
  const rightDoc = await parseWordDocument(rightData)

  const diffs: WordDiff[] = []

  // Compare paragraphs
  const maxParagraphs = Math.max(leftDoc.paragraphs.length, rightDoc.paragraphs.length)

  for (let i = 0; i < maxParagraphs; i++) {
    const leftPara = leftDoc.paragraphs[i]
    const rightPara = rightDoc.paragraphs[i]

    if (!leftPara) {
      diffs.push({
        type: 'paragraph-added',
        paragraphIndex: i,
        rightParagraph: rightPara,
        details: [`Paragraph added: "${truncateText(rightPara.text, 50)}"`],
      })
    } else if (!rightPara) {
      diffs.push({
        type: 'paragraph-deleted',
        paragraphIndex: i,
        leftParagraph: leftPara,
        details: [`Paragraph deleted: "${truncateText(leftPara.text, 50)}"`],
      })
    } else if (leftPara.text !== rightPara.text) {
      const details: string[] = [`Text changed: "${truncateText(leftPara.text, 30)}" → "${truncateText(rightPara.text, 30)}"`]
      diffs.push({
        type: 'paragraph-modified',
        paragraphIndex: i,
        leftParagraph: leftPara,
        rightParagraph: rightPara,
        details,
      })
    } else {
      // Check format changes
      const formatDiffs = compareFormats(leftPara, rightPara)
      if (formatDiffs.length > 0) {
        diffs.push({
          type: 'format-change',
          paragraphIndex: i,
          leftParagraph: leftPara,
          rightParagraph: rightPara,
          details: formatDiffs,
        })
      }
    }
  }

  // Compare metadata
  const metadataMatch = compareWordMetadata(leftDoc.metadata, rightDoc.metadata)

  return {
    leftDoc,
    rightDoc,
    diffs,
    metadataMatch,
  }
}

/**
 * Compare paragraph formats
 */
function compareFormats(left: Paragraph, right: Paragraph): string[] {
  const diffs: string[] = []

  if (left.isBold !== right.isBold) {
    diffs.push(`Bold: ${left.isBold ? 'yes' : 'no'} → ${right.isBold ? 'yes' : 'no'}`)
  }
  if (left.isItalic !== right.isItalic) {
    diffs.push(`Italic: ${left.isItalic ? 'yes' : 'no'} → ${right.isItalic ? 'yes' : 'no'}`)
  }
  if (left.hasBullet !== right.hasBullet) {
    diffs.push(`Bullet: ${left.hasBullet ? 'yes' : 'no'} → ${right.hasBullet ? 'yes' : 'no'}`)
  }

  return diffs
}

/**
 * Compare Word metadata
 */
function compareWordMetadata(left: WordMetadata, right: WordMetadata): boolean {
  return (
    left.title === right.title &&
    left.author === right.author &&
    left.paragraphCount === right.paragraphCount
  )
}

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}