import { useState, useEffect, useRef, useMemo } from 'react'
import { Editor } from '@monaco-editor/react'
import { open } from '@tauri-apps/plugin-dialog'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { getLanguageFromPath } from '../utils/diff'
import { diff3, generateMergeResult, getConflictSummary, type Diff3Region } from '../utils/diff3'

interface MergeFile {
  path: string
  content: string
  language: string
}

interface ThreeWayMergeProps {
  onMergeComplete?: (result: string) => void
}

export function ThreeWayMerge({ onMergeComplete }: ThreeWayMergeProps) {
  const [baseFile, setBaseFile] = useState<MergeFile | null>(null)
  const [leftFile, setLeftFile] = useState<MergeFile | null>(null)
  const [rightFile, setRightFile] = useState<MergeFile | null>(null)
  const [resultContent, setResultContent] = useState<string>('')
  const [resolutions, setResolutions] = useState<Map<number, 'base' | 'left' | 'right'>>(new Map())
  const [selectedConflictIndex, setSelectedConflictIndex] = useState<number | null>(null)
  const [showConflictPreview, setShowConflictPreview] = useState(true)

  const baseEditorRef = useRef<any>(null)
  const leftEditorRef = useRef<any>(null)
  const rightEditorRef = useRef<any>(null)
  const resultEditorRef = useRef<any>(null)

  // Compute diff3 result
  const diff3Result = useMemo(() => {
    if (!baseFile || !leftFile || !rightFile) return null

    const baseLines = baseFile.content.split('\n')
    const leftLines = leftFile.content.split('\n')
    const rightLines = rightFile.content.split('\n')

    return diff3(baseLines, leftLines, rightLines)
  }, [baseFile, leftFile, rightFile])

  // Conflict summary
  const summary = useMemo(() => {
    if (!diff3Result) return null
    return getConflictSummary(diff3Result)
  }, [diff3Result])

  // Update result when resolutions change
  useEffect(() => {
    if (!diff3Result) return

    const resultLines = generateMergeResult(diff3Result.regions, resolutions)
    setResultContent(resultLines.join('\n'))
  }, [diff3Result, resolutions])

  // Load file
  const loadFile = async (side: 'base' | 'left' | 'right') => {
    const selected = await open({
      multiple: false,
      title: `Select ${side === 'base' ? 'Base' : side === 'left' ? 'Left' : 'Right'} File`,
    })

    if (selected && typeof selected === 'string') {
      try {
        const content = await readTextFile(selected)
        const language = getLanguageFromPath(selected)
        const file = { path: selected, content, language }

        if (side === 'base') setBaseFile(file)
        else if (side === 'left') setLeftFile(file)
        else setRightFile(file)

        // Reset resolutions when files change
        setResolutions(new Map())
        setSelectedConflictIndex(null)
      } catch (error) {
        console.error(`Failed to load ${side} file:`, error)
      }
    }
  }

  // Resolve conflict
  const resolveConflict = (regionIndex: number, resolution: 'base' | 'left' | 'right') => {
    const newResolutions = new Map(resolutions)
    newResolutions.set(regionIndex, resolution)
    setResolutions(newResolutions)
  }

  // Apply all resolutions
  const applyAllResolutions = (resolution: 'base' | 'left' | 'right') => {
    if (!diff3Result) return

    const newResolutions = new Map<number, 'base' | 'left' | 'right'>()
    diff3Result.conflicts.forEach((region) => {
      const index = diff3Result.regions.indexOf(region)
      newResolutions.set(index, resolution)
    })
    setResolutions(newResolutions)
  }

  // Navigate to conflict
  const goToConflict = (region: Diff3Region) => {
    // Navigate all editors to the conflict region
    const revealLine = (editor: any, line: number) => {
      if (editor) {
        editor.revealLineInCenter(line)
      }
    }

    revealLine(baseEditorRef.current, region.baseStart + 1)
    revealLine(leftEditorRef.current, region.leftStart + 1)
    revealLine(rightEditorRef.current, region.rightStart + 1)
    revealLine(resultEditorRef.current, region.baseStart + 1)
  }

  // Get conflict region info
  const getRegionInfo = (region: Diff3Region) => {
    switch (region.type) {
      case 'conflict':
        return { label: 'Conflict', color: 'var(--diff-removed-line)', icon: '⚠️' }
      case 'left-only':
        return { label: 'Left Only', color: 'var(--diff-removed-line)', icon: '←' }
      case 'right-only':
        return { label: 'Right Only', color: 'var(--diff-added-line)', icon: '→' }
      case 'both-same':
        return { label: 'Both Same', color: 'var(--diff-modified-line)', icon: '≡' }
      case 'unchanged':
        return { label: 'Unchanged', color: 'var(--text-muted)', icon: '=' }
    }
  }

  const handleEditorMount = (editor: any, side: 'base' | 'left' | 'right' | 'result') => {
    if (side === 'base') baseEditorRef.current = editor
    else if (side === 'left') leftEditorRef.current = editor
    else if (side === 'right') rightEditorRef.current = editor
    else resultEditorRef.current = editor
  }

  const getFileName = (path: string) => {
    return path.split(/[/\\]/).pop() || path
  }

  // Count unresolved conflicts
  const unresolvedCount = diff3Result?.conflicts.filter((region) => {
    const index = diff3Result.regions.indexOf(region)
    return !resolutions.has(index)
  }).length ?? 0

  if (!baseFile && !leftFile && !rightFile) {
    return (
      <div className="merge-empty">
        <div className="merge-empty-icon">🔀</div>
        <div className="merge-empty-title">Three-Way Merge</div>
        <div className="merge-empty-subtitle">
          Load Base, Left, and Right files to detect and resolve conflicts
        </div>
        <div className="merge-empty-actions">
          <button className="merge-empty-btn" onClick={() => loadFile('base')}>
            Load Base
          </button>
          <button className="merge-empty-btn" onClick={() => loadFile('left')}>
            Load Left
          </button>
          <button className="merge-empty-btn" onClick={() => loadFile('right')}>
            Load Right
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="three-way-merge">
      {/* Header */}
      <div className="merge-header">
        <span className="merge-title">Three-Way Merge</span>
        {summary && (
          <span className="merge-conflicts-count">
            {summary.conflicts > 0
              ? `${unresolvedCount} unresolved / ${summary.conflicts} conflicts`
              : '✓ No conflicts'
            }
            {summary.autoResolvable > 0 && ` (${summary.autoResolvable} auto-resolved)`}
          </span>
        )}
        <div className="merge-header-actions">
          <button
            className="merge-toggle-btn"
            onClick={() => setShowConflictPreview(!showConflictPreview)}
            title="Toggle conflict preview panel"
          >
            {showConflictPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="merge-toolbar">
        <button className="merge-load-btn" onClick={() => loadFile('base')}>
          📁 Base
        </button>
        <button className="merge-load-btn" onClick={() => loadFile('left')}>
          📁 Left
        </button>
        <button className="merge-load-btn" onClick={() => loadFile('right')}>
          📁 Right
        </button>

        {summary?.conflicts > 0 && (
          <div className="merge-resolve-all">
            <span className="resolve-label">Resolve All:</span>
            <button className="resolve-btn base" onClick={() => applyAllResolutions('base')}>
              Base
            </button>
            <button className="resolve-btn left" onClick={() => applyAllResolutions('left')}>
              Left
            </button>
            <button className="resolve-btn right" onClick={() => applyAllResolutions('right')}>
              Right
            </button>
          </div>
        )}
      </div>

      {/* Source Panels */}
      <div className="merge-panels">
        {/* Base */}
        <div className="merge-panel">
          <div className="merge-panel-header">
            <span className="panel-badge base">BASE</span>
            <span className="panel-path">{baseFile ? getFileName(baseFile.path) : 'No file'}</span>
          </div>
          <div className="merge-editor">
            <Editor
              height="100%"
              language={baseFile?.language || 'plaintext'}
              value={baseFile?.content || ''}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                glyphMargin: true,
              }}
              onMount={(editor) => handleEditorMount(editor, 'base')}
            />
          </div>
        </div>

        {/* Left */}
        <div className="merge-panel">
          <div className="merge-panel-header">
            <span className="panel-badge left">L</span>
            <span className="panel-path">{leftFile ? getFileName(leftFile.path) : 'No file'}</span>
          </div>
          <div className="merge-editor">
            <Editor
              height="100%"
              language={leftFile?.language || 'plaintext'}
              value={leftFile?.content || ''}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                glyphMargin: true,
              }}
              onMount={(editor) => handleEditorMount(editor, 'left')}
            />
          </div>
        </div>

        {/* Right */}
        <div className="merge-panel">
          <div className="merge-panel-header">
            <span className="panel-badge right">R</span>
            <span className="panel-path">{rightFile ? getFileName(rightFile.path) : 'No file'}</span>
          </div>
          <div className="merge-editor">
            <Editor
              height="100%"
              language={rightFile?.language || 'plaintext'}
              value={rightFile?.content || ''}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                glyphMargin: true,
              }}
              onMount={(editor) => handleEditorMount(editor, 'right')}
            />
          </div>
        </div>
      </div>

      {/* Conflict Preview Panel */}
      {showConflictPreview && diff3Result && diff3Result.regions.length > 0 && (
        <div className="merge-regions">
          <div className="merge-regions-header">
            <span className="regions-title">Change Regions ({diff3Result.regions.length})</span>
          </div>
          <div className="merge-regions-list">
            {diff3Result.regions.map((region, index) => {
              const info = getRegionInfo(region)
              const isConflict = region.type === 'conflict'
              const isResolved = resolutions.has(index)

              return (
                <div
                  key={index}
                  className={`merge-region-item ${selectedConflictIndex === index ? 'selected' : ''} ${isConflict ? 'conflict' : ''}`}
                  onClick={() => {
                    setSelectedConflictIndex(index)
                    goToConflict(region)
                  }}
                >
                  <span className="region-icon" style={{ color: info.color }}>
                    {info.icon}
                  </span>
                  <span className="region-label">{info.label}</span>
                  <span className="region-lines">
                    Lines {region.baseStart + 1}-{region.baseEnd + 1}
                  </span>
                  {isConflict && !isResolved && (
                    <div className="region-resolve-btns">
                      <button
                        className="resolve-mini-btn base"
                        onClick={(e) => {
                          e.stopPropagation()
                          resolveConflict(index, 'base')
                        }}
                        title="Use Base"
                      >
                        B
                      </button>
                      <button
                        className="resolve-mini-btn left"
                        onClick={(e) => {
                          e.stopPropagation()
                          resolveConflict(index, 'left')
                        }}
                        title="Use Left"
                      >
                        L
                      </button>
                      <button
                        className="resolve-mini-btn right"
                        onClick={(e) => {
                          e.stopPropagation()
                          resolveConflict(index, 'right')
                        }}
                        title="Use Right"
                      >
                        R
                      </button>
                    </div>
                  )}
                  {isConflict && isResolved && (
                    <span className="region-resolved">✓ {resolutions.get(index)}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Result Panel */}
      <div className="merge-result">
        <div className="merge-result-header">
          <span className="result-badge">RESULT</span>
          <span className="result-status">
            {unresolvedCount === 0
              ? '✓ Ready to merge'
              : `${unresolvedCount} conflicts to resolve`
            }
          </span>
        </div>
        <div className="merge-result-editor">
          <Editor
            height="100%"
            language={baseFile?.language || 'plaintext'}
            value={resultContent}
            theme="vs-dark"
            options={{
              readOnly: false,
              minimap: { enabled: true },
              fontSize: 13,
              lineNumbers: 'on',
              glyphMargin: true,
            }}
            onMount={(editor) => handleEditorMount(editor, 'result')}
            onChange={(value) => setResultContent(value || '')}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="merge-actions">
        <button
          className="merge-complete-btn"
          onClick={() => onMergeComplete?.(resultContent)}
          disabled={unresolvedCount > 0}
        >
          {unresolvedCount > 0
            ? `Resolve ${unresolvedCount} conflicts first`
            : 'Complete Merge'
          }
        </button>
      </div>
    </div>
  )
}