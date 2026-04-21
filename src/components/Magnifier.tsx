import { useRef, useEffect, useState, useCallback } from 'react'
import { ZoomIn } from 'lucide-react'

interface MagnifierProps {
  imageUrl: string
  imageSize: { width: number; height: number }
  magnifierSize: number
  zoomLevel: number
  enabled: boolean
  containerRef: React.RefObject<HTMLDivElement>
}

export function Magnifier({
  imageUrl,
  imageSize,
  magnifierSize = 150,
  zoomLevel = 3,
  enabled,
  containerRef,
}: MagnifierProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [showMagnifier, setShowMagnifier] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const updateMagnifier = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !enabled) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setPosition({ x, y })
    setShowMagnifier(true)

    // Update canvas
    if (canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = magnifierSize
      canvas.height = magnifierSize

      const img = new Image()
      img.onload = () => {
        // Calculate source coordinates
        const scaleX = imageSize.width / rect.width
        const scaleY = imageSize.height / rect.height

        const sourceX = (x - magnifierSize / (2 * zoomLevel)) * scaleX
        const sourceY = (y - magnifierSize / (2 * zoomLevel)) * scaleY
        const sourceWidth = magnifierSize / zoomLevel * scaleX
        const sourceHeight = magnifierSize / zoomLevel * scaleY

        // Draw magnified area
        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceWidth,
          sourceHeight,
          0,
          0,
          magnifierSize,
          magnifierSize
        )

        // Draw crosshair
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(magnifierSize / 2, 0)
        ctx.lineTo(magnifierSize / 2, magnifierSize)
        ctx.moveTo(0, magnifierSize / 2)
        ctx.lineTo(magnifierSize, magnifierSize / 2)
        ctx.stroke()

        // Draw border
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)'
        ctx.lineWidth = 2
        ctx.strokeRect(0, 0, magnifierSize, magnifierSize)
      }
      img.src = imageUrl
    }
  }, [imageUrl, imageSize, magnifierSize, zoomLevel, enabled, containerRef])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    container.addEventListener('mousemove', updateMagnifier)
    container.addEventListener('mouseleave', () => setShowMagnifier(false))

    return () => {
      container.removeEventListener('mousemove', updateMagnifier)
      container.removeEventListener('mouseleave', () => setShowMagnifier(false))
    }
  }, [containerRef, enabled, updateMagnifier])

  if (!enabled || !showMagnifier) return null

  return (
    <div
      className="magnifier-container"
      style={{
        left: position.x - magnifierSize / 2,
        top: position.y - magnifierSize / 2,
        width: magnifierSize,
        height: magnifierSize,
      }}
    >
      <canvas
        ref={canvasRef}
        className="magnifier-canvas"
        width={magnifierSize}
        height={magnifierSize}
      />
      <div className="magnifier-label">
        <ZoomIn size={12} />
        {zoomLevel}x
      </div>
    </div>
  )
}