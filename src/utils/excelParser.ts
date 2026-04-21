import * as XLSX from 'xlsx'

export interface ExcelWorkbook {
  sheets: ExcelSheet[]
  metadata: ExcelMetadata
}

export interface ExcelSheet {
  name: string
  rows: ExcelRow[]
  columns: string[]
  rowCount: number
  colCount: number
}

export interface ExcelRow {
  rowIndex: number
  cells: ExcelCell[]
}

export interface ExcelCell {
  columnIndex: number
  columnName: string
  value: string | number | null
  type: 'text' | 'number' | 'formula' | 'date' | 'empty'
  formula?: string
  format?: string
  isBold?: boolean
  alignment?: string
}

export interface ExcelMetadata {
  sheetCount: number
  sheetNames: string[]
  author?: string
  title?: string
  subject?: string
  createdDate?: string
  modifiedDate?: string
}

export interface ExcelComparisonResult {
  leftWorkbook: ExcelWorkbook
  rightWorkbook: ExcelWorkbook
  sheetDiffs: SheetDiff[]
  metadataMatch: boolean
}

export interface SheetDiff {
  sheetName: string
  type: 'sheet-added' | 'sheet-deleted' | 'sheet-modified'
  diffs: CellDiff[]
  rowCountDiff: number
  colCountDiff: number
}

export interface CellDiff {
  type: 'cell-added' | 'cell-deleted' | 'cell-modified' | 'format-change'
  row: number
  column: string
  leftValue?: string | number | null
  rightValue?: string | number | null
  details: string[]
}

/**
 * Parse Excel workbook
 */
export function parseExcelWorkbook(data: Uint8Array): ExcelWorkbook {
  const workbook = XLSX.read(data, { type: 'array', cellStyles: true })

  const sheets: ExcelSheet[] = workbook.SheetNames.map(name => {
    const worksheet = workbook.Sheets[name]
    return parseSheet(worksheet, name)
  })

  // Extract metadata from workbook props
  const props = workbook.Props || {}
  const metadata: ExcelMetadata = {
    sheetCount: sheets.length,
    sheetNames: workbook.SheetNames,
    author: props.Author,
    title: props.Title,
    subject: props.Subject,
    createdDate: props.CreatedDate?.toString(),
    modifiedDate: props.ModifiedDate?.toString(),
  }

  return { sheets, metadata }
}

/**
 * Parse individual sheet
 */
function parseSheet(worksheet: XLSX.WorkSheet, name: string): ExcelSheet {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  const rowCount = range.e.r - range.s.r + 1
  const colCount = range.e.c - range.s.c + 1

  // Generate column names
  const columns: string[] = []
  for (let c = range.s.c; c <= range.e.c; c++) {
    columns.push(XLSX.utils.encode_col(c))
  }

  // Parse rows and cells
  const rows: ExcelRow[] = []
  for (let r = range.s.r; r <= range.e.r; r++) {
    const cells: ExcelCell[] = []

    for (let c = range.s.c; c <= range.e.c; c++) {
      const address = XLSX.utils.encode_cell({ r, c })
      const cell = worksheet[address]

      cells.push(parseCell(cell, c, XLSX.utils.encode_col(c)))
    }

    rows.push({ rowIndex: r, cells })
  }

  return { name, rows, columns, rowCount, colCount }
}

/**
 * Parse individual cell
 */
function parseCell(cell: XLSX.CellObject | undefined, columnIndex: number, columnName: string): ExcelCell {
  if (!cell) {
    return {
      columnIndex,
      columnName,
      value: null,
      type: 'empty',
    }
  }

  const value = cell.v !== undefined ? cell.v : null
  let type: 'text' | 'number' | 'formula' | 'date' | 'empty' = 'text'

  if (cell.f) {
    type = 'formula'
  } else if (typeof value === 'number') {
    type = 'number'
    // Check if it's a date (cell.t can be 'd' for date)
    if ((cell.t as string) === 'd' || XLSX.SSF.is_date(cell.z || '')) {
      type = 'date'
    }
  } else if (value === null || value === undefined) {
    type = 'empty'
  }

  // Extract style info if available
  const styleInfo: Partial<ExcelCell> = {}
  if (cell.s) {
    // Cell styles are in a separate array, referenced by index
    // For simplicity, we'll skip detailed style extraction
  }

  return {
    columnIndex,
    columnName,
    value: value?.toString() || null,
    type,
    formula: cell.f,
    format: cell.z?.toString(),
    ...styleInfo,
  }
}

/**
 * Compare two Excel workbooks
 */
export function compareExcelWorkbooks(
  leftData: Uint8Array,
  rightData: Uint8Array
): ExcelComparisonResult {
  const leftWorkbook = parseExcelWorkbook(leftData)
  const rightWorkbook = parseExcelWorkbook(rightData)

  const sheetDiffs: SheetDiff[] = []

  // Compare all sheets
  const allSheetNames = new Set([
    ...leftWorkbook.sheets.map(s => s.name),
    ...rightWorkbook.sheets.map(s => s.name),
  ])

  for (const sheetName of allSheetNames) {
    const leftSheet = leftWorkbook.sheets.find(s => s.name === sheetName)
    const rightSheet = rightWorkbook.sheets.find(s => s.name === sheetName)

    if (!leftSheet) {
      sheetDiffs.push({
        sheetName,
        type: 'sheet-added',
        diffs: [],
        rowCountDiff: rightSheet!.rowCount,
        colCountDiff: rightSheet!.colCount,
      })
    } else if (!rightSheet) {
      sheetDiffs.push({
        sheetName,
        type: 'sheet-deleted',
        diffs: [],
        rowCountDiff: -leftSheet.rowCount,
        colCountDiff: -leftSheet.colCount,
      })
    } else {
      const diffs = compareSheets(leftSheet, rightSheet)
      if (diffs.length > 0 || leftSheet.rowCount !== rightSheet.rowCount) {
        sheetDiffs.push({
          sheetName,
          type: 'sheet-modified',
          diffs,
          rowCountDiff: rightSheet.rowCount - leftSheet.rowCount,
          colCountDiff: rightSheet.colCount - leftSheet.colCount,
        })
      }
    }
  }

  // Compare metadata
  const metadataMatch = compareExcelMetadata(leftWorkbook.metadata, rightWorkbook.metadata)

  return {
    leftWorkbook,
    rightWorkbook,
    sheetDiffs,
    metadataMatch,
  }
}

/**
 * Compare two sheets
 */
function compareSheets(left: ExcelSheet, right: ExcelSheet): CellDiff[] {
  const diffs: CellDiff[] = []

  const maxRows = Math.max(left.rows.length, right.rows.length)
  const maxCols = Math.max(left.columns.length, right.columns.length)

  for (let r = 0; r < maxRows; r++) {
    const leftRow = left.rows[r]
    const rightRow = right.rows[r]

    for (let c = 0; c < maxCols; c++) {
      const leftCell = leftRow?.cells[c]
      const rightCell = rightRow?.cells[c]

      const diff = compareCells(leftCell, rightCell, r, left.columns[c] || right.columns[c])
      if (diff) {
        diffs.push(diff)
      }
    }
  }

  return diffs
}

/**
 * Compare two cells
 */
function compareCells(
  left: ExcelCell | undefined,
  right: ExcelCell | undefined,
  row: number,
  column: string
): CellDiff | null {
  if (!left && right && right.value !== null) {
    return {
      type: 'cell-added',
      row,
      column,
      rightValue: right.value,
      details: [`Cell added: ${right.value}`],
    }
  }

  if (!right && left && left.value !== null) {
    return {
      type: 'cell-deleted',
      row,
      column,
      leftValue: left.value,
      details: [`Cell deleted: ${left.value}`],
    }
  }

  if (left && right && left.value !== right.value) {
    return {
      type: 'cell-modified',
      row,
      column,
      leftValue: left.value,
      rightValue: right.value,
      details: [`${left.value ?? ''} → ${right.value ?? ''}`],
    }
  }

  // Check format changes
  if (left && right && left.format !== right.format) {
    return {
      type: 'format-change',
      row,
      column,
      leftValue: left.value,
      rightValue: right.value,
      details: [`Format: ${left.format ?? ''} → ${right.format ?? ''}`],
    }
  }

  return null
}

/**
 * Compare Excel metadata
 */
function compareExcelMetadata(left: ExcelMetadata, right: ExcelMetadata): boolean {
  return (
    left.sheetCount === right.sheetCount &&
    left.title === right.title &&
    left.author === right.author &&
    JSON.stringify(left.sheetNames) === JSON.stringify(right.sheetNames)
  )
}

/**
 * Get sheet data as CSV string
 */
export function sheetToCSV(sheet: ExcelSheet): string {
  return sheet.rows.map(row =>
    row.cells.map(cell => cell.value ?? '').join(',')
  ).join('\n')
}

/**
 * Get cell diff statistics
 */
export function getDiffStats(sheetDiffs: SheetDiff[]): {
  sheetsAdded: number
  sheetsDeleted: number
  sheetsModified: number
  cellsChanged: number
} {
  return {
    sheetsAdded: sheetDiffs.filter(d => d.type === 'sheet-added').length,
    sheetsDeleted: sheetDiffs.filter(d => d.type === 'sheet-deleted').length,
    sheetsModified: sheetDiffs.filter(d => d.type === 'sheet-modified').length,
    cellsChanged: sheetDiffs.reduce((sum, d) => sum + d.diffs.length, 0),
  }
}