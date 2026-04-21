import type { CompareOptions } from '../hooks/useCompareOptions'

interface CompareOptionsPanelProps {
  options: CompareOptions
  onToggleOption: (key: keyof CompareOptions) => void
  onReset: () => void
}

export function CompareOptionsPanel({
  options,
  onToggleOption,
  onReset,
}: CompareOptionsPanelProps) {
  return (
    <div className="compare-options-panel">
      <div className="compare-options-header">
        <span className="compare-options-title">Compare Options</span>
        <button
          className="compare-options-reset"
          onClick={onReset}
          title="Reset to defaults"
        >
          Reset
        </button>
      </div>

      <div className="compare-options-list">
        <div className="compare-option-item">
          <label className="compare-option-label">
            <input
              type="checkbox"
              checked={options.ignoreTrimWhitespace}
              onChange={() => onToggleOption('ignoreTrimWhitespace')}
              className="compare-option-checkbox"
            />
            <span className="compare-option-text">Ignore leading/trailing whitespace</span>
          </label>
          <span className="compare-option-hint">
            Skip differences in spaces at line start/end
          </span>
        </div>

        <div className="compare-option-item">
          <label className="compare-option-label">
            <input
              type="checkbox"
              checked={options.ignoreWhitespace}
              onChange={() => onToggleOption('ignoreWhitespace')}
              className="compare-option-checkbox"
            />
            <span className="compare-option-text">Ignore all whitespace</span>
          </label>
          <span className="compare-option-hint">
            Treat all whitespace as equal
          </span>
        </div>

        <div className="compare-option-item">
          <label className="compare-option-label">
            <input
              type="checkbox"
              checked={options.ignoreCase}
              onChange={() => onToggleOption('ignoreCase')}
              className="compare-option-checkbox"
            />
            <span className="compare-option-text">Ignore case</span>
          </label>
          <span className="compare-option-hint">
            Case-insensitive comparison
          </span>
        </div>
      </div>
    </div>
  )
}