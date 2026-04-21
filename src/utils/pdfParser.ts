import * as pdfjsLib from 'pdfjs-dist'

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export interface PDFPage {
  pageNumber: number
  text: string
  items: PDFItem[]
}

export interface PDFItem {
  str: string
  transform: number[]
  fontName?: string
  width: number
  height: number
}

export interface PDFMetadata {
  title?: string
  author?: string
  subject?: string
  creator?: string
  producer?: string
  creationDate?: string
  modificationDate?: string
  pageCount: number
}

export interface PDFComparisonResult {
  leftPages: PDFPage[]
  rightPages: PDFPage[]
  diffs: PDFDiff[]
  metadataMatch: boolean
  leftMetadata: PDFMetadata
  rightMetadata: PDFMetadata
}

export interface PDFDiff {
  pageNumber: number
  type: 'content' | 'addition' | 'deletion' | 'modification'
  leftContent?: string
  rightContent?: string
  details: string[]
}

/**
 * Parse PDF and extract text content
 */
export async function parsePDF(data: Uint8Array): Promise<{
  pages: PDFPage[]
  metadata: PDFMetadata
}> {
  const loadingTask = pdfjsLib.getDocument({ data })

  const pdfDocument = await loadingTask.promise

  // Get metadata
  const info = await pdfDocument.getMetadata()
  const infoData = info.info as Record<string, unknown>
  const metadata: PDFMetadata = {
    title: infoData?.Title as string,
    author: infoData?.Author as string,
    subject: infoData?.Subject as string,
    creator: infoData?.Creator as string,
    producer: infoData?.Producer as string,
    creationDate: infoData?.CreationDate as string,
    modificationDate: infoData?.ModDate as string,
    pageCount: pdfDocument.numPages,
  }

  // Extract text from each page
  const pages: PDFPage[] = []

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum)
    const textContent = await page.getTextContent()

    const items: PDFItem[] = textContent.items
      .filter((item) => 'str' in item)
      .map(item => ({
        str: (item as { str: string }).str,
        transform: (item as { transform: number[] }).transform,
        fontName: (item as { fontName?: string }).fontName,
        width: (item as { width: number }).width,
        height: (item as { height: number }).height,
      }))

    const pageText = items.map(item => item.str).join(' ')

    pages.push({
      pageNumber: pageNum,
      text: pageText,
      items,
    })
  }

  return { pages, metadata }
}

/**
 * Compare two PDFs
 */
export async function comparePDFs(
  leftData: Uint8Array,
  rightData: Uint8Array
): Promise<PDFComparisonResult> {
  const leftResult = await parsePDF(leftData)
  const rightResult = await parsePDF(rightData)

  const diffs: PDFDiff[] = []

  // Compare metadata
  const metadataMatch = compareMetadata(leftResult.metadata, rightResult.metadata)

  // Compare pages
  const maxPages = Math.max(leftResult.pages.length, rightResult.pages.length)

  for (let i = 0; i < maxPages; i++) {
    const leftPage = leftResult.pages[i]
    const rightPage = rightResult.pages[i]

    if (!leftPage) {
      // Page added in right
      diffs.push({
        pageNumber: i + 1,
        type: 'addition',
        rightContent: rightPage.text,
        details: ['Page added in right document'],
      })
    } else if (!rightPage) {
      // Page deleted from right
      diffs.push({
        pageNumber: i + 1,
        type: 'deletion',
        leftContent: leftPage.text,
        details: ['Page removed from right document'],
      })
    } else {
      // Compare page content
      const pageDiffs = comparePageContent(leftPage, rightPage)
      if (pageDiffs.length > 0) {
        diffs.push({
          pageNumber: i + 1,
          type: 'modification',
          leftContent: leftPage.text,
          rightContent: rightPage.text,
          details: pageDiffs,
        })
      }
    }
  }

  return {
    leftPages: leftResult.pages,
    rightPages: rightResult.pages,
    diffs,
    metadataMatch,
    leftMetadata: leftResult.metadata,
    rightMetadata: rightResult.metadata,
  }
}

/**
 * Compare PDF metadata
 */
function compareMetadata(left: PDFMetadata, right: PDFMetadata): boolean {
  return (
    left.title === right.title &&
    left.author === right.author &&
    left.subject === right.subject &&
    left.pageCount === right.pageCount
  )
}

/**
 * Compare page content using simple text diff
 */
function comparePageContent(leftPage: PDFPage, rightPage: PDFPage): string[] {
  const details: string[] = []

  // Simple text comparison
  if (leftPage.text !== rightPage.text) {
    // Find specific differences
    const leftWords = leftPage.text.split(/\s+/)
    const rightWords = rightPage.text.split(/\s+/)

    const added = rightWords.filter(w => !leftWords.includes(w))
    const removed = leftWords.filter(w => !rightWords.includes(w))

    if (added.length > 0) {
      details.push(`Added: ${added.slice(0, 10).join(', ')}${added.length > 10 ? '...' : ''}`)
    }
    if (removed.length > 0) {
      details.push(`Removed: ${removed.slice(0, 10).join(', ')}${removed.length > 10 ? '...' : ''}`)
    }
  }

  // Check item count difference
  if (leftPage.items.length !== rightPage.items.length) {
    details.push(`Text elements: ${leftPage.items.length} vs ${rightPage.items.length}`)
  }

  return details
}

/**
 * Get PDF page as image for visual comparison
 */
export async function renderPDFPage(
  data: Uint8Array,
  pageNumber: number,
  scale: number = 1.5
): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data })
  const pdfDocument = await loadingTask.promise
  const page = await pdfDocument.getPage(pageNumber)

  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not get canvas context')

  const renderContext = {
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  }

  await page.render(renderContext as any).promise

  return canvas.toDataURL('image/png')
}