import { useState, useEffect, useRef } from 'react'

interface GoToLineDialogProps {
  isOpen: boolean
  onClose: () => void
  onGoToLine: (lineNumber: number) => void
  maxLines: number
  currentLine?: number
}

export function GoToLineDialog({
  isOpen,
  onClose,
  onGoToLine,
  maxLines,
  currentLine = 1,
}: GoToLineDialogProps) {
  const [lineNumber, setLineNumber] = useState<string>(String(currentLine))
  const [error, setError] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setLineNumber(String(currentLine))
      setError('')
      inputRef.current?.focus()
    }
  }, [isOpen, currentLine])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const line = parseInt(lineNumber, 10)

    if (isNaN(line) || line < 1) {
      setError('Please enter a valid positive number')
      return
    }

    if (line > maxLines) {
      setError(`Line number exceeds maximum (${maxLines})`)
      return
    }

    onGoToLine(line)
    onClose()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLineNumber(e.target.value)
    setError('')
  }

  if (!isOpen) return null

  return (
    <div className="goto-dialog-overlay" onClick={onClose}>
      <div className="goto-dialog" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="goto-dialog-header">
            <span className="goto-dialog-title">Go to Line</span>
            <button
              type="button"
              className="goto-dialog-close"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <div className="goto-dialog-content">
            <div className="goto-dialog-info">
              Current line: {currentLine} | Maximum: {maxLines}
            </div>

            <div className="goto-dialog-input-wrapper">
              <label className="goto-dialog-label">Line number:</label>
              <input
                ref={inputRef}
                type="text"
                className={`goto-dialog-input ${error ? 'error' : ''}`}
                value={lineNumber}
                onChange={handleInputChange}
                placeholder="Enter line number..."
              />
            </div>

            {error && (
              <div className="goto-dialog-error">{error}</div>
            )}
          </div>

          <div className="goto-dialog-footer">
            <button
              type="button"
              className="goto-dialog-btn cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="goto-dialog-btn submit"
            >
              Go to Line
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}