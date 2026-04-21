import type { FileEncoding, EncodingInfo } from '../utils/encoding'
import { getEncodingDisplayName } from '../utils/encoding'
import { FileCode } from 'lucide-react'

interface EncodingInfoProps {
  leftEncoding?: EncodingInfo
  rightEncoding?: EncodingInfo
  leftSelectedEncoding?: FileEncoding
  rightSelectedEncoding?: FileEncoding
  onLeftEncodingChange?: (encoding: FileEncoding) => void
  onRightEncodingChange?: (encoding: FileEncoding) => void
}

export function EncodingInfo({
  leftEncoding,
  rightEncoding,
  leftSelectedEncoding,
  rightSelectedEncoding,
}: EncodingInfoProps) {
  if (!leftEncoding && !rightEncoding) return null

  const formatEncoding = (encoding: EncodingInfo, selected?: FileEncoding) => {
    const displayEncoding = selected || encoding.encoding
    const confidenceStr = encoding.confidence < 1
      ? ` (${Math.round(encoding.confidence * 100)}%)`
      : ''
    const bomStr = encoding.hasBOM ? ' BOM' : ''
    return `${getEncodingDisplayName(displayEncoding)}${confidenceStr}${bomStr}`
  }

  const sameEncoding = leftEncoding?.encoding === rightEncoding?.encoding &&
    leftEncoding?.hasBOM === rightEncoding?.hasBOM

  return (
    <div className="encoding-info-panel">
      <FileCode size={14} className="encoding-info-icon" />
      <div className="encoding-info-content">
        {leftEncoding && (
          <span className="encoding-info-left">
            L: {formatEncoding(leftEncoding, leftSelectedEncoding)}
          </span>
        )}
        {rightEncoding && (
          <span className="encoding-info-right">
            R: {formatEncoding(rightEncoding, rightSelectedEncoding)}
          </span>
        )}
        {!sameEncoding && leftEncoding && rightEncoding && (
          <span className="encoding-info-warning">
            Different encodings
          </span>
        )}
      </div>
    </div>
  )
}