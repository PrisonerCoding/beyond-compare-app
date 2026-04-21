import { DiffEditor } from '@monaco-editor/react'
import { useRef, useEffect } from 'react'
import { SearchPanel, useSearchPanel } from './SearchPanel'
import type { FileContent } from '../types'
import type { CompareOptions } from '../hooks/useCompareOptions'
import type { Bookmark } from '../hooks/useBookmarks'
import { Zap } from 'lucide-react'

interface DiffViewerProps {
  leftFile: FileContent | null
  rightFile: FileContent | null
  onLeftContentChange?: (content: string) => void
  onRightContentChange?: (content: string) => void
  leftEditable?: boolean
  rightEditable?: boolean
  showInlineDiff?: boolean
  wordWrap?: 'on' | 'off'
  compareOptions?: CompareOptions
  bookmarks?: Bookmark[]
  onToggleBookmark?: (lineNumber: number, side: 'left' | 'right') => void
}

export function DiffViewer({
  leftFile,
  rightFile,
  onLeftContentChange,
  onRightContentChange,
  leftEditable = true,
  rightEditable: _rightEditable = true,
  showInlineDiff = true,
  wordWrap = 'off',
  compareOptions,
  bookmarks = [],
  onToggleBookmark,
}: DiffViewerProps) {
  const editorRef = useRef<any>(null)
  const inlineDiffEnabledRef = useRef(showInlineDiff)
  const bookmarkDecorationsRef = useRef<string[]>([])

  const {
    leftSearchOpen,
    rightSearchOpen,
    openLeftSearch,
    openRightSearch,
    closeLeftSearch,
    closeRightSearch,
  } = useSearchPanel(editorRef)

  inlineDiffEnabledRef.current = showInlineDiff

  // Update bookmark decorations
  useEffect(() => {
    if (!editorRef.current) return

    const editor = editorRef.current
    const originalEditor = editor.getOriginalEditor()
    const modifiedEditor = editor.getModifiedEditor()

    const leftBookmarks = bookmarks.filter(b => b.side === 'left')
    const rightBookmarks = bookmarks.filter(b => b.side === 'right')

    const leftDecorations = leftBookmarks.map(b => ({
      range: { startLineNumber: b.lineNumber, startColumn: 1, endLineNumber: b.lineNumber, endColumn: 1 },
      options: {
        isWholeLine: true,
        glyphMarginClassName: 'bookmark-glyph',
        glyphMarginHoverMessage: { value: `📌 Bookmark: Line ${b.lineNumber}` },
        className: 'bookmark-line-highlight',
      },
    }))

    const rightDecorations = rightBookmarks.map(b => ({
      range: { startLineNumber: b.lineNumber, startColumn: 1, endLineNumber: b.lineNumber, endColumn: 1 },
      options: {
        isWholeLine: true,
        glyphMarginClassName: 'bookmark-glyph',
        glyphMarginHoverMessage: { value: `📌 Bookmark: Line ${b.lineNumber}` },
        className: 'bookmark-line-highlight',
      },
    }))

    const leftOldDecorations = originalEditor.deltaDecorations(bookmarkDecorationsRef.current[0] || [], leftDecorations)
    const rightOldDecorations = modifiedEditor.deltaDecorations(bookmarkDecorationsRef.current[1] || [], rightDecorations)

    bookmarkDecorationsRef.current = [leftOldDecorations, rightOldDecorations]
  }, [bookmarks])

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor

    const originalEditor = editor.getOriginalEditor()
    const modifiedEditor = editor.getModifiedEditor()

    // Listen for content changes
    originalEditor.onDidChangeModelContent(() => {
      if (onLeftContentChange) {
        onLeftContentChange(originalEditor.getValue())
      }
    })

    modifiedEditor.onDidChangeModelContent(() => {
      if (onRightContentChange) {
        onRightContentChange(modifiedEditor.getValue())
      }
    })

    // Listen for glyph margin clicks (line number area) for bookmarks
    originalEditor.onMouseDown((e: any) => {
      if (e.target.type === 2 && e.target.position) { // Glyph margin click
        const lineNumber = e.target.position.lineNumber
        onToggleBookmark?.(lineNumber, 'left')
      }
    })

    modifiedEditor.onMouseDown((e: any) => {
      if (e.target.type === 2 && e.target.position) { // Glyph margin click
        const lineNumber = e.target.position.lineNumber
        onToggleBookmark?.(lineNumber, 'right')
      }
    })

    // Listen for search events from keyboard shortcuts
    const handleSearchEvent = (e: CustomEvent) => {
      const { side, action } = e.detail

      if (action === 'open') {
        if (side === 'left') {
          openLeftSearch()
        } else {
          openRightSearch()
        }
      }
    }

    window.addEventListener('search-action', handleSearchEvent as EventListener)

    // Listen for bookmark navigation events
    const handleGotoBookmark = (e: CustomEvent) => {
      const { lineNumber, side } = e.detail
      const targetEditor = side === 'left' ? originalEditor : modifiedEditor
      targetEditor.revealLineInCenter(lineNumber)
      targetEditor.setPosition({ lineNumber, column: 1 })
      targetEditor.focus()
    }

    window.addEventListener('goto-bookmark', handleGotoBookmark as EventListener)

    // Notify parent that editor is ready
    window.dispatchEvent(new CustomEvent('diff-editor-ready', {
      detail: {
        getLeftContent: () => originalEditor.getValue(),
        getRightContent: () => modifiedEditor.getValue(),
        goToNextDiff: () => {
          editor.goToDiff('next')
        },
        goToPrevDiff: () => {
          editor.goToDiff('previous')
        },
        goToFirstDiff: () => {
          const modifiedEd = editor.getModifiedEditor()
          modifiedEd.setPosition({ lineNumber: 1, column: 1 })
          editor.goToDiff('next')
        },
        goToLastDiff: () => {
          const modEd = editor.getModifiedEditor()
          const lineCount = modEd.getModel()?.getLineCount() || 1
          modEd.setPosition({ lineNumber: lineCount, column: 1 })
          editor.goToDiff('previous')
        },
        openSearch: (side: 'left' | 'right') => {
          if (side === 'left') {
            openLeftSearch()
          } else {
            openRightSearch()
          }
        },
        goToLine: (lineNumber: number) => {
          const modifiedEd = editor.getModifiedEditor()
          modifiedEd.revealLineInCenter(lineNumber)
          modifiedEd.setPosition({ lineNumber, column: 1 })
          modifiedEd.focus()
        },
        getLineCount: () => {
          const modifiedEd = editor.getModifiedEditor()
          return modifiedEd.getModel()?.getLineCount() || 1
        },
        getCurrentLine: () => {
          const modifiedEd = editor.getModifiedEditor()
          return modifiedEd.getPosition()?.lineNumber || 1
        },
        getLeftLineCount: () => {
          return originalEditor.getModel()?.getLineCount() || 1
        },
        getRightLineCount: () => {
          return modifiedEditor.getModel()?.getLineCount() || 1
        },
        getLeftCurrentLine: () => {
          return originalEditor.getPosition()?.lineNumber || 1
        },
        getRightCurrentLine: () => {
          return modifiedEditor.getPosition()?.lineNumber || 1
        },
      }
    }))
  }

  // Listen for navigation events from toolbar
  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      if (!editorRef.current) return

      const { action } = e.detail
      const editor = editorRef.current

      switch (action) {
        case 'next':
          editor.goToDiff('next')
          break
        case 'prev':
          editor.goToDiff('previous')
          break
        case 'first':
          const modifiedEd = editor.getModifiedEditor()
          modifiedEd.setPosition({ lineNumber: 1, column: 1 })
          editor.goToDiff('next')
          break
        case 'last':
          const modEd = editor.getModifiedEditor()
          const lineCount = modEd.getModel()?.getLineCount() || 1
          modEd.setPosition({ lineNumber: lineCount, column: 1 })
          editor.goToDiff('previous')
          break
      }
    }

    window.addEventListener('diff-navigate', handleNavigate as EventListener)

    return () => {
      window.removeEventListener('diff-navigate', handleNavigate as EventListener)
    }
  }, [])

  // Listen for search keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        // Determine which side to search based on focus
        const activeElement = document.activeElement
        const leftPane = document.querySelector('.left-pane')
        const rightPane = document.querySelector('.right-pane')

        if (leftPane?.contains(activeElement)) {
          openLeftSearch()
        } else if (rightPane?.contains(activeElement)) {
          openRightSearch()
        } else {
          openRightSearch() // Default to right
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault()
        openRightSearch()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openLeftSearch, openRightSearch])

  if (!leftFile || !rightFile) {
    return (
      <div className="diff-viewer-empty">
        <div className="diff-empty-icon"><Zap size={48} /></div>
        <div className="diff-empty-title">Ready to Compare</div>
        <div className="diff-empty-subtitle">
          Select files on both sides to start comparing
        </div>
      </div>
    )
  }

  return (
    <div className="diff-container">
      <DiffEditor
        height="100%"
        language={leftFile.language || 'plaintext'}
        original={leftFile.content}
        modified={rightFile.content}
        options={{
          readOnly: false,
          minimap: { enabled: true },
          renderSideBySide: true,
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
          lineNumbers: 'on',
          folding: true,
          automaticLayout: true,
          renderOverviewRuler: true,
          ignoreTrimWhitespace: compareOptions?.ignoreTrimWhitespace ?? false,
          wordWrap: wordWrap,
          originalEditable: leftEditable,
          renderIndicators: true,
          find: {
            addExtraSpaceOnTop: false,
            autoFindInSelection: 'never',
            seedSearchStringFromSelection: 'selection',
          },
        }}
        theme="vs-dark"
        onMount={handleEditorMount}
      />

      {/* Search Panels */}
      <SearchPanel
        isOpen={leftSearchOpen}
        onClose={closeLeftSearch}
        editorRef={editorRef.current}
        side="left"
      />

      <SearchPanel
        isOpen={rightSearchOpen}
        onClose={closeRightSearch}
        editorRef={editorRef.current}
        side="right"
      />
    </div>
  )
}

// Helper function for external use
export function createDiffEditorHelper() {
  let getLeftContent: () => string = () => ''
  let getRightContent: () => string = () => ''
  let goToNextDiff: () => void = () => {}
  let goToPrevDiff: () => void = () => {}
  let goToFirstDiff: () => void = () => {}
  let goToLastDiff: () => void = () => {}
  let openSearch: (side: 'left' | 'right') => void = () => {}
  let goToLine: (lineNumber: number) => void = () => {}
  let getLineCount: () => number = () => 1
  let getCurrentLine: () => number = () => 1
  let getLeftLineCount: () => number = () => 1
  let getRightLineCount: () => number = () => 1
  let getLeftCurrentLine: () => number = () => 1
  let getRightCurrentLine: () => number = () => 1

  const handleReady = (e: CustomEvent) => {
    getLeftContent = e.detail.getLeftContent
    getRightContent = e.detail.getRightContent
    if (e.detail.goToNextDiff) goToNextDiff = e.detail.goToNextDiff
    if (e.detail.goToPrevDiff) goToPrevDiff = e.detail.goToPrevDiff
    if (e.detail.goToFirstDiff) goToFirstDiff = e.detail.goToFirstDiff
    if (e.detail.goToLastDiff) goToLastDiff = e.detail.goToLastDiff
    if (e.detail.openSearch) openSearch = e.detail.openSearch
    if (e.detail.goToLine) goToLine = e.detail.goToLine
    if (e.detail.getLineCount) getLineCount = e.detail.getLineCount
    if (e.detail.getCurrentLine) getCurrentLine = e.detail.getCurrentLine
    if (e.detail.getLeftLineCount) getLeftLineCount = e.detail.getLeftLineCount
    if (e.detail.getRightLineCount) getRightLineCount = e.detail.getRightLineCount
    if (e.detail.getLeftCurrentLine) getLeftCurrentLine = e.detail.getLeftCurrentLine
    if (e.detail.getRightCurrentLine) getRightCurrentLine = e.detail.getRightCurrentLine
  }

  window.addEventListener('diff-editor-ready', handleReady as EventListener)

  return {
    getLeftContent: () => getLeftContent(),
    getRightContent: () => getRightContent(),
    goToNextDiff,
    goToPrevDiff,
    goToFirstDiff,
    goToLastDiff,
    openSearch,
    goToLine,
    getLineCount,
    getCurrentLine,
    getLeftLineCount,
    getRightLineCount,
    getLeftCurrentLine,
    getRightCurrentLine,
    cleanup: () => window.removeEventListener('diff-editor-ready', handleReady as EventListener),
  }
}