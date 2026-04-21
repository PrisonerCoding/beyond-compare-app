import { useState, useEffect } from 'react'
import { readFile } from '@tauri-apps/plugin-fs'
import type { PDFComparisonResult } from '../utils/pdfParser'
import type { WordComparisonResult } from '../utils/wordParser'
import type { ExcelComparisonResult } from '../utils/excelParser'
import { comparePDFs, renderPDFPage } from '../utils/pdfParser'
import { compareWordDocuments } from '../utils/wordParser'
import { compareExcelWorkbooks, getDiffStats, sheetToCSV } from '../utils/excelParser'
import {
  FileText,
  Table,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  RefreshCw,
} from 'lucide-react'

type DocumentType = 'pdf' | 'word' | 'excel'

interface DocumentCompareProps {
  leftPath: string
  rightPath: string
  documentType: DocumentType
}

export function DocumentCompare({ leftPath, rightPath, documentType }: DocumentCompareProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<
    PDFComparisonResult | WordComparisonResult | ExcelComparisonResult | null
  >(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [currentSheet, setCurrentSheet] = useState(0)
  const [viewMode, setViewMode] = useState<'diffs' | 'content' | 'visual'>('diffs')
  const [leftImage, setLeftImage] = useState<string | null>(null)
  const [rightImage, setRightImage] = useState<string | null>(null)

  useEffect(() => {
    loadAndCompare()
  }, [leftPath, rightPath, documentType])

  const loadAndCompare = async () => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const leftData = await readFile(leftPath)
      const rightData = await readFile(rightPath)

      switch (documentType) {
        case 'pdf':
          const pdfResult = await comparePDFs(leftData, rightData)
          setResult(pdfResult)
          break
        case 'word':
          const wordResult = await compareWordDocuments(leftData, rightData)
          setResult(wordResult)
          break
        case 'excel':
          const excelResult = compareExcelWorkbooks(leftData, rightData)
          setResult(excelResult)
          break
      }
    } catch (err) {
      setError(`Failed to compare documents: ${(err as Error).message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const renderPDFVisual = async (pageNum: number) => {
    if (!result || documentType !== 'pdf') return

    try {
      const leftData = await readFile(leftPath)
      const rightData = await readFile(rightPath)

      const leftImg = await renderPDFPage(leftData, pageNum + 1)
      const rightImg = await renderPDFPage(rightData, pageNum + 1)

      setLeftImage(leftImg)
      setRightImage(rightImg)
    } catch (err) {
      console.error('Failed to render PDF pages:', err)
    }
  }

  useEffect(() => {
    if (viewMode === 'visual' && documentType === 'pdf') {
      renderPDFVisual(currentPage)
    }
  }, [viewMode, currentPage, documentType])

  const getFileName = (path: string) => path.split(/[/\\]/).pop() || path

  const getDiffIcon = (type: string) => {
    switch (type) {
      case 'addition': case 'paragraph-added': case 'sheet-added': case 'cell-added':
        return <Plus size={14} className="diff-icon added" />
      case 'deletion': case 'paragraph-deleted': case 'sheet-deleted': case 'cell-deleted':
        return <Minus size={14} className="diff-icon deleted" />
      default:
        return <RefreshCw size={14} className="diff-icon modified" />
    }
  }

  if (isLoading) {
    return (
      <div className="doc-compare-loading">
        <div className="doc-spinner">⏳</div>
        <div className="doc-loading-text">
          Comparing {documentType.toUpperCase()} documents...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="doc-compare-error">
        <div className="doc-error-icon">❌</div>
        <div className="doc-error-text">{error}</div>
        <button className="doc-retry-btn" onClick={loadAndCompare}>
          Retry
        </button>
      </div>
    )
  }

  if (!result) return null

  // PDF rendering
  if (documentType === 'pdf' && 'diffs' in result) {
    const pdfResult = result as PDFComparisonResult
    const totalDiffs = pdfResult.diffs.length
    const pagesWithDiffs = pdfResult.diffs.map(d => d.pageNumber)

    return (
      <div className="doc-compare-container">
        <div className="doc-compare-header">
          <div className="doc-info">
            <FileText size={16} />
            <span className="doc-type-badge">PDF</span>
            <span className="doc-left-name">{getFileName(leftPath)}</span>
            <span className="doc-vs">vs</span>
            <span className="doc-right-name">{getFileName(rightPath)}</span>
          </div>

          <div className="doc-stats">
            <span className="doc-pages">
              {pdfResult.leftMetadata.pageCount} vs {pdfResult.rightMetadata.pageCount} pages
            </span>
            {totalDiffs > 0 && (
              <span className="doc-diffs-count">{totalDiffs} differences</span>
            )}
            {!pdfResult.metadataMatch && (
              <span className="doc-metadata-diff">Metadata differs</span>
            )}
          </div>

          <div className="doc-view-modes">
            <button
              className={`doc-mode-btn ${viewMode === 'diffs' ? 'active' : ''}`}
              onClick={() => setViewMode('diffs')}
            >
              Differences
            </button>
            <button
              className={`doc-mode-btn ${viewMode === 'content' ? 'active' : ''}`}
              onClick={() => setViewMode('content')}
            >
              Content
            </button>
            <button
              className={`doc-mode-btn ${viewMode === 'visual' ? 'active' : ''}`}
              onClick={() => setViewMode('visual')}
            >
              Visual
            </button>
          </div>
        </div>

        {viewMode === 'diffs' && (
          <div className="doc-diffs-panel">
            {totalDiffs === 0 ? (
              <div className="doc-no-diffs">No differences found</div>
            ) : (
              pdfResult.diffs.map((diff, idx) => (
                <div key={idx} className="doc-diff-item">
                  <div className="doc-diff-header">
                    {getDiffIcon(diff.type)}
                    <span className="doc-diff-page">Page {diff.pageNumber}</span>
                    <span className="doc-diff-type">{diff.type}</span>
                  </div>
                  <div className="doc-diff-details">
                    {diff.details.map(d => <span key={d}>{d}</span>)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {viewMode === 'content' && (
          <div className="doc-content-panel">
            <div className="doc-content-nav">
              <button
                className="doc-nav-btn"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="doc-page-num">
                Page {currentPage + 1} / {pdfResult.leftPages.length}
              </span>
              <button
                className="doc-nav-btn"
                disabled={currentPage >= pdfResult.leftPages.length - 1}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight size={16} />
              </button>
              {pagesWithDiffs.includes(currentPage + 1) && (
                <span className="doc-page-diff-indicator">Has differences</span>
              )}
            </div>
            <div className="doc-content-views">
              <div className="doc-content-pane left">
                <div className="doc-pane-header">L: Page {currentPage + 1}</div>
                <pre className="doc-content-text">
                  {pdfResult.leftPages[currentPage]?.text || 'No content'}
                </pre>
              </div>
              <div className="doc-content-pane right">
                <div className="doc-pane-header">R: Page {currentPage + 1}</div>
                <pre className="doc-content-text">
                  {pdfResult.rightPages[currentPage]?.text || 'No content'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'visual' && (
          <div className="doc-visual-panel">
            <div className="doc-content-nav">
              <button
                className="doc-nav-btn"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="doc-page-num">
                Page {currentPage + 1}
              </span>
              <button
                className="doc-nav-btn"
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="doc-visual-views">
              <div className="doc-visual-pane left">
                <div className="doc-pane-header">L</div>
                {leftImage ? (
                  <img src={leftImage} alt="Left page" className="doc-visual-image" />
                ) : (
                  <div className="doc-visual-loading">Loading...</div>
                )}
              </div>
              <div className="doc-visual-pane right">
                <div className="doc-pane-header">R</div>
                {rightImage ? (
                  <img src={rightImage} alt="Right page" className="doc-visual-image" />
                ) : (
                  <div className="doc-visual-loading">Loading...</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Word rendering
  if (documentType === 'word' && 'diffs' in result) {
    const wordResult = result as WordComparisonResult
    const totalDiffs = wordResult.diffs.length

    return (
      <div className="doc-compare-container">
        <div className="doc-compare-header">
          <div className="doc-info">
            <FileText size={16} />
            <span className="doc-type-badge">Word</span>
            <span className="doc-left-name">{getFileName(leftPath)}</span>
            <span className="doc-vs">vs</span>
            <span className="doc-right-name">{getFileName(rightPath)}</span>
          </div>

          <div className="doc-stats">
            <span className="doc-paras">
              {wordResult.leftDoc.metadata.paragraphCount} vs {wordResult.rightDoc.metadata.paragraphCount} paragraphs
            </span>
            {totalDiffs > 0 && (
              <span className="doc-diffs-count">{totalDiffs} differences</span>
            )}
          </div>

          <div className="doc-view-modes">
            <button
              className={`doc-mode-btn ${viewMode === 'diffs' ? 'active' : ''}`}
              onClick={() => setViewMode('diffs')}
            >
              Differences
            </button>
            <button
              className={`doc-mode-btn ${viewMode === 'content' ? 'active' : ''}`}
              onClick={() => setViewMode('content')}
            >
              Content
            </button>
          </div>
        </div>

        {viewMode === 'diffs' && (
          <div className="doc-diffs-panel">
            {totalDiffs === 0 ? (
              <div className="doc-no-diffs">No differences found</div>
            ) : (
              wordResult.diffs.map((diff, idx) => (
                <div key={idx} className="doc-diff-item">
                  <div className="doc-diff-header">
                    {getDiffIcon(diff.type)}
                    <span className="doc-diff-para">Paragraph {diff.paragraphIndex}</span>
                    <span className="doc-diff-type">{diff.type}</span>
                  </div>
                  <div className="doc-diff-details">
                    {diff.details.map(d => <span key={d}>{d}</span>)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {viewMode === 'content' && (
          <div className="doc-content-panel">
            <div className="doc-content-views vertical">
              <div className="doc-content-pane left">
                <div className="doc-pane-header">L: {wordResult.leftDoc.metadata.paragraphCount} paragraphs</div>
                <div className="doc-paragraphs">
                  {wordResult.leftDoc.paragraphs.map((para, idx) => (
                    <div key={idx} className="doc-paragraph">
                      <span className="doc-para-num">{para.index}</span>
                      <span className="doc-para-text">{para.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="doc-content-pane right">
                <div className="doc-pane-header">R: {wordResult.rightDoc.metadata.paragraphCount} paragraphs</div>
                <div className="doc-paragraphs">
                  {wordResult.rightDoc.paragraphs.map((para, idx) => (
                    <div key={idx} className="doc-paragraph">
                      <span className="doc-para-num">{para.index}</span>
                      <span className="doc-para-text">{para.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Excel rendering
  if (documentType === 'excel' && 'sheetDiffs' in result) {
    const excelResult = result as ExcelComparisonResult
    const stats = getDiffStats(excelResult.sheetDiffs)

    return (
      <div className="doc-compare-container">
        <div className="doc-compare-header">
          <div className="doc-info">
            <Table size={16} />
            <span className="doc-type-badge">Excel</span>
            <span className="doc-left-name">{getFileName(leftPath)}</span>
            <span className="doc-vs">vs</span>
            <span className="doc-right-name">{getFileName(rightPath)}</span>
          </div>

          <div className="doc-stats">
            <span className="doc-sheets">
              {excelResult.leftWorkbook.metadata.sheetCount} vs {excelResult.rightWorkbook.metadata.sheetCount} sheets
            </span>
            <span className="doc-cells-changed">{stats.cellsChanged} cells changed</span>
            {stats.sheetsAdded > 0 && (
              <span className="doc-sheets-added">{stats.sheetsAdded} sheets added</span>
            )}
            {stats.sheetsDeleted > 0 && (
              <span className="doc-sheets-deleted">{stats.sheetsDeleted} sheets deleted</span>
            )}
          </div>

          <div className="doc-view-modes">
            <button
              className={`doc-mode-btn ${viewMode === 'diffs' ? 'active' : ''}`}
              onClick={() => setViewMode('diffs')}
            >
              Differences
            </button>
            <button
              className={`doc-mode-btn ${viewMode === 'content' ? 'active' : ''}`}
              onClick={() => setViewMode('content')}
            >
              Sheets
            </button>
          </div>
        </div>

        {viewMode === 'diffs' && (
          <div className="doc-diffs-panel">
            {excelResult.sheetDiffs.length === 0 ? (
              <div className="doc-no-diffs">No differences found</div>
            ) : (
              excelResult.sheetDiffs.map((sheetDiff, idx) => (
                <div key={idx} className="doc-diff-sheet">
                  <div className="doc-diff-header">
                    {getDiffIcon(sheetDiff.type)}
                    <span className="doc-diff-sheet-name">{sheetDiff.sheetName}</span>
                    <span className="doc-diff-type">{sheetDiff.type}</span>
                    {sheetDiff.rowCountDiff !== 0 && (
                      <span className="doc-row-count-diff">
                        Rows: {sheetDiff.rowCountDiff > 0 ? '+' : ''}{sheetDiff.rowCountDiff}
                      </span>
                    )}
                  </div>
                  {sheetDiff.diffs.length > 0 && (
                    <div className="doc-cell-diffs">
                      {sheetDiff.diffs.slice(0, 20).map((cellDiff, cidx) => (
                        <div key={cidx} className="doc-cell-diff">
                          <span className="doc-cell-pos">{cellDiff.column}{cellDiff.row + 1}</span>
                          {getDiffIcon(cellDiff.type)}
                          <span className="doc-cell-change">
                            {cellDiff.leftValue ?? ''} → {cellDiff.rightValue ?? ''}
                          </span>
                        </div>
                      ))}
                      {sheetDiff.diffs.length > 20 && (
                        <span className="doc-more-diffs">
                          +{sheetDiff.diffs.length - 20} more changes
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {viewMode === 'content' && (
          <div className="doc-content-panel">
            <div className="doc-sheet-tabs">
              {excelResult.leftWorkbook.sheets.map((sheet, idx) => (
                <button
                  key={sheet.name}
                  className={`doc-sheet-tab ${currentSheet === idx ? 'active' : ''}`}
                  onClick={() => setCurrentSheet(idx)}
                >
                  {sheet.name}
                </button>
              ))}
            </div>
            <div className="doc-sheet-view">
              <div className="doc-sheet-header">
                <span className="doc-sheet-name">
                  {excelResult.leftWorkbook.sheets[currentSheet]?.name}
                </span>
                <span className="doc-sheet-size">
                  {excelResult.leftWorkbook.sheets[currentSheet]?.rowCount} rows ×
                  {excelResult.leftWorkbook.sheets[currentSheet]?.colCount} cols
                </span>
              </div>
              <pre className="doc-sheet-csv">
                {excelResult.leftWorkbook.sheets[currentSheet] &&
                  sheetToCSV(excelResult.leftWorkbook.sheets[currentSheet])
                }
              </pre>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}