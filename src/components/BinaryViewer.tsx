import { useState, useEffect, useMemo, useRef } from 'react'
import { readFile } from '@tauri-apps/plugin-fs'

interface BinaryViewerProps {
  leftPath: string | null
  rightPath: string | null
}

interface BinaryData {
  path: string
  data: Uint8Array
  size: number
}

interface DiffByte {
  offset: number
  leftByte: number
  rightByte: number
}

function formatHex(byte: number): string {
  return byte.toString(16).toUpperCase().padStart(2, '0')
}

function formatAscii(byte: number): string {
  if (byte >= 32 && byte <= 126) {
    return String.fromCharCode(byte)
  }
  return '.'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function BinaryViewer({ leftPath, rightPath }: BinaryViewerProps) {
  const [leftData, setLeftData] = useState<BinaryData | null>(null)
  const [rightData, setRightData] = useState<BinaryData | null>(null)
  const [offset, setOffset] = useState(0)
  const [bytesPerRow] = useState(16)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [diffIndex, setDiffIndex] = useState(0)
  const [syncScroll, setSyncScroll] = useState(true)

  const leftScrollRef = useRef<HTMLDivElement>(null)
  const rightScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        if (leftPath) {
          const data = await readFile(leftPath)
          setLeftData({ path: leftPath, data: new Uint8Array(data), size: data.length })
        } else {
          setLeftData(null)
        }

        if (rightPath) {
          const data = await readFile(rightPath)
          setRightData({ path: rightPath, data: new Uint8Array(data), size: data.length })
        } else {
          setRightData(null)
        }

        setOffset(0)
        setDiffIndex(0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load binary files')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [leftPath, rightPath])

  // Sync scroll between left and right panels
  useEffect(() => {
    const leftEl = leftScrollRef.current
    const rightEl = rightScrollRef.current

    if (!leftEl || !rightEl || !syncScroll) return

    const handleLeftScroll = () => {
      rightEl.scrollTop = leftEl.scrollTop
    }

    const handleRightScroll = () => {
      leftEl.scrollTop = rightEl.scrollTop
    }

    leftEl.addEventListener('scroll', handleLeftScroll)
    rightEl.addEventListener('scroll', handleRightScroll)

    return () => {
      leftEl.removeEventListener('scroll', handleLeftScroll)
      rightEl.removeEventListener('scroll', handleRightScroll)
    }
  }, [syncScroll])

  // Compute all byte differences
  const diffBytes = useMemo(() => {
    if (!leftData || !rightData) return []

    const diffs: DiffByte[] = []
    const maxSize = Math.max(leftData.size, rightData.size)

    for (let i = 0; i < maxSize; i++) {
      const leftByte = i < leftData.size ? leftData.data[i] : undefined
      const rightByte = i < rightData.size ? rightData.data[i] : undefined

      if (leftByte !== rightByte) {
        diffs.push({
          offset: i,
          leftByte: leftByte ?? -1,
          rightByte: rightByte ?? -1,
        })
      }
    }

    return diffs
  }, [leftData, rightData])

  const getMaxOffset = () => {
    const maxSize = Math.max(leftData?.size || 0, rightData?.size || 0)
    return Math.max(0, maxSize - bytesPerRow * 10)
  }

  const handleScrollUp = () => {
    setOffset(Math.max(0, offset - bytesPerRow * 10))
  }

  const handleScrollDown = () => {
    setOffset(Math.min(getMaxOffset(), offset + bytesPerRow * 10))
  }

  const handleNextDiff = () => {
    if (diffBytes.length === 0) return

    const currentDiff = diffBytes.find(d => d.offset >= offset)
    if (currentDiff) {
      const currentIndex = diffBytes.indexOf(currentDiff)
      if (currentIndex < diffBytes.length - 1) {
        const nextDiff = diffBytes[currentIndex + 1]
        setOffset(Math.max(0, nextDiff.offset - bytesPerRow * 2))
        setDiffIndex(currentIndex + 1)
      }
    } else {
      setOffset(Math.max(0, diffBytes[0].offset - bytesPerRow * 2))
      setDiffIndex(0)
    }
  }

  const handlePrevDiff = () => {
    if (diffBytes.length === 0) return

    const prevDiffs = diffBytes.filter(d => d.offset < offset)
    if (prevDiffs.length > 0) {
      const prevDiff = prevDiffs[prevDiffs.length - 1]
      setOffset(Math.max(0, prevDiff.offset - bytesPerRow * 2))
      setDiffIndex(diffBytes.indexOf(prevDiff))
    }
  }

  const getFileName = (path: string) => {
    return path.split(/[/\\]/).pop() || path
  }

  const isByteDifferent = (byteOffset: number): boolean => {
    return diffBytes.some(d => d.offset === byteOffset)
  }

  const renderHexView = (data: BinaryData | null, side: 'left' | 'right', startOffset: number) => {
    if (!data) return null

    const rows: JSX.Element[] = []
    const endOffset = Math.min(startOffset + bytesPerRow * 10, data.size)

    for (let i = startOffset; i < endOffset; i += bytesPerRow) {
      const hexCells: JSX.Element[] = []
      const asciiCells: JSX.Element[] = []

      for (let j = 0; j < bytesPerRow; j++) {
        const byteIndex = i + j
        if (byteIndex < data.size) {
          const byte = data.data[byteIndex]
          const isDiff = isByteDifferent(byteIndex)

          hexCells.push(
            <span
              key={`hex-${byteIndex}`}
              className={`hex-byte ${isDiff ? 'hex-diff' : ''}`}
            >
              {formatHex(byte)}
            </span>
          )

          asciiCells.push(
            <span
              key={`ascii-${byteIndex}`}
              className={`ascii-char ${isDiff ? 'ascii-diff' : ''}`}
            >
              {formatAscii(byte)}
            </span>
          )
        } else {
          hexCells.push(<span key={`hex-${byteIndex}`} className="hex-byte hex-empty">  </span>)
          asciiCells.push(<span key={`ascii-${byteIndex}`} className="ascii-char ascii-empty"> </span>)
        }
      }

      rows.push(
        <div key={i} className="hex-row">
          <span className="hex-offset">{i.toString(16).toUpperCase().padStart(8, '0')}</span>
          <span className="hex-content">
            {hexCells.slice(0, 8)}
            <span className="hex-separator">  </span>
            {hexCells.slice(8, 16)}
          </span>
          <span className="hex-ascii">{asciiCells}</span>
        </div>
      )
    }

    return rows
  }

  // Handle missing bytes (when one file is longer)
  const renderMissingHexView = (startOffset: number, maxSize: number, side: 'left' | 'right') => {
    const rows: JSX.Element[] = []
    const endOffset = Math.min(startOffset + bytesPerRow * 10, maxSize)

    for (let i = startOffset; i < endOffset; i += bytesPerRow) {
      const hexCells: JSX.Element[] = []
      const asciiCells: JSX.Element[] = []

      for (let j = 0; j < bytesPerRow; j++) {
        const byteIndex = i + j
        const isDiff = isByteDifferent(byteIndex)

        if (byteIndex < maxSize) {
          // Missing byte - show as placeholder
          hexCells.push(
            <span key={`hex-${byteIndex}`} className={`hex-byte ${isDiff ? 'hex-missing' : ''}`}>
              --
            </span>
          )
          asciiCells.push(
            <span key={`ascii-${byteIndex}`} className={`ascii-char ${isDiff ? 'ascii-missing' : ''}`}>
              -
            </span>
          )
        } else {
          hexCells.push(<span key={`hex-${byteIndex}`} className="hex-byte hex-empty">  </span>)
          asciiCells.push(<span key={`ascii-${byteIndex}`} className="ascii-char ascii-empty"> </span>)
        }
      }

      rows.push(
        <div key={i} className="hex-row hex-row-missing">
          <span className="hex-offset">{i.toString(16).toUpperCase().padStart(8, '0')}</span>
          <span className="hex-content">
            {hexCells.slice(0, 8)}
            <span className="hex-separator">  </span>
            {hexCells.slice(8, 16)}
          </span>
          <span className="hex-ascii">{asciiCells}</span>
        </div>
      )
    }

    return rows
  }

  if (!leftPath && !rightPath) {
    return (
      <div className="binary-empty">
        <div className="binary-empty-icon">🔢</div>
        <div className="binary-empty-title">Select binary files to compare</div>
        <div className="binary-empty-subtitle">
          Hex view with byte-level difference highlighting
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="binary-loading">
        <span className="binary-spinner">⏳</span>
        <span className="binary-loading-text">Loading binary data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="binary-error">
        <span className="binary-error-icon">✕</span>
        <span className="binary-error-text">{error}</span>
      </div>
    )
  }

  const maxSize = Math.max(leftData?.size || 0, rightData?.size || 0)

  return (
    <div className="binary-container">
      <div className="binary-header">
        <div className="binary-info">
          {leftData && (
            <div className="binary-file-info">
              <span className="binary-badge">L</span>
              <span className="binary-file-name">{getFileName(leftData.path)}</span>
              <span className="binary-file-size">{formatSize(leftData.size)}</span>
            </div>
          )}
          {rightData && (
            <div className="binary-file-info">
              <span className="binary-badge">R</span>
              <span className="binary-file-name">{getFileName(rightData.path)}</span>
              <span className="binary-file-size">{formatSize(rightData.size)}</span>
            </div>
          )}
        </div>

        <div className="binary-controls">
          <button
            className="binary-diff-btn"
            onClick={handlePrevDiff}
            disabled={diffBytes.length === 0 || offset === 0}
            title="Previous difference"
          >
            ◀ Prev Diff
          </button>
          <span className="binary-diff-count">
            {diffBytes.length > 0 ? `${diffIndex + 1}/${diffBytes.length}` : '0 diffs'}
          </span>
          <button
            className="binary-diff-btn"
            onClick={handleNextDiff}
            disabled={diffBytes.length === 0 || diffIndex >= diffBytes.length - 1}
            title="Next difference"
          >
            Next Diff ▶
          </button>

          <span className="binary-offset-display">
            Offset: {offset.toString(16).toUpperCase().padStart(8, '0')}
          </span>

          <button
            className="binary-scroll-btn"
            onClick={handleScrollUp}
            disabled={offset === 0}
          >
            ▲
          </button>
          <button
            className="binary-scroll-btn"
            onClick={handleScrollDown}
            disabled={offset >= getMaxOffset()}
          >
            ▼
          </button>

          <button
            className={`binary-sync-btn ${syncScroll ? 'active' : ''}`}
            onClick={() => setSyncScroll(!syncScroll)}
            title={syncScroll ? 'Sync scroll enabled' : 'Sync scroll disabled'}
          >
            {syncScroll ? '🔗' : '🔓'}
          </button>
        </div>
      </div>

      <div className="binary-views">
        <div className="binary-pane left-pane">
          <div className="binary-pane-header">
            <span className="pane-badge">L</span>
            {leftData ? getFileName(leftData.path) : 'No file'}
          </div>
          <div className="hex-view">
            <div className="hex-header">
              <span className="hex-header-offset">Offset</span>
              <span className="hex-header-content">
                00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F
              </span>
              <span className="hex-header-ascii">ASCII</span>
            </div>
            <div className="hex-content" ref={leftScrollRef}>
              {leftData ? renderHexView(leftData, 'left', offset) : renderMissingHexView(offset, maxSize, 'left')}
            </div>
          </div>
        </div>

        <div className="binary-divider" />

        <div className="binary-pane right-pane">
          <div className="binary-pane-header">
            <span className="pane-badge">R</span>
            {rightData ? getFileName(rightData.path) : 'No file'}
          </div>
          <div className="hex-view">
            <div className="hex-header">
              <span className="hex-header-offset">Offset</span>
              <span className="hex-header-content">
                00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F
              </span>
              <span className="hex-header-ascii">ASCII</span>
            </div>
            <div className="hex-content" ref={rightScrollRef}>
              {rightData ? renderHexView(rightData, 'right', offset) : renderMissingHexView(offset, maxSize, 'right')}
            </div>
          </div>
        </div>
      </div>

      {leftData && rightData && (
        <div className="binary-stats">
          <span className="binary-stats-label">Comparison:</span>
          <span className="binary-stats-item">
            {leftData.size === rightData.size ? '✓ Same size' : `✕ Size differs (${formatSize(leftData.size)} vs ${formatSize(rightData.size)})`}
          </span>
          <span className="binary-stats-item diff">
            {diffBytes.length === 0 ? '✓ Identical' : `✕ ${diffBytes.length} bytes differ`}
          </span>
          {diffBytes.length > 0 && (
            <span className="binary-stats-item">
              First diff at offset: {diffBytes[0].offset.toString(16).toUpperCase().padStart(8, '0')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}