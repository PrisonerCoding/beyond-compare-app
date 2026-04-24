import type { FileContent } from '../types'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'

export interface DiffReportOptions {
  leftFile: FileContent
  rightFile: FileContent
  diffStats: {
    added: number
    removed: number
    modified: number
  }
  showLineNumbers?: boolean
}

export function generateDiffReport(options: DiffReportOptions): string {
  const { leftFile, rightFile, diffStats, showLineNumbers = true } = options

  const timestamp = new Date().toLocaleString()
  const leftFileName = leftFile.path.split(/[/\\]/).pop() || leftFile.path
  const rightFileName = rightFile.path.split(/[/\\]/).pop() || rightFile.path

  // Compute line-level diff
  const leftLines = leftFile.content.split('\n')
  const rightLines = rightFile.content.split('\n')

  const diffHtml = generateDiffHtml(leftLines, rightLines, showLineNumbers)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Diff Report: ${leftFileName} vs ${rightFileName}</title>
  <style>
    :root {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-tertiary: #0f3460;
      --text-primary: #eaeaea;
      --text-secondary: #a0a0a0;
      --text-muted: #6b6b6b;
      --diff-added-bg: rgba(46, 160, 67, 0.15);
      --diff-added-line: #2ea043;
      --diff-removed-bg: rgba(248, 81, 73, 0.15);
      --diff-removed-line: #f85149;
      --diff-modified-bg: rgba(210, 153, 34, 0.15);
      --diff-modified-line: #d29922;
      --border-color: #2a2a4a;
      --accent-primary: #e94560;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      padding: 20px;
    }

    .report-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .report-header {
      background: var(--bg-secondary);
      padding: 24px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      margin-bottom: 24px;
    }

    .report-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--text-primary);
    }

    .report-meta {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
    }

    .report-meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .report-meta-label {
      font-size: 12px;
      color: var(--text-muted);
    }

    .report-meta-value {
      font-size: 14px;
      color: var(--text-secondary);
    }

    .report-stats {
      display: flex;
      gap: 16px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color);
    }

    .stat-item {
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
    }

    .stat-item.added {
      background: var(--diff-added-bg);
      color: var(--diff-added-line);
    }

    .stat-item.removed {
      background: var(--diff-removed-bg);
      color: var(--diff-removed-line);
    }

    .stat-item.modified {
      background: var(--diff-modified-bg);
      color: var(--diff-modified-line);
    }

    .files-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .file-panel {
      background: var(--bg-secondary);
      border-radius: 12px;
      border: 1px solid var(--border-color);
      overflow: hidden;
    }

    .file-header {
      background: var(--bg-tertiary);
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .file-badge {
      width: 24px;
      height: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      color: white;
    }

    .file-badge.left {
      background: linear-gradient(135deg, #f85149 0%, #c93632 100%);
    }

    .file-badge.right {
      background: linear-gradient(135deg, #2ea043 0%, #238636 100%);
    }

    .file-name {
      font-size: 14px;
      color: var(--text-primary);
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-path {
      font-size: 12px;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }

    .file-content {
      padding: 16px;
      font-family: 'JetBrains Mono', 'Consolas', monospace;
      font-size: 13px;
      line-height: 1.6;
      max-height: 600px;
      overflow-y: auto;
    }

    .diff-line {
      display: flex;
      padding: 2px 0;
      white-space: pre;
    }

    .line-number {
      width: 50px;
      color: var(--text-muted);
      text-align: right;
      padding-right: 12px;
      user-select: none;
      opacity: 0.5;
    }

    .line-content {
      flex: 1;
      padding: 0 8px;
    }

    .diff-line.added {
      background: var(--diff-added-bg);
    }

    .diff-line.added .line-content {
      color: var(--diff-added-line);
    }

    .diff-line.removed {
      background: var(--diff-removed-bg);
    }

    .diff-line.removed .line-content {
      color: var(--diff-removed-line);
    }

    .diff-line.equal {
      background: transparent;
    }

    .diff-line.equal .line-content {
      color: var(--text-secondary);
    }

    .diff-indicator {
      width: 20px;
      text-align: center;
      font-weight: 600;
    }

    .diff-indicator.added {
      color: var(--diff-added-line);
    }

    .diff-indicator.removed {
      color: var(--diff-removed-line);
    }

    .report-footer {
      margin-top: 24px;
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 12px;
      border: 1px solid var(--border-color);
      text-align: center;
      color: var(--text-muted);
      font-size: 12px;
    }

    @media (max-width: 768px) {
      .files-section {
        grid-template-columns: 1fr;
      }

      .report-meta {
        flex-direction: column;
        gap: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1 class="report-title">Diff Comparison Report</h1>
      <div class="report-meta">
        <div class="report-meta-item">
          <span class="report-meta-label">Left File</span>
          <span class="report-meta-value">${leftFileName}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">Right File</span>
          <span class="report-meta-value">${rightFileName}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">Generated</span>
          <span class="report-meta-value">${timestamp}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">Language</span>
          <span class="report-meta-value">${leftFile.language || 'plaintext'}</span>
        </div>
      </div>
      <div class="report-stats">
        <span class="stat-item added">+${diffStats.added} added</span>
        <span class="stat-item removed">-${diffStats.removed} removed</span>
        <span class="stat-item modified">~${diffStats.modified} modified</span>
      </div>
    </div>

    <div class="files-section">
      <div class="file-panel">
        <div class="file-header">
          <span class="file-badge left">L</span>
          <span class="file-name">${leftFileName}</span>
          <span class="file-path">${leftFile.path}</span>
        </div>
        <div class="file-content">
          ${diffHtml.left}
        </div>
      </div>

      <div class="file-panel">
        <div class="file-header">
          <span class="file-badge right">R</span>
          <span class="file-name">${rightFileName}</span>
          <span class="file-path">${rightFile.path}</span>
        </div>
        <div class="file-content">
          ${diffHtml.right}
        </div>
      </div>
    </div>

    <div class="report-footer">
      Generated by Beyond Compare Clone • ${timestamp}
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function generateDiffHtml(
  leftLines: string[],
  rightLines: string[],
  showLineNumbers: boolean
): { left: string; right: string } {
  // Simple line-by-line comparison
  const leftHtml: string[] = []
  const rightHtml: string[] = []

  const leftSet = new Set(leftLines)
  const rightSet = new Set(rightLines)

  for (let i = 0; i < leftLines.length; i++) {
    const line = leftLines[i]
    const rightHasLine = rightSet.has(line)
    const rightHasSameIndex = i < rightLines.length && rightLines[i] === line

    const status = rightHasSameIndex ? 'equal' : (rightHasLine ? 'modified' : 'removed')
    const indicator = status === 'removed' ? '-' : (status === 'modified' ? '~' : ' ')
    const lineNum = showLineNumbers ? `<span class="line-number">${i + 1}</span>` : ''

    leftHtml.push(`<div class="diff-line ${status}">
      ${lineNum}
      <span class="diff-indicator ${status}">${indicator}</span>
      <span class="line-content">${escapeHtml(line)}</span>
    </div>`)
  }

  for (let i = 0; i < rightLines.length; i++) {
    const line = rightLines[i]
    const leftHasLine = leftSet.has(line)
    const leftHasSameIndex = i < leftLines.length && leftLines[i] === line

    const status = leftHasSameIndex ? 'equal' : (leftHasLine ? 'modified' : 'added')
    const indicator = status === 'added' ? '+' : (status === 'modified' ? '~' : ' ')
    const lineNum = showLineNumbers ? `<span class="line-number">${i + 1}</span>` : ''

    rightHtml.push(`<div class="diff-line ${status}">
      ${lineNum}
      <span class="diff-indicator ${status}">${indicator}</span>
      <span class="line-content">${escapeHtml(line)}</span>
    </div>`)
  }

  return {
    left: leftHtml.join('\n'),
    right: rightHtml.join('\n'),
  }
}

export async function downloadReport(htmlContent: string, defaultFileName: string): Promise<boolean> {
  try {
    // Use Tauri save dialog
    const filePath = await save({
      defaultPath: defaultFileName,
      filters: [
        { name: 'HTML', extensions: ['html'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      title: 'Save Diff Report',
    })

    if (filePath) {
      await writeTextFile(filePath, htmlContent)
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to save report:', error)
    throw error
  }
}

export interface BinaryReportOptions {
  leftFile: FileContent
  rightFile: FileContent
  mode: string
}

// Get image dimensions from file
async function getImageDimensions(path: string): Promise<{ width: number; height: number } | null> {
  try {
    const { readFile } = await import('@tauri-apps/plugin-fs')
    const fileData = await readFile(path)
    const base64 = arrayBufferToBase64(fileData)
    const mimeType = getMimeType(path)
    const dataUrl = `data:${mimeType};base64,${base64}`

    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        resolve({ width: img.width, height: img.height })
      }
      img.onerror = () => {
        resolve(null)
      }
      img.src = dataUrl
    })
  } catch {
    return null
  }
}

function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function getMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const mimeTypes: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'tiff': 'image/tiff',
    'tif': 'image/tiff',
  }
  return mimeTypes[ext] || 'image/png'
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + ' KB'
  }
  return bytes + ' bytes'
}

export async function generateBinaryReport(options: BinaryReportOptions): Promise<string> {
  const { leftFile, rightFile, mode } = options
  const timestamp = new Date().toLocaleString()
  const leftFileName = leftFile.path.split(/[/\\]/).pop() || leftFile.path
  const rightFileName = rightFile.path.split(/[/\\]/).pop() || rightFile.path

  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1)

  // Get file sizes and image dimensions if applicable
  let leftSize = 0
  let rightSize = 0
  let leftDimensions: { width: number; height: number } | null = null
  let rightDimensions: { width: number; height: number } | null = null

  try {
    const { readFile } = await import('@tauri-apps/plugin-fs')
    const leftData = await readFile(leftFile.path)
    leftSize = leftData.length
    const rightData = await readFile(rightFile.path)
    rightSize = rightData.length

    if (mode === 'image') {
      leftDimensions = await getImageDimensions(leftFile.path)
      rightDimensions = await getImageDimensions(rightFile.path)
    }
  } catch (e) {
    console.warn('Failed to get file info:', e)
  }

  // Generate comparison conclusion
  const conclusions: string[] = []
  const differences: string[] = []

  if (leftSize !== rightSize) {
    differences.push(`文件大小不同: ${formatFileSize(leftSize)} vs ${formatFileSize(rightSize)} (差异: ${formatFileSize(Math.abs(leftSize - rightSize))})`)
  } else {
    conclusions.push('✅ 文件大小相同')
  }

  if (mode === 'image' && leftDimensions && rightDimensions) {
    if (leftDimensions.width !== rightDimensions.width || leftDimensions.height !== rightDimensions.height) {
      differences.push(`图像尺寸不同: ${leftDimensions.width}×${leftDimensions.height} vs ${rightDimensions.width}×${rightDimensions.height}`)
    } else {
      conclusions.push('✅ 图像尺寸相同')
    }
  }

  if (leftFileName === rightFileName) {
    conclusions.push('✅ 文件名相同')
  } else {
    differences.push(`文件名不同`)
  }

  const hasDifferences = differences.length > 0
  const overallConclusion = hasDifferences
    ? `⚠️ 发现 ${differences.length} 处差异`
    : '✅ 文件完全相同'

  // Generate difference indicators
  const differenceHtml = differences.map(d =>
    `<div class="difference-item"><span class="diff-icon">⚠️</span><span>${d}</span></div>`
  ).join('\n')

  const conclusionHtml = conclusions.map(c =>
    `<div class="conclusion-item"><span>${c}</span></div>`
  ).join('\n')

  // Build comparison table for image mode
  const comparisonTableHtml = mode === 'image' ? `
    <div class="comparison-table">
      <div class="comparison-row header">
        <div class="comparison-cell">属性</div>
        <div class="comparison-cell left-col">左侧文件</div>
        <div class="comparison-cell right-col">右侧文件</div>
        <div class="comparison-cell status-col">状态</div>
      </div>
      <div class="comparison-row">
        <div class="comparison-cell">文件名</div>
        <div class="comparison-cell left-col">${leftFileName}</div>
        <div class="comparison-cell right-col">${rightFileName}</div>
        <div class="comparison-cell status-col">${leftFileName === rightFileName ? '✅ 相同' : '⚠️ 不同'}</div>
      </div>
      <div class="comparison-row">
        <div class="comparison-cell">文件大小</div>
        <div class="comparison-cell left-col">${formatFileSize(leftSize)}</div>
        <div class="comparison-cell right-col">${formatFileSize(rightSize)}</div>
        <div class="comparison-cell status-col">${leftSize === rightSize ? '✅ 相同' : '⚠️ 不同'}</div>
      </div>
      ${leftDimensions && rightDimensions ? `
      <div class="comparison-row">
        <div class="comparison-cell">图像尺寸</div>
        <div class="comparison-cell left-col">${leftDimensions.width} × ${leftDimensions.height}</div>
        <div class="comparison-cell right-col">${rightDimensions.width} × ${rightDimensions.height}</div>
        <div class="comparison-cell status-col">${leftDimensions.width === rightDimensions.width && leftDimensions.height === rightDimensions.height ? '✅ 相同' : '⚠️ 不同'}</div>
      </div>
      ` : ''}
      <div class="comparison-row">
        <div class="comparison-cell">文件路径</div>
        <div class="comparison-cell left-col path-cell">${leftFile.path}</div>
        <div class="comparison-cell right-col path-cell">${rightFile.path}</div>
        <div class="comparison-cell status-col">-</div>
      </div>
    </div>
  ` : `
    <div class="comparison-table">
      <div class="comparison-row header">
        <div class="comparison-cell">属性</div>
        <div class="comparison-cell left-col">左侧文件</div>
        <div class="comparison-cell right-col">右侧文件</div>
        <div class="comparison-cell status-col">状态</div>
      </div>
      <div class="comparison-row">
        <div class="comparison-cell">文件名</div>
        <div class="comparison-cell left-col">${leftFileName}</div>
        <div class="comparison-cell right-col">${rightFileName}</div>
        <div class="comparison-cell status-col">${leftFileName === rightFileName ? '✅ 相同' : '⚠️ 不同'}</div>
      </div>
      <div class="comparison-row">
        <div class="comparison-cell">文件大小</div>
        <div class="comparison-cell left-col">${formatFileSize(leftSize)}</div>
        <div class="comparison-cell right-col">${formatFileSize(rightSize)}</div>
        <div class="comparison-cell status-col">${leftSize === rightSize ? '✅ 相同' : '⚠️ 不同'}</div>
      </div>
      <div class="comparison-row">
        <div class="comparison-cell">文件路径</div>
        <div class="comparison-cell left-col path-cell">${leftFile.path}</div>
        <div class="comparison-cell right-col path-cell">${rightFile.path}</div>
        <div class="comparison-cell status-col">-</div>
      </div>
    </div>
  `

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${modeLabel} Comparison Report: ${leftFileName} vs ${rightFileName}</title>
  <style>
    :root {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-tertiary: #0f3460;
      --text-primary: #eaeaea;
      --text-secondary: #a0a0a0;
      --text-muted: #6b6b6b;
      --border-color: #2a2a4a;
      --success-color: #2ea043;
      --warning-color: #f85149;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      padding: 20px;
    }
    .report-container { max-width: 900px; margin: 0 auto; }
    .report-header {
      background: var(--bg-secondary);
      padding: 24px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      margin-bottom: 24px;
    }
    .report-title { font-size: 24px; margin-bottom: 16px; }
    .report-meta { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 16px; }
    .report-meta-item { display: flex; flex-direction: column; gap: 4px; }
    .report-meta-label { font-size: 12px; color: var(--text-secondary); }
    .report-meta-value { font-size: 14px; }

    /* Overall Conclusion Banner */
    .conclusion-banner {
      padding: 16px 20px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .conclusion-banner.has-differences {
      background: rgba(248, 81, 73, 0.15);
      border: 1px solid var(--warning-color);
      color: var(--warning-color);
    }
    .conclusion-banner.no-differences {
      background: rgba(46, 160, 67, 0.15);
      border: 1px solid var(--success-color);
      color: var(--success-color);
    }

    /* Differences and Conclusions Section */
    .findings-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .findings-card {
      background: var(--bg-secondary);
      padding: 16px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
    }
    .findings-card-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--text-secondary);
    }
    .difference-item, .conclusion-item {
      padding: 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .diff-icon { font-size: 16px; }

    /* Comparison Table */
    .comparison-table {
      background: var(--bg-secondary);
      border-radius: 12px;
      border: 1px solid var(--border-color);
      overflow: hidden;
      margin-bottom: 24px;
    }
    .comparison-row {
      display: grid;
      grid-template-columns: 120px 1fr 1fr 100px;
      border-bottom: 1px solid var(--border-color);
    }
    .comparison-row:last-child { border-bottom: none; }
    .comparison-row.header {
      background: var(--bg-tertiary);
      font-weight: 600;
    }
    .comparison-cell {
      padding: 12px 16px;
      font-size: 14px;
    }
    .comparison-cell.status-col {
      text-align: center;
      font-weight: 500;
    }
    .path-cell {
      font-size: 12px;
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .left-col { border-right: 1px solid var(--border-color); }

    /* Stats Summary */
    .stats-summary {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--bg-secondary);
      padding: 16px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      flex: 1;
      text-align: center;
    }
    .stat-card-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
    .stat-card-value { font-size: 18px; font-weight: 600; }

    .report-footer {
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 12px;
      text-align: center;
      font-size: 12px;
      color: var(--text-secondary);
    }

    @media (max-width: 768px) {
      .findings-section { grid-template-columns: 1fr; }
      .comparison-row { grid-template-columns: 1fr; }
      .comparison-cell { border-bottom: 1px solid var(--border-color); }
      .comparison-row:last-child .comparison-cell:last-child { border-bottom: none; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1 class="report-title">${modeLabel} Comparison Report</h1>
      <div class="report-meta">
        <div class="report-meta-item">
          <span class="report-meta-label">左侧文件</span>
          <span class="report-meta-value">${leftFileName}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">右侧文件</span>
          <span class="report-meta-value">${rightFileName}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">对比模式</span>
          <span class="report-meta-value">${modeLabel}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">生成时间</span>
          <span class="report-meta-value">${timestamp}</span>
        </div>
      </div>
    </div>

    <!-- Overall Conclusion Banner -->
    <div class="conclusion-banner ${hasDifferences ? 'has-differences' : 'no-differences'}">
      <span>${hasDifferences ? '⚠️' : '✅'}</span>
      <span>${overallConclusion}</span>
    </div>

    <!-- Stats Summary -->
    <div class="stats-summary">
      <div class="stat-card">
        <div class="stat-card-label">左侧文件大小</div>
        <div class="stat-card-value">${formatFileSize(leftSize)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-label">右侧文件大小</div>
        <div class="stat-card-value">${formatFileSize(rightSize)}</div>
      </div>
      ${mode === 'image' && leftDimensions ? `
      <div class="stat-card">
        <div class="stat-card-label">左侧图像尺寸</div>
        <div class="stat-card-value">${leftDimensions.width}×${leftDimensions.height}</div>
      </div>
      ` : ''}
      ${mode === 'image' && rightDimensions ? `
      <div class="stat-card">
        <div class="stat-card-label">右侧图像尺寸</div>
        <div class="stat-card-value">${rightDimensions.width}×${rightDimensions.height}</div>
      </div>
      ` : ''}
    </div>

    <!-- Findings Section -->
    <div class="findings-section">
      <div class="findings-card">
        <div class="findings-card-title">⚠️ 发现的差异</div>
        ${differences.length > 0 ? differenceHtml : '<div class="difference-item">无差异</div>'}
      </div>
      <div class="findings-card">
        <div class="findings-card-title">✅ 相同之处</div>
        ${conclusions.length > 0 ? conclusionHtml : '<div class="conclusion-item">无相同点</div>'}
      </div>
    </div>

    <!-- Detailed Comparison Table -->
    ${comparisonTableHtml}

    <div class="report-footer">
      Generated by DiffLens • ${timestamp}
    </div>
  </div>
</body>
</html>`
}

// Folder comparison report
export interface FolderReportOptions {
  leftFolder: { path: string }
  rightFolder: { path: string }
  stats: {
    equal: number
    added: number
    removed: number
    modified: number
  } | null
  filters?: string[]
}

export function generateFolderReport(options: FolderReportOptions): string {
  const { leftFolder, rightFolder, stats, filters } = options
  const timestamp = new Date().toLocaleString()
  const leftName = leftFolder.path.split(/[/\\]/).pop() || leftFolder.path
  const rightName = rightFolder.path.split(/[/\\]/).pop() || rightFolder.path

  const equalCount = stats?.equal || 0
  const addedCount = stats?.added || 0
  const removedCount = stats?.removed || 0
  const modifiedCount = stats?.modified || 0
  const totalCount = equalCount + addedCount + removedCount + modifiedCount

  const hasDifferences = addedCount > 0 || removedCount > 0 || modifiedCount > 0
  const overallConclusion = hasDifferences
    ? `⚠️ 发现 ${addedCount + removedCount + modifiedCount} 处差异`
    : '✅ 文件夹内容完全相同'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Folder Comparison Report: ${leftName} vs ${rightName}</title>
  <style>
    :root {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-tertiary: #0f3460;
      --text-primary: #eaeaea;
      --text-secondary: #a0a0a0;
      --text-muted: #6b6b6b;
      --border-color: #2a2a4a;
      --success-color: #2ea043;
      --warning-color: #f85149;
      --modified-color: #d29922;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      padding: 20px;
    }
    .report-container { max-width: 900px; margin: 0 auto; }
    .report-header {
      background: var(--bg-secondary);
      padding: 24px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      margin-bottom: 24px;
    }
    .report-title { font-size: 24px; margin-bottom: 16px; }
    .report-meta { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 16px; }
    .report-meta-item { display: flex; flex-direction: column; gap: 4px; }
    .report-meta-label { font-size: 12px; color: var(--text-secondary); }
    .report-meta-value { font-size: 14px; }

    .conclusion-banner {
      padding: 16px 20px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .conclusion-banner.has-differences {
      background: rgba(248, 81, 73, 0.15);
      border: 1px solid var(--warning-color);
      color: var(--warning-color);
    }
    .conclusion-banner.no-differences {
      background: rgba(46, 160, 67, 0.15);
      border: 1px solid var(--success-color);
      color: var(--success-color);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--bg-secondary);
      padding: 16px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      text-align: center;
    }
    .stat-card.equal { border-color: var(--success-color); }
    .stat-card.added { border-color: var(--success-color); }
    .stat-card.removed { border-color: var(--warning-color); }
    .stat-card.modified { border-color: var(--modified-color); }
    .stat-card-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
    .stat-card-value { font-size: 24px; font-weight: 600; }
    .stat-card.equal .stat-card-value { color: var(--success-color); }
    .stat-card.added .stat-card-value { color: var(--success-color); }
    .stat-card.removed .stat-card-value { color: var(--warning-color); }
    .stat-card.modified .stat-card-value { color: var(--modified-color); }

    .info-section {
      background: var(--bg-secondary);
      padding: 24px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      margin-bottom: 24px;
    }
    .info-row {
      display: grid;
      grid-template-columns: 120px 1fr 1fr;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-color);
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-size: 14px; color: var(--text-secondary); }
    .info-value { font-size: 14px; }
    .info-value.path { font-size: 12px; color: var(--text-muted); }

    .filters-section {
      background: var(--bg-secondary);
      padding: 16px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      margin-bottom: 24px;
    }
    .filters-title { font-size: 14px; margin-bottom: 8px; }
    .filter-tag {
      display: inline-block;
      padding: 4px 8px;
      background: var(--bg-tertiary);
      border-radius: 4px;
      font-size: 12px;
      margin: 4px;
    }

    .report-footer {
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 12px;
      text-align: center;
      font-size: 12px;
      color: var(--text-secondary);
    }

    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1 class="report-title">Folder Comparison Report</h1>
      <div class="report-meta">
        <div class="report-meta-item">
          <span class="report-meta-label">左侧文件夹</span>
          <span class="report-meta-value">${leftName}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">右侧文件夹</span>
          <span class="report-meta-value">${rightName}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">总文件数</span>
          <span class="report-meta-value">${totalCount}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">生成时间</span>
          <span class="report-meta-value">${timestamp}</span>
        </div>
      </div>
    </div>

    <div class="conclusion-banner ${hasDifferences ? 'has-differences' : 'no-differences'}">
      <span>${hasDifferences ? '⚠️' : '✅'}</span>
      <span>${overallConclusion}</span>
    </div>

    <div class="stats-grid">
      <div class="stat-card equal">
        <div class="stat-card-label">相同文件</div>
        <div class="stat-card-value">${equalCount}</div>
      </div>
      <div class="stat-card added">
        <div class="stat-card-label">新增文件</div>
        <div class="stat-card-value">+${addedCount}</div>
      </div>
      <div class="stat-card removed">
        <div class="stat-card-label">删除文件</div>
        <div class="stat-card-value">-${removedCount}</div>
      </div>
      <div class="stat-card modified">
        <div class="stat-card-label">修改文件</div>
        <div class="stat-card-value">~${modifiedCount}</div>
      </div>
    </div>

    <div class="info-section">
      <div class="info-row">
        <div class="info-label">左侧路径</div>
        <div class="info-value path">${leftFolder.path}</div>
      </div>
      <div class="info-row">
        <div class="info-label">右侧路径</div>
        <div class="info-value path">${rightFolder.path}</div>
      </div>
    </div>

    ${filters && filters.length > 0 ? `
    <div class="filters-section">
      <div class="filters-title">筛选条件</div>
      ${filters.map(f => '<span class="filter-tag">' + f + '</span>').join('')}
    </div>
    ` : ''}

    <div class="report-footer">
      Generated by DiffLens • ${timestamp}
    </div>
  </div>
</body>
</html>`
}

// Archive comparison report
export interface ArchiveReportOptions {
  leftFile: FileContent
  rightFile: FileContent
  leftEntries?: { name: string; size: number; modified?: string }[]
  rightEntries?: { name: string; size: number; modified?: string }[]
}

export async function generateArchiveReport(options: ArchiveReportOptions): Promise<string> {
  const { leftFile, rightFile, leftEntries, rightEntries } = options
  const timestamp = new Date().toLocaleString()
  const leftFileName = leftFile.path.split(/[/\\]/).pop() || leftFile.path
  const rightFileName = rightFile.path.split(/[/\\]/).pop() || rightFile.path

  // Analyze archive entries
  const leftEntryMap = new Map(leftEntries?.map(e => [e.name, e]) || [])
  const rightEntryMap = new Map(rightEntries?.map(e => [e.name, e]) || [])

  const addedEntries: string[] = []
  const removedEntries: string[] = []
  const modifiedEntries: string[] = []
  const equalEntries: string[] = []

  // Compare entries
  for (const [name, entry] of rightEntryMap) {
    if (!leftEntryMap.has(name)) {
      addedEntries.push(name)
    } else {
      const leftEntry = leftEntryMap.get(name)
      if (leftEntry && leftEntry.size !== entry.size) {
        modifiedEntries.push(name)
      } else {
        equalEntries.push(name)
      }
    }
  }

  for (const [name] of leftEntryMap) {
    if (!rightEntryMap.has(name)) {
      removedEntries.push(name)
    }
  }

  const totalLeft = leftEntries?.length || 0
  const totalRight = rightEntries?.length || 0
  const hasDifferences = addedEntries.length > 0 || removedEntries.length > 0 || modifiedEntries.length > 0

  const overallConclusion = hasDifferences
    ? `⚠️ 发现 ${addedEntries.length + removedEntries.length + modifiedEntries.length} 处差异`
    : '✅ 压缩包内容完全相同'

  const addedHtml = addedEntries.map(e =>
    `<div class="entry-item added"><span class="entry-status">+</span><span class="entry-name">${e}</span></div>`
  ).join('')

  const removedHtml = removedEntries.map(e =>
    `<div class="entry-item removed"><span class="entry-status">-</span><span class="entry-name">${e}</span></div>`
  ).join('')

  const modifiedHtml = modifiedEntries.map(e =>
    `<div class="entry-item modified"><span class="entry-status">~</span><span class="entry-name">${e}</span></div>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Archive Comparison Report: ${leftFileName} vs ${rightFileName}</title>
  <style>
    :root {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-tertiary: #0f3460;
      --text-primary: #eaeaea;
      --text-secondary: #a0a0a0;
      --text-muted: #6b6b6b;
      --border-color: #2a2a4a;
      --success-color: #2ea043;
      --warning-color: #f85149;
      --modified-color: #d29922;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      padding: 20px;
    }
    .report-container { max-width: 900px; margin: 0 auto; }
    .report-header {
      background: var(--bg-secondary);
      padding: 24px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      margin-bottom: 24px;
    }
    .report-title { font-size: 24px; margin-bottom: 16px; }
    .report-meta { display: flex; gap: 24px; flex-wrap: wrap; }
    .report-meta-item { display: flex; flex-direction: column; gap: 4px; }
    .report-meta-label { font-size: 12px; color: var(--text-muted); }
    .report-meta-value { font-size: 14px; }

    .conclusion-banner {
      padding: 16px 20px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .conclusion-banner.has-differences {
      background: rgba(248, 81, 73, 0.15);
      border: 1px solid var(--warning-color);
      color: var(--warning-color);
    }
    .conclusion-banner.no-differences {
      background: rgba(46, 160, 67, 0.15);
      border: 1px solid var(--success-color);
      color: var(--success-color);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--bg-secondary);
      padding: 16px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      text-align: center;
    }
    .stat-card-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
    .stat-card-value { font-size: 24px; font-weight: 600; }
    .stat-card.equal .stat-card-value { color: var(--success-color); }
    .stat-card.added .stat-card-value { color: var(--success-color); }
    .stat-card.removed .stat-card-value { color: var(--warning-color); }
    .stat-card.modified .stat-card-value { color: var(--modified-color); }

    .entries-section {
      background: var(--bg-secondary);
      padding: 16px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      margin-bottom: 24px;
    }
    .entries-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border-color);
    }
    .entry-list {
      max-height: 400px;
      overflow-y: auto;
    }
    .entry-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 8px;
      font-size: 13px;
    }
    .entry-status {
      width: 20px;
      font-weight: 600;
    }
    .entry-item.added .entry-status { color: var(--success-color); }
    .entry-item.removed .entry-status { color: var(--warning-color); }
    .entry-item.modified .entry-status { color: var(--modified-color); }
    .entry-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .report-footer {
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 12px;
      text-align: center;
      font-size: 12px;
      color: var(--text-secondary);
    }

    @media (max-width: 768px) {
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1 class="report-title">Archive Comparison Report</h1>
      <div class="report-meta">
        <div class="report-meta-item">
          <span class="report-meta-label">左侧压缩包</span>
          <span class="report-meta-value">${leftFileName}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">右侧压缩包</span>
          <span class="report-meta-value">${rightFileName}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">左侧文件数</span>
          <span class="report-meta-value">${totalLeft}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">右侧文件数</span>
          <span class="report-meta-value">${totalRight}</span>
        </div>
      </div>
    </div>

    <div class="conclusion-banner ${hasDifferences ? 'has-differences' : 'no-differences'}">
      <span>${hasDifferences ? '⚠️' : '✅'}</span>
      <span>${overallConclusion}</span>
    </div>

    <div class="stats-grid">
      <div class="stat-card equal">
        <div class="stat-card-label">相同文件</div>
        <div class="stat-card-value">${equalEntries.length}</div>
      </div>
      <div class="stat-card added">
        <div class="stat-card-label">新增文件</div>
        <div class="stat-card-value">+${addedEntries.length}</div>
      </div>
      <div class="stat-card removed">
        <div class="stat-card-label">删除文件</div>
        <div class="stat-card-value">-${removedEntries.length}</div>
      </div>
      <div class="stat-card modified">
        <div class="stat-card-label">大小不同</div>
        <div class="stat-card-value">~${modifiedEntries.length}</div>
      </div>
    </div>

    ${addedEntries.length > 0 ? `
    <div class="entries-section">
      <div class="entries-title">✅ 新增文件 (右侧独有)</div>
      <div class="entry-list">${addedHtml}</div>
    </div>
    ` : ''}

    ${removedEntries.length > 0 ? `
    <div class="entries-section">
      <div class="entries-title">❌ 删除文件 (左侧独有)</div>
      <div class="entry-list">${removedHtml}</div>
    </div>
    ` : ''}

    ${modifiedEntries.length > 0 ? `
    <div class="entries-section">
      <div class="entries-title">📝 大小不同的文件</div>
      <div class="entry-list">${modifiedHtml}</div>
    </div>
    ` : ''}

    <div class="report-footer">
      Generated by DiffLens • ${timestamp}
    </div>
  </div>
</body>
</html>`
}

// Audio comparison report
export interface AudioReportOptions {
  leftFile: FileContent
  rightFile: FileContent
  leftDuration?: number
  rightDuration?: number
  leftSampleRate?: number
  rightSampleRate?: number
  leftChannels?: number
  rightChannels?: number
}

export async function generateAudioReport(options: AudioReportOptions): Promise<string> {
  const { leftFile, rightFile, leftDuration, rightDuration, leftSampleRate, rightSampleRate, leftChannels, rightChannels } = options
  const timestamp = new Date().toLocaleString()
  const leftFileName = leftFile.path.split(/[/\\]/).pop() || leftFile.path
  const rightFileName = rightFile.path.split(/[/\\]/).pop() || rightFile.path

  const formatDuration = (seconds: number | undefined): string => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatSampleRate = (rate: number | undefined): string => {
    if (!rate) return '-'
    return `${(rate / 1000).toFixed(1)} kHz`
  }

  const differences: string[] = []
  const conclusions: string[] = []

  if (leftDuration !== rightDuration) {
    differences.push(`时长不同: ${formatDuration(leftDuration)} vs ${formatDuration(rightDuration)}`)
  } else {
    conclusions.push('✅ 时长相同')
  }

  if (leftSampleRate !== rightSampleRate) {
    differences.push(`采样率不同: ${formatSampleRate(leftSampleRate)} vs ${formatSampleRate(rightSampleRate)}`)
  } else {
    conclusions.push('✅ 采样率相同')
  }

  if (leftChannels !== rightChannels) {
    differences.push(`声道数不同: ${leftChannels || '-'} vs ${rightChannels || '-'}`)
  } else {
    conclusions.push('✅ 声道数相同')
  }

  const hasDifferences = differences.length > 0
  const overallConclusion = hasDifferences
    ? `⚠️ 发现 ${differences.length} 处差异`
    : '✅ 音频属性完全相同'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Audio Comparison Report: ${leftFileName} vs ${rightFileName}</title>
  <style>
    :root {
      --bg-primary: #1a1a2e;
      --bg-secondary: #16213e;
      --bg-tertiary: #0f3460;
      --text-primary: #eaeaea;
      --text-secondary: #a0a0a0;
      --text-muted: #6b6b6b;
      --border-color: #2a2a4a;
      --success-color: #2ea043;
      --warning-color: #f85149;
      --modified-color: #d29922;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      padding: 20px;
    }
    .report-container { max-width: 900px; margin: 0 auto; }
    .report-header {
      background: var(--bg-secondary);
      padding: 24px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      margin-bottom: 24px;
    }
    .report-title { font-size: 24px; margin-bottom: 16px; }
    .report-meta { display: flex; gap: 24px; flex-wrap: wrap; }
    .report-meta-item { display: flex; flex-direction: column; gap: 4px; }
    .report-meta-label { font-size: 12px; color: var(--text-muted); }
    .report-meta-value { font-size: 14px; }

    .conclusion-banner {
      padding: 16px 20px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 24px;
    }
    .conclusion-banner.has-differences {
      background: rgba(248, 81, 73, 0.15);
      border: 1px solid var(--warning-color);
      color: var(--warning-color);
    }
    .conclusion-banner.no-differences {
      background: rgba(46, 160, 67, 0.15);
      border: 1px solid var(--success-color);
      color: var(--success-color);
    }

    .comparison-table {
      background: var(--bg-secondary);
      border-radius: 12px;
      border: 1px solid var(--border-color);
      margin-bottom: 24px;
    }
    .comparison-row {
      display: grid;
      grid-template-columns: 120px 1fr 1fr 80px;
      border-bottom: 1px solid var(--border-color);
    }
    .comparison-row:last-child { border-bottom: none; }
    .comparison-row.header {
      background: var(--bg-tertiary);
      font-weight: 600;
    }
    .comparison-cell {
      padding: 12px 16px;
      font-size: 14px;
    }
    .comparison-cell.status {
      text-align: center;
      font-weight: 500;
    }
    .comparison-cell.same { color: var(--success-color); }
    .comparison-cell.diff { color: var(--warning-color); }

    .findings-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .findings-card {
      background: var(--bg-secondary);
      padding: 16px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
    }
    .findings-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
    .finding-item { padding: 6px 0; font-size: 13px; }

    .report-footer {
      padding: 16px;
      background: var(--bg-secondary);
      border-radius: 12px;
      text-align: center;
      font-size: 12px;
      color: var(--text-secondary);
    }

    @media (max-width: 768px) {
      .findings-section { grid-template-columns: 1fr; }
      .comparison-row { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="report-header">
      <h1 class="report-title">Audio Comparison Report</h1>
      <div class="report-meta">
        <div class="report-meta-item">
          <span class="report-meta-label">左侧音频</span>
          <span class="report-meta-value">${leftFileName}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">右侧音频</span>
          <span class="report-meta-value">${rightFileName}</span>
        </div>
        <div class="report-meta-item">
          <span class="report-meta-label">生成时间</span>
          <span class="report-meta-value">${timestamp}</span>
        </div>
      </div>
    </div>

    <div class="conclusion-banner ${hasDifferences ? 'has-differences' : 'no-differences'}">
      ${overallConclusion}
    </div>

    <div class="comparison-table">
      <div class="comparison-row header">
        <div class="comparison-cell">属性</div>
        <div class="comparison-cell">左侧</div>
        <div class="comparison-cell">右侧</div>
        <div class="comparison-cell status">状态</div>
      </div>
      <div class="comparison-row">
        <div class="comparison-cell">时长</div>
        <div class="comparison-cell">${formatDuration(leftDuration)}</div>
        <div class="comparison-cell">${formatDuration(rightDuration)}</div>
        <div class="comparison-cell status ${leftDuration === rightDuration ? 'same' : 'diff'}">${leftDuration === rightDuration ? '✅' : '⚠️'}</div>
      </div>
      <div class="comparison-row">
        <div class="comparison-cell">采样率</div>
        <div class="comparison-cell">${formatSampleRate(leftSampleRate)}</div>
        <div class="comparison-cell">${formatSampleRate(rightSampleRate)}</div>
        <div class="comparison-cell status ${leftSampleRate === rightSampleRate ? 'same' : 'diff'}">${leftSampleRate === rightSampleRate ? '✅' : '⚠️'}</div>
      </div>
      <div class="comparison-row">
        <div class="comparison-cell">声道数</div>
        <div class="comparison-cell">${leftChannels || '-'}</div>
        <div class="comparison-cell">${rightChannels || '-'}</div>
        <div class="comparison-cell status ${leftChannels === rightChannels ? 'same' : 'diff'}">${leftChannels === rightChannels ? '✅' : '⚠️'}</div>
      </div>
    </div>

    <div class="findings-section">
      <div class="findings-card">
        <div class="findings-title">⚠️ 发现的差异</div>
        ${differences.length > 0 ? differences.map(d => `<div class="finding-item">${d}</div>`).join('') : '<div class="finding-item">无差异</div>'}
      </div>
      <div class="findings-card">
        <div class="findings-title">✅ 相同之处</div>
        ${conclusions.length > 0 ? conclusions.map(c => `<div class="finding-item">${c}</div>`).join('') : '<div class="finding-item">无相同点</div>'}
      </div>
    </div>

    <div class="report-footer">
      Generated by DiffLens • ${timestamp}
    </div>
  </div>
</body>
</html>`
}