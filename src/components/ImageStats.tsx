import type { Stats } from '../utils/imageAnalysis'
import {
  Info,
  Ruler,
  Palette,
  HardDrive,
  Contrast,
  Hash,
} from 'lucide-react'

interface ImageStatsProps {
  leftStats: Stats | null
  rightStats: Stats | null
  diffStats: {
    totalPixels: number
    diffPixels: number
    diffPercent: number
  } | null
  onClose?: () => void
}

export function ImageStats({
  leftStats,
  rightStats,
  diffStats,
  onClose,
}: ImageStatsProps) {
  if (!leftStats && !rightStats) return null

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const hexColor = (rgb: { r: number; g: number; b: number }): string => {
    const r = rgb.r.toString(16).padStart(2, '0')
    const g = rgb.g.toString(16).padStart(2, '0')
    const b = rgb.b.toString(16).padStart(2, '0')
    return `#${r}${g}${b}`
  }

  return (
    <div className="image-stats-panel">
      <div className="image-stats-header">
        <span className="image-stats-title">
          <Info size={16} />
          Image Statistics
        </span>
        {onClose && (
          <button className="image-stats-close" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      <div className="image-stats-content">
        {/* Left Stats */}
        {leftStats && (
          <div className="image-stats-section left">
            <span className="stats-section-badge">L</span>
            <div className="stats-items">
              <div className="stats-item">
                <Ruler size={14} />
                <span className="stats-label">Dimensions:</span>
                <span className="stats-value">
                  {leftStats.width} × {leftStats.height}
                </span>
              </div>
              <div className="stats-item">
                <HardDrive size={14} />
                <span className="stats-label">File Size:</span>
                <span className="stats-value">
                  {formatFileSize(leftStats.fileSize)}
                </span>
              </div>
              <div className="stats-item">
                <Hash size={14} />
                <span className="stats-label">Total Pixels:</span>
                <span className="stats-value">
                  {leftStats.width * leftStats.height}
                </span>
              </div>
              {leftStats.avgColor && (
                <div className="stats-item">
                  <Palette size={14} />
                  <span className="stats-label">Avg Color:</span>
                  <span
                    className="stats-color-box"
                    style={{ backgroundColor: hexColor(leftStats.avgColor) }}
                  />
                  <span className="stats-value color">
                    {hexColor(leftStats.avgColor)}
                  </span>
                </div>
              )}
              {leftStats.avgBrightness !== undefined && (
                <div className="stats-item">
                  <Contrast size={14} />
                  <span className="stats-label">Brightness:</span>
                  <span className="stats-value">
                    {leftStats.avgBrightness.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Stats */}
        {rightStats && (
          <div className="image-stats-section right">
            <span className="stats-section-badge">R</span>
            <div className="stats-items">
              <div className="stats-item">
                <Ruler size={14} />
                <span className="stats-label">Dimensions:</span>
                <span className="stats-value">
                  {rightStats.width} × {rightStats.height}
                </span>
              </div>
              <div className="stats-item">
                <HardDrive size={14} />
                <span className="stats-label">File Size:</span>
                <span className="stats-value">
                  {formatFileSize(rightStats.fileSize)}
                </span>
              </div>
              <div className="stats-item">
                <Hash size={14} />
                <span className="stats-label">Total Pixels:</span>
                <span className="stats-value">
                  {rightStats.width * rightStats.height}
                </span>
              </div>
              {rightStats.avgColor && (
                <div className="stats-item">
                  <Palette size={14} />
                  <span className="stats-label">Avg Color:</span>
                  <span
                    className="stats-color-box"
                    style={{ backgroundColor: hexColor(rightStats.avgColor) }}
                  />
                  <span className="stats-value color">
                    {hexColor(rightStats.avgColor)}
                  </span>
                </div>
              )}
              {rightStats.avgBrightness !== undefined && (
                <div className="stats-item">
                  <Contrast size={14} />
                  <span className="stats-label">Brightness:</span>
                  <span className="stats-value">
                    {rightStats.avgBrightness.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Diff Stats */}
        {diffStats && diffStats.totalPixels > 0 && (
          <div className="image-stats-section diff">
            <span className="stats-section-badge diff">Diff</span>
            <div className="stats-items">
              <div className="stats-item">
                <Hash size={14} />
                <span className="stats-label">Diff Pixels:</span>
                <span className="stats-value">
                  {diffStats.diffPixels} ({diffStats.diffPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}