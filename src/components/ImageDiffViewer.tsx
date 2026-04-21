import { useState, useEffect, useRef, useCallback } from 'react'
import { readFile } from '@tauri-apps/plugin-fs'

interface ImageDiffViewerProps {
  leftPath?: string | null
  rightPath?: string | null
}

export function ImageDiffViewer({ leftPath, rightPath }: ImageDiffViewerProps) {
  const [leftImage, setLeftImage] = useState<string | null>(null)
  const [rightImage, setRightImage] = useState<string | null>(null)
  const [leftSize, setLeftSize] = useState<{ width: number; height: number } | null>(null)
  const [rightSize, setRightSize] = useState<{ width: number; height: number } | null>(null)
  const [viewMode, setViewMode] = useState<'side-by-side' | 'overlay' | 'difference'>('side-by-side')
  const [overlayOpacity, setOverlayOpacity] = useState(0.5)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Zoom and Pan state
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [syncZoom, setSyncZoom] = useState(true)
  const [leftZoom, setLeftZoom] = useState(1)
  const [rightZoom, setRightZoom] = useState(1)
  const [leftPan, setLeftPan] = useState({ x: 0, y: 0 })
  const [rightPan, setRightPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragPane, setDragPane] = useState<'left' | 'right' | 'both' | null>(null)

  const leftPaneRef = useRef<HTMLDivElement>(null)
  const rightPaneRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const ZOOM_STEP = 0.1
  const MIN_ZOOM = 0.1
  const MAX_ZOOM = 10

  useEffect(() => {
    if (leftPath) {
      loadImage(leftPath, setLeftImage, setLeftSize)
    } else {
      setLeftImage(null)
      setLeftSize(null)
    }
    // Reset zoom/pan when image changes
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setLeftZoom(1)
    setRightZoom(1)
    setLeftPan({ x: 0, y: 0 })
    setRightPan({ x: 0, y: 0 })
  }, [leftPath])

  useEffect(() => {
    if (rightPath) {
      loadImage(rightPath, setRightImage, setRightSize)
    } else {
      setRightImage(null)
      setRightSize(null)
    }
    // Reset zoom/pan when image changes
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setLeftZoom(1)
    setRightZoom(1)
    setLeftPan({ x: 0, y: 0 })
    setRightPan({ x: 0, y: 0 })
  }, [rightPath])

  const loadImage = async (
    path: string,
    setImage: (data: string | null) => void,
    setSize: (size: { width: number; height: number } | null) => void
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      const fileData = await readFile(path)
      const base64 = arrayBufferToBase64(fileData)
      const mimeType = getMimeType(path)
      const dataUrl = `data:${mimeType};base64,${base64}`

      const img = new Image()
      img.onload = () => {
        setSize({ width: img.width, height: img.height })
        setIsLoading(false)
      }
      img.onerror = () => {
        setError('Failed to load image')
        setIsLoading(false)
      }
      img.src = dataUrl

      setImage(dataUrl)
    } catch (err) {
      setError(`Failed to read file: ${(err as Error).message}`)
      setIsLoading(false)
    }
  }

  const arrayBufferToBase64 = (buffer: Uint8Array): string => {
    let binary = ''
    const bytes = new Uint8Array(buffer)
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  const getMimeType = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase() || ''
    switch (ext) {
      case 'png': return 'image/png'
      case 'jpg': case 'jpeg': return 'image/jpeg'
      case 'gif': return 'image/gif'
      case 'bmp': return 'image/bmp'
      case 'webp': return 'image/webp'
      case 'svg': return 'image/svg+xml'
      case 'ico': return 'image/x-icon'
      case 'tiff': case 'tif': return 'image/tiff'
      default: return 'image/png'
    }
  }

  const getFileName = (path: string) => {
    return path.split(/[/\\]/).pop() || path
  }

  const areImagesDifferent = () => {
    if (!leftSize || !rightSize) return false
    return leftSize.width !== rightSize.width || leftSize.height !== rightSize.height
  }

  // Zoom handlers
  const handleZoomIn = () => {
    if (syncZoom || viewMode !== 'side-by-side') {
      setZoom(Math.min(MAX_ZOOM, zoom + ZOOM_STEP))
    } else {
      setLeftZoom(Math.min(MAX_ZOOM, leftZoom + ZOOM_STEP))
      setRightZoom(Math.min(MAX_ZOOM, rightZoom + ZOOM_STEP))
    }
  }

  const handleZoomOut = () => {
    if (syncZoom || viewMode !== 'side-by-side') {
      setZoom(Math.max(MIN_ZOOM, zoom - ZOOM_STEP))
    } else {
      setLeftZoom(Math.max(MIN_ZOOM, leftZoom - ZOOM_STEP))
      setRightZoom(Math.max(MIN_ZOOM, rightZoom - ZOOM_STEP))
    }
  }

  const handleZoomReset = () => {
    if (syncZoom || viewMode !== 'side-by-side') {
      setZoom(1)
      setPan({ x: 0, y: 0 })
    } else {
      setLeftZoom(1)
      setRightZoom(1)
      setLeftPan({ x: 0, y: 0 })
      setRightPan({ x: 0, y: 0 })
    }
  }

  const handleFitToView = () => {
    if (!leftPaneRef.current || viewMode === 'side-by-side') {
      // For side-by-side, fit each pane independently would require pane dimensions
      // For now, reset to 1
      handleZoomReset()
      return
    }

    const container = leftPaneRef.current
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    if (leftSize) {
      const fitZoom = Math.min(
        containerWidth / leftSize.width,
        containerHeight / leftSize.height
      ) * 0.9
      setZoom(Math.max(MIN_ZOOM, fitZoom))
      setPan({ x: 0, y: 0 })
    }
  }

  // Wheel zoom handler
  const handleWheel = useCallback((e: React.WheelEvent, pane: 'left' | 'right' | 'both') => {
    e.preventDefault()

    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP

    if (syncZoom || pane === 'both' || viewMode !== 'side-by-side') {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta))
      // Adjust pan to zoom towards cursor position
      const rect = e.currentTarget.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      const zoomRatio = newZoom / zoom
      const newPanX = centerX - (centerX - pan.x) * zoomRatio + (cursorX - centerX) * (1 - zoomRatio)
      const newPanY = centerY - (centerY - pan.y) * zoomRatio + (cursorY - centerY) * (1 - zoomRatio)

      setZoom(newZoom)
      setPan({ x: newPanX, y: newPanY })
    } else {
      if (pane === 'left') {
        setLeftZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, leftZoom + delta)))
      } else {
        setRightZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, rightZoom + delta)))
      }
    }
  }, [zoom, pan, syncZoom, leftZoom, rightZoom, viewMode])

  // Drag pan handlers
  const handleMouseDown = (e: React.MouseEvent, pane: 'left' | 'right' | 'both') => {
    if (e.button !== 0) return // Only left click

    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    setDragPane(pane)
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !dragPane) return

    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y

    if (syncZoom || dragPane === 'both' || viewMode !== 'side-by-side') {
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }))
    } else {
      if (dragPane === 'left') {
        setLeftPan(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }))
      } else {
        setRightPan(prev => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }))
      }
    }

    setDragStart({ x: e.clientX, y: e.clientY })
  }, [isDragging, dragPane, dragStart, syncZoom, viewMode])

  const handleMouseUp = () => {
    setIsDragging(false)
    setDragPane(null)
  }

  const getTransformStyle = (pane: 'left' | 'right') => {
    if (viewMode === 'side-by-side' && !syncZoom) {
      const currentZoom = pane === 'left' ? leftZoom : rightZoom
      const currentPan = pane === 'left' ? leftPan : rightPan
      return {
        transform: `scale(${currentZoom}) translate(${currentPan.x / currentZoom}px, ${currentPan.y / currentZoom}px)`,
        cursor: isDragging ? 'grabbing' : 'grab',
      }
    }
    return {
      transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
      cursor: isDragging ? 'grabbing' : 'grab',
    }
  }

  const currentZoomPercent = Math.round((syncZoom || viewMode !== 'side-by-side' ? zoom : Math.min(leftZoom, rightZoom)) * 100)

  if (!leftPath && !rightPath) {
    return (
      <div className="image-diff-empty">
        <div className="image-empty-icon">🖼️</div>
        <div className="image-empty-title">Select images to compare</div>
        <div className="image-empty-subtitle">
          Choose two image files to see their differences
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="image-diff-loading">
        <div className="image-spinner">⏳</div>
        <div className="image-loading-text">Loading images...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="image-diff-error">
        <div className="image-error-icon">❌</div>
        <div className="image-error-text">{error}</div>
      </div>
    )
  }

  return (
    <div className="image-diff-container">
      {/* Header */}
      <div className="image-diff-header">
        <div className="image-info">
          {leftPath && leftSize && (
            <div className="image-file-info left">
              <span className="image-badge">L</span>
              <span className="image-name">{getFileName(leftPath)}</span>
              <span className="image-size">{leftSize.width} × {leftSize.height}</span>
            </div>
          )}
          {rightPath && rightSize && (
            <div className="image-file-info right">
              <span className="image-badge">R</span>
              <span className="image-name">{getFileName(rightPath)}</span>
              <span className="image-size">{rightSize.width} × {rightSize.height}</span>
            </div>
          )}
        </div>

        {/* View mode controls */}
        <div className="image-controls">
          <div className="image-view-modes">
            <button
              className={`image-mode-btn ${viewMode === 'side-by-side' ? 'active' : ''}`}
              onClick={() => setViewMode('side-by-side')}
            >
              Side by Side
            </button>
            <button
              className={`image-mode-btn ${viewMode === 'overlay' ? 'active' : ''}`}
              onClick={() => setViewMode('overlay')}
            >
              Overlay
            </button>
            <button
              className={`image-mode-btn ${viewMode === 'difference' ? 'active' : ''}`}
              onClick={() => setViewMode('difference')}
            >
              Difference
            </button>
          </div>

          {/* Zoom controls */}
          <div className="image-zoom-controls">
            <button className="image-zoom-btn" onClick={handleZoomOut} title="Zoom Out (-)">
              −
            </button>
            <span className="image-zoom-value" onClick={handleZoomReset} title="Click to reset">
              {currentZoomPercent}%
            </span>
            <button className="image-zoom-btn" onClick={handleZoomIn} title="Zoom In (+)">
              +
            </button>
            <button className="image-zoom-btn fit" onClick={handleFitToView} title="Fit to View">
              Fit
            </button>
            {viewMode === 'side-by-side' && (
              <button
                className={`image-sync-btn ${syncZoom ? 'active' : ''}`}
                onClick={() => setSyncZoom(!syncZoom)}
                title={syncZoom ? 'Sync zoom enabled' : 'Sync zoom disabled'}
              >
                {syncZoom ? '🔗' : '🔓'}
              </button>
            )}
          </div>

          {viewMode === 'overlay' && (
            <div className="image-opacity-control">
              <label className="opacity-label">Opacity:</label>
              <input
                type="range"
                min="0"
                max="100"
                value={overlayOpacity * 100}
                onChange={(e) => setOverlayOpacity(Number(e.target.value) / 100)}
                className="opacity-slider"
              />
              <span className="opacity-value">{Math.round(overlayOpacity * 100)}%</span>
            </div>
          )}
        </div>

        {/* Difference indicator */}
        {areImagesDifferent() && (
          <div className="image-diff-warning">
            ⚠️ Images have different dimensions
          </div>
        )}
      </div>

      {/* Image views */}
      <div
        className="image-views"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {viewMode === 'side-by-side' && (
          <div className="image-side-by-side">
            <div
              className="image-pane left"
              ref={leftPaneRef}
              onWheel={(e) => handleWheel(e, 'left')}
              onMouseDown={(e) => handleMouseDown(e, 'left')}
            >
              {leftImage ? (
                <img
                  src={leftImage}
                  alt="Left image"
                  className="image-display"
                  style={getTransformStyle('left')}
                  draggable={false}
                />
              ) : (
                <div className="image-pane-empty">No left image</div>
              )}
            </div>
            <div
              className="image-pane right"
              ref={rightPaneRef}
              onWheel={(e) => handleWheel(e, 'right')}
              onMouseDown={(e) => handleMouseDown(e, 'right')}
            >
              {rightImage ? (
                <img
                  src={rightImage}
                  alt="Right image"
                  className="image-display"
                  style={getTransformStyle('right')}
                  draggable={false}
                />
              ) : (
                <div className="image-pane-empty">No right image</div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'overlay' && (
          <div
            className="image-overlay-container"
            ref={overlayRef}
            onWheel={(e) => handleWheel(e, 'both')}
            onMouseDown={(e) => handleMouseDown(e, 'both')}
          >
            {leftImage && (
              <img
                src={leftImage}
                alt="Left image"
                className="image-overlay-base"
                style={getTransformStyle('left')}
                draggable={false}
              />
            )}
            {rightImage && (
              <img
                src={rightImage}
                alt="Right image"
                className="image-overlay-top"
                style={{
                  ...getTransformStyle('right'),
                  opacity: overlayOpacity,
                }}
                draggable={false}
              />
            )}
          </div>
        )}

        {viewMode === 'difference' && (
          <div
            className="image-difference-container"
            onWheel={(e) => handleWheel(e, 'both')}
            onMouseDown={(e) => handleMouseDown(e, 'both')}
          >
            <canvas
              id="diffCanvas"
              className="image-difference-canvas"
              style={getTransformStyle('left')}
              ref={(canvas) => {
                if (canvas && leftImage && rightImage && leftSize && rightSize) {
                  computeDifference(canvas, leftImage, rightImage, leftSize, rightSize)
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="image-status-bar">
        <div className="image-status-item">
          Mode: {viewMode === 'side-by-side' ? 'Side by Side' : viewMode === 'overlay' ? 'Overlay' : 'Difference'}
        </div>
        <div className="image-status-item">
          Zoom: {currentZoomPercent}%
        </div>
        {leftSize && rightSize && (
          <div className="image-status-item">
            {areImagesDifferent() ? '⚠️ Different dimensions' : '✓ Same dimensions'}
          </div>
        )}
        <div className="image-status-item hint">
          Scroll to zoom, drag to pan
        </div>
      </div>
    </div>
  )
}

function computeDifference(
  canvas: HTMLCanvasElement,
  leftImage: string,
  rightImage: string,
  leftSize: { width: number; height: number },
  rightSize: { width: number; height: number }
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const maxWidth = Math.max(leftSize.width, rightSize.width)
  const maxHeight = Math.max(leftSize.height, rightSize.height)

  canvas.width = maxWidth
  canvas.height = maxHeight

  const leftImg = new Image()
  const rightImg = new Image()

  let leftLoaded = false
  let rightLoaded = false

  const drawDifference = () => {
    if (!leftLoaded || !rightLoaded) return

    const leftCanvas = document.createElement('canvas')
    const rightCanvas = document.createElement('canvas')

    leftCanvas.width = maxWidth
    leftCanvas.height = maxHeight
    rightCanvas.width = maxWidth
    rightCanvas.height = maxHeight

    const leftCtx = leftCanvas.getContext('2d')
    const rightCtx = rightCanvas.getContext('2d')

    if (!leftCtx || !rightCtx) return

    leftCtx.drawImage(leftImg, 0, 0)
    rightCtx.drawImage(rightImg, 0, 0)

    const leftData = leftCtx.getImageData(0, 0, maxWidth, maxHeight)
    const rightData = rightCtx.getImageData(0, 0, maxWidth, maxHeight)

    const diffData = ctx.createImageData(maxWidth, maxHeight)

    for (let i = 0; i < leftData.data.length; i += 4) {
      const rDiff = Math.abs(leftData.data[i] - rightData.data[i])
      const gDiff = Math.abs(leftData.data[i + 1] - rightData.data[i + 1])
      const bDiff = Math.abs(leftData.data[i + 2] - rightData.data[i + 2])

      if (rDiff > 10 || gDiff > 10 || bDiff > 10) {
        diffData.data[i] = 255
        diffData.data[i + 1] = 0
        diffData.data[i + 2] = 0
        diffData.data[i + 3] = 255
      } else {
        const avg = (leftData.data[i] + leftData.data[i + 1] + leftData.data[i + 2]) / 3
        diffData.data[i] = avg
        diffData.data[i + 1] = avg
        diffData.data[i + 2] = avg
        diffData.data[i + 3] = 255
      }
    }

    ctx.putImageData(diffData, 0, 0)
  }

  leftImg.onload = () => {
    leftLoaded = true
    drawDifference()
  }

  rightImg.onload = () => {
    rightLoaded = true
    drawDifference()
  }

  leftImg.src = leftImage
  rightImg.src = rightImage
}