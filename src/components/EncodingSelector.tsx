import { useState, useEffect } from 'react'
import type { FileEncoding, EncodingInfo } from '../utils/encoding'
import {
  decodeBytes,
  getEncodingDisplayName,
  SUPPORTED_ENCODINGS,
} from '../utils/encoding'
import { ChevronDown, AlertCircle, Check } from 'lucide-react'

interface EncodingSelectorProps {
  bytes: Uint8Array | null
  detectedEncoding: EncodingInfo | null
  currentEncoding: FileEncoding
  onEncodingChange: (encoding: FileEncoding, content: string) => void
}

export function EncodingSelector({
  bytes,
  detectedEncoding,
  currentEncoding,
  onEncodingChange,
}: EncodingSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [contentPreview, setContentPreview] = useState<string>('')

  // Update preview when encoding changes
  useEffect(() => {
    if (bytes) {
      const decoded = decodeBytes(bytes, currentEncoding)
      // Show first few characters as preview
      setContentPreview(decoded.slice(0, 100))
    }
  }, [bytes, currentEncoding])

  const handleEncodingSelect = (encoding: FileEncoding) => {
    setIsOpen(false)
    if (bytes) {
      const decoded = decodeBytes(bytes, encoding)
      onEncodingChange(encoding, decoded)
    }
  }

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.9) return 'High'
    if (confidence >= 0.7) return 'Medium'
    if (confidence >= 0.5) return 'Low'
    return 'Unknown'
  }

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'var(--diff-added-line)'
    if (confidence >= 0.7) return 'var(--attention-primary)'
    if (confidence >= 0.5) return '#fbbf24'
    return 'var(--text-muted)'
  }

  if (!detectedEncoding) return null

  return (
    <div className="encoding-selector">
      <button
        className="encoding-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="encoding-name">{getEncodingDisplayName(currentEncoding)}</span>
        {detectedEncoding.hasBOM && (
          <span className="encoding-bom-badge">BOM</span>
        )}
        <span
          className="encoding-confidence"
          style={{ color: getConfidenceColor(detectedEncoding.confidence) }}
        >
          {getConfidenceLabel(detectedEncoding.confidence)}
        </span>
        <ChevronDown size={14} className="encoding-dropdown-icon" />
      </button>

      {isOpen && (
        <div className="encoding-dropdown">
          {/* Detected info */}
          <div className="encoding-detected-info">
            <span className="encoding-detected-label">Detected:</span>
            <span className="encoding-detected-value">
              {getEncodingDisplayName(detectedEncoding.encoding)}
              ({Math.round(detectedEncoding.confidence * 100)}%)
            </span>
            {detectedEncoding.hasBOM && (
              <span className="encoding-bom-badge small">BOM</span>
            )}
          </div>

          {/* Preview */}
          {contentPreview && (
            <div className="encoding-preview">
              <span className="encoding-preview-label">Preview:</span>
              <code className="encoding-preview-text">{contentPreview}</code>
            </div>
          )}

          {/* Encoding list */}
          <div className="encoding-list">
            {SUPPORTED_ENCODINGS.map(encoding => (
              <button
                key={encoding}
                className={`encoding-option ${currentEncoding === encoding ? 'selected' : ''}`}
                onClick={() => handleEncodingSelect(encoding)}
              >
                {currentEncoding === encoding && (
                  <Check size={12} className="encoding-check-icon" />
                )}
                <span className="encoding-option-name">
                  {getEncodingDisplayName(encoding)}
                </span>
              </button>
            ))}
          </div>

          {/* Warning for low confidence */}
          {detectedEncoding.confidence < 0.7 && (
            <div className="encoding-warning">
              <AlertCircle size={12} />
              <span>
                Encoding detection confidence is low.
                Please verify the content displays correctly.
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}