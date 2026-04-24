import { useState, useRef, useEffect, useCallback } from 'react'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import { listen } from '@tauri-apps/api/event'
import { Toolbar } from './components/Toolbar'
import { FileSelector } from './components/FileSelector'
import { FolderSelector } from './components/FolderSelector'
import { DiffViewer, createDiffEditorHelper } from './components/DiffViewer'
import { FolderDiffViewer } from './components/FolderDiffViewer'
import { BinaryViewer } from './components/BinaryViewer'
import { MergeActions } from './components/MergeActions'
import { FilterPanel } from './components/FilterPanel'
import { ThreeWayMerge } from './components/ThreeWayMerge'
import { ImageDiffViewer } from './components/ImageDiffViewer'
import { ArchiveDiffViewer } from './components/ArchiveDiffViewer'
import { AudioDiffViewer } from './components/AudioDiffViewer'
import { GoToLineDialog } from './components/GoToLineDialog'
import { CompareOptionsPanel } from './components/CompareOptionsPanel'
import { BookmarkPanel } from './components/BookmarkPanel'
import { DiffStatsPanel } from './components/DiffStatsPanel'
import { SnapshotPanel } from './components/SnapshotPanel'
import { computeDiffStats, getLanguageFromPath } from './utils/diff'
import { isBinaryFile } from './utils/binaryCheck'
import { compareFolders, getFolderStats } from './utils/folderCompare'
import { saveSession, loadSession, loadSessionFromPath, addRecentSession, type SessionData } from './utils/session'
import { generateDiffReport, generateBinaryReport, generateFolderReport, downloadReport } from './utils/exportReport'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useLayoutMode } from './hooks/useLayoutMode'
import { useWordWrap } from './hooks/useWordWrap'
import { useCompareOptions } from './hooks/useCompareOptions'
import { useBookmarks } from './hooks/useBookmarks'
import type { FileContent, CompareMode, FolderItem, CompareRule } from './types'
import './App.css'

const DEFAULT_FILTERS = [
  'node_modules',
  '.git',
  '.svn',
  '.DS_Store',
  'Thumbs.db',
  '*.log',
  'dist',
  'build',
  'target',
]

function App() {
  // Text mode state
  const [leftFile, setLeftFile] = useState<FileContent | null>(null)
  const [rightFile, setRightFile] = useState<FileContent | null>(null)
  const [hasLeftChanges, setHasLeftChanges] = useState(false)
  const [hasRightChanges, setHasRightChanges] = useState(false)

  // Folder mode state
  const [leftFolder, setLeftFolder] = useState<FolderItem | null>(null)
  const [rightFolder, setRightFolder] = useState<FolderItem | null>(null)
  const [folderDiffItems, setFolderDiffItems] = useState<FolderItem[]>([])
  const [isComparingFolders, setIsComparingFolders] = useState(false)
  const [filters, setFilters] = useState<string[]>(DEFAULT_FILTERS)
  const [compareRule, setCompareRule] = useState<CompareRule>('content')
  const [showSnapshotPanel, setShowSnapshotPanel] = useState(false)
  const [alignmentMap, setAlignmentMap] = useState<Record<string, string>>({})

  // Common state
  const [currentMode, setCurrentMode] = useState<CompareMode>({
    type: 'text',
    label: 'Text',
  })
  const [isDragging, setIsDragging] = useState(false)
  const [diffCount, setDiffCount] = useState(0)
  const [currentDiffIndex, setCurrentDiffIndex] = useState(0)
  const [goToLineOpen, setGoToLineOpen] = useState(false)

  const { layoutMode, setLayoutMode } = useLayoutMode()
  const { wordWrap, setWordWrap } = useWordWrap()
  const { options: compareOptions, toggleOption: toggleCompareOption, resetOptions: resetCompareOptions } = useCompareOptions()
  const { bookmarks, toggleBookmark, clearBookmarks, goToBookmark, removeBookmark, nextBookmark, prevBookmark } = useBookmarks()
  const [showCompareOptions, setShowCompareOptions] = useState(false)
  const [showBookmarkPanel, setShowBookmarkPanel] = useState(false)
  const [showDiffStats, setShowDiffStats] = useState(false)

  const diffHelperRef = useRef<ReturnType<typeof createDiffEditorHelper> | null>(null)

  useEffect(() => {
    diffHelperRef.current = createDiffEditorHelper()
    return () => {
      diffHelperRef.current?.cleanup()
    }
  }, [])

  // Update diff info when files change
  useEffect(() => {
    if (leftFile && rightFile) {
      const changes = computeDiffStats(leftFile.content, rightFile.content)
      setDiffCount(changes.added + changes.removed + changes.modified)
      setCurrentDiffIndex(0)
    } else {
      setDiffCount(0)
      setCurrentDiffIndex(0)
    }
  }, [leftFile, rightFile])

  // Compare folders when both are selected (with filters)
  const refreshFolderComparison = useCallback(() => {
    if (leftFolder && rightFolder) {
      setIsComparingFolders(true)
      compareFolders(leftFolder.path, rightFolder.path, { ignorePatterns: filters })
        .then((items) => {
          setFolderDiffItems(items)
          setIsComparingFolders(false)
        })
        .catch((error) => {
          console.error('Failed to compare folders:', error)
          setIsComparingFolders(false)
        })
    }
  }, [leftFolder, rightFolder, filters])

  useEffect(() => {
    if (currentMode.type === 'folder' && leftFolder && rightFolder) {
      refreshFolderComparison()
    }
  }, [currentMode.type, leftFolder, rightFolder, filters, refreshFolderComparison])

  // Reset state when mode changes
  useEffect(() => {
    if (currentMode.type === 'text') {
      setLeftFolder(null)
      setRightFolder(null)
      setFolderDiffItems([])
    } else if (currentMode.type === 'folder') {
      setLeftFile(null)
      setRightFile(null)
      setHasLeftChanges(false)
      setHasRightChanges(false)
    } else if (currentMode.type === 'merge' || currentMode.type === 'binary' || currentMode.type === 'image') {
      setLeftFolder(null)
      setRightFolder(null)
      setFolderDiffItems([])
    }
  }, [currentMode.type])

  // Drag and drop support
  useEffect(() => {
    let unlisteners: (() => void)[] = []

    const setupListeners = async () => {
      const unlistenDrag = await listen('tauri://drag', () => {
        setIsDragging(true)
      })
      unlisteners.push(unlistenDrag)

      const unlistenDrop = await listen<{ paths: string[] }>('tauri://drop', async (event) => {
        setIsDragging(false)
        const paths = event.payload.paths

        if (paths.length > 0) {
          const droppedPath = paths[0]

          if (isBinaryFile(droppedPath)) {
            console.warn('Binary file dropped, cannot display as text:', droppedPath)
            return
          }

          try {
            const content = await readTextFile(droppedPath)

            const newFile: FileContent = {
              path: droppedPath,
              content: content,
              language: getLanguageFromPath(droppedPath),
            }

            if (currentMode.type === 'text') {
              if (!leftFile) {
                setLeftFile(newFile)
              } else if (!rightFile) {
                setRightFile(newFile)
              } else {
                setRightFile(newFile)
              }
            }
          } catch (error) {
            console.error('Failed to read dropped file:', error)
          }
        }
      })
      unlisteners.push(unlistenDrop)

      const unlistenDragEnd = await listen('tauri://drag-end', () => {
        setIsDragging(false)
      })
      unlisteners.push(unlistenDragEnd)
    }

    setupListeners()

    return () => {
      unlisteners.forEach((fn) => fn())
    }
  }, [leftFile, rightFile, currentMode.type])

  // Reset changes when files change
  useEffect(() => {
    setHasLeftChanges(false)
    setHasRightChanges(false)
  }, [leftFile?.path, rightFile?.path])

  const handleSwap = () => {
    if (currentMode.type === 'text') {
      const temp = leftFile
      setLeftFile(rightFile)
      setRightFile(temp)
    } else {
      const temp = leftFolder
      setLeftFolder(rightFolder)
      setRightFolder(temp)
    }
  }

  const handleRefresh = () => {
    if (currentMode.type === 'text') {
      setLeftFile(null)
      setRightFile(null)
      setHasLeftChanges(false)
      setHasRightChanges(false)
    } else {
      refreshFolderComparison()
    }
  }

  const handleMergeLeftToRight = () => {
    if (!leftFile || !rightFile) return
    setRightFile({
      ...rightFile,
      content: leftFile.content,
      language: leftFile.language,
    })
    setHasRightChanges(true)
  }

  const handleMergeRightToLeft = () => {
    if (!leftFile || !rightFile) return
    setLeftFile({
      ...leftFile,
      content: rightFile.content,
      language: rightFile.language,
    })
    setHasLeftChanges(true)
  }

  const handleSaveLeft = async () => {
    if (!leftFile) return

    try {
      const filePath = await save({
        defaultPath: leftFile.path,
        filters: [
          {
            name: 'Text File',
            extensions: ['txt', leftFile.language || 'txt'],
          },
        ],
      })

      if (filePath) {
        const content = diffHelperRef.current?.getLeftContent() || leftFile.content
        await writeTextFile(filePath, content)
        setLeftFile({
          ...leftFile,
          path: filePath,
          content: content,
        })
        setHasLeftChanges(false)
      }
    } catch (error) {
      console.error('Failed to save left file:', error)
    }
  }

  const handleSaveRight = async () => {
    if (!rightFile) return

    try {
      const filePath = await save({
        defaultPath: rightFile.path,
        filters: [
          {
            name: 'Text File',
            extensions: ['txt', rightFile.language || 'txt'],
          },
        ],
      })

      if (filePath) {
        const content = diffHelperRef.current?.getRightContent() || rightFile.content
        await writeTextFile(filePath, content)
        setRightFile({
          ...rightFile,
          path: filePath,
          content: content,
        })
        setHasRightChanges(false)
      }
    } catch (error) {
      console.error('Failed to save right file:', error)
    }
  }

  const handleLeftContentChange = (content: string) => {
    if (leftFile && content !== leftFile.content) {
      setHasLeftChanges(true)
    }
  }

  const handleRightContentChange = (content: string) => {
    if (rightFile && content !== rightFile.content) {
      setHasRightChanges(true)
    }
  }

  const handleFileSelectFromFolder = async (
    selectedLeftFile: FileContent,
    selectedRightFile: FileContent | null
  ) => {
    try {
      const leftContent = await readTextFile(selectedLeftFile.path)
      setLeftFile({
        ...selectedLeftFile,
        content: leftContent,
      })

      if (selectedRightFile) {
        const rightContent = await readTextFile(selectedRightFile.path)
        setRightFile({
          ...selectedRightFile,
          content: rightContent,
        })
      } else {
        setRightFile(null)
      }

      setCurrentMode({ type: 'text', label: 'Text' })
    } catch (error) {
      console.error('Failed to load files from folder:', error)
    }
  }

  // 从文件夹双击打开文件到指定模式
  const handleOpenInMode = async (
    mode: 'text' | 'image' | 'audio' | 'archive' | 'binary' | 'folder',
    leftPath: string,
    rightPath: string | null
  ) => {
    try {
      // 设置左文件
      setLeftFile({
        path: leftPath,
        content: mode === 'text' ? await readTextFile(leftPath) : '',
        language: getLanguageFromPath(leftPath),
      })

      // 设置右文件（如果存在）
      if (rightPath) {
        setRightFile({
          path: rightPath,
          content: mode === 'text' ? await readTextFile(rightPath) : '',
          language: getLanguageFromPath(rightPath),
        })
      } else {
        setRightFile(null)
      }

      // 切换到目标模式
      const modeLabels: Record<string, string> = {
        text: 'Text',
        image: 'Image',
        audio: 'Audio',
        archive: 'Archive',
        binary: 'Binary',
        folder: 'Folder',
      }
      setCurrentMode({ type: mode, label: modeLabels[mode] })
    } catch (error) {
      console.error('Failed to open files in mode:', error)
    }
  }

  const getDiffStats = () => {
    if (!leftFile || !rightFile) return null
    return {
      leftLines: leftFile.content.split('\n').length,
      rightLines: rightFile.content.split('\n').length,
    }
  }

  const getDiffChanges = () => {
    if (!leftFile || !rightFile) return null
    return computeDiffStats(leftFile.content, rightFile.content)
  }

  const getFolderDiffStats = () => {
    if (folderDiffItems.length === 0) return null
    return getFolderStats(folderDiffItems)
  }

  const stats = currentMode.type === 'text' ? getDiffStats() : null
  const changes = currentMode.type === 'text' ? getDiffChanges() : null
  const folderStats = currentMode.type === 'folder' ? getFolderDiffStats() : null

  const handleOpenLeft = async () => {
    if (currentMode.type === 'folder') {
      const selected = await open({
        multiple: false,
        directory: true,
        title: 'Select Left Folder',
      })

      if (selected && typeof selected === 'string') {
        setLeftFolder({
          path: selected,
          name: selected.split(/[/\\]/).pop() || selected,
          type: 'folder',
          status: 'equal',
          children: [],
        })
      }
    } else {
      const selected = await open({
        multiple: false,
        title: 'Select Left File',
      })

      if (selected && typeof selected === 'string') {
        const content = await readTextFile(selected)
        setLeftFile({
          path: selected,
          content: content,
          language: getLanguageFromPath(selected),
        })
      }
    }
  }

  const handleOpenRight = async () => {
    if (currentMode.type === 'folder') {
      const selected = await open({
        multiple: false,
        directory: true,
        title: 'Select Right Folder',
      })

      if (selected && typeof selected === 'string') {
        setRightFolder({
          path: selected,
          name: selected.split(/[/\\]/).pop() || selected,
          type: 'folder',
          status: 'equal',
          children: [],
        })
      }
    } else {
      const selected = await open({
        multiple: false,
        title: 'Select Right File',
      })

      if (selected && typeof selected === 'string') {
        const content = await readTextFile(selected)
        setRightFile({
          path: selected,
          content: content,
          language: getLanguageFromPath(selected),
        })
      }
    }
  }

  const handlePrevDiff = () => {
    diffHelperRef.current?.goToPrevDiff()
    window.dispatchEvent(new CustomEvent('diff-navigate', { detail: { action: 'prev' } }))
  }

  const handleNextDiff = () => {
    diffHelperRef.current?.goToNextDiff()
    window.dispatchEvent(new CustomEvent('diff-navigate', { detail: { action: 'next' } }))
  }

  const handleFirstDiff = () => {
    diffHelperRef.current?.goToFirstDiff()
    window.dispatchEvent(new CustomEvent('diff-navigate', { detail: { action: 'first' } }))
  }

  const handleLastDiff = () => {
    diffHelperRef.current?.goToLastDiff()
    window.dispatchEvent(new CustomEvent('diff-navigate', { detail: { action: 'last' } }))
  }

  const handleGoToLine = () => {
    setGoToLineOpen(true)
  }

  const handleGoToLineSubmit = (lineNumber: number) => {
    diffHelperRef.current?.goToLine(lineNumber)
  }

  const handleNextBookmark = () => {
    const currentLine = diffHelperRef.current?.getRightCurrentLine() || 1
    const bookmark = nextBookmark(currentLine, 'right')
    if (bookmark) {
      goToBookmark(bookmark)
    }
  }

  const handlePrevBookmark = () => {
    const currentLine = diffHelperRef.current?.getRightCurrentLine() || 1
    const bookmark = prevBookmark(currentLine, 'right')
    if (bookmark) {
      goToBookmark(bookmark)
    }
  }

  const handleNewSession = () => {
    handleRefresh()
  }

  const handleExportReport = async () => {
    try {
      // Folder mode
      if (currentMode.type === 'folder' && leftFolder && rightFolder) {
        const leftName = leftFolder.path.split(/[/\\]/).pop() || 'left'
        const rightName = rightFolder.path.split(/[/\\]/).pop() || 'right'
        const fileName = `folder-report-${leftName}-vs-${rightName}.html`

        const stats = getFolderDiffStats()
        const htmlContent = generateFolderReport({
          leftFolder,
          rightFolder,
          stats,
          filters,
        })
        const success = await downloadReport(htmlContent, fileName)
        if (success) {
          console.log('Report saved successfully')
        }
        return
      }

      // File modes (text, image, binary, audio, archive)
      if (!leftFile || !rightFile) return

      const leftName = leftFile.path.split(/[/\\]/).pop() || 'left'
      const rightName = rightFile.path.split(/[/\\]/).pop() || 'right'
      const fileName = `diff-report-${leftName}-vs-${rightName}.html`

      // For text mode, generate detailed diff report
      if (currentMode.type === 'text' && leftFile.content && rightFile.content) {
        const stats = computeDiffStats(leftFile.content, rightFile.content)
        const htmlContent = generateDiffReport({
          leftFile,
          rightFile,
          diffStats: stats,
          showLineNumbers: true,
        })
        const success = await downloadReport(htmlContent, fileName)
        if (success) {
          console.log('Report saved successfully')
        }
      } else {
        // For binary/image/audio modes, generate comparison report with detailed info
        const htmlContent = await generateBinaryReport({
          leftFile,
          rightFile,
          mode: currentMode.type,
        })
        const success = await downloadReport(htmlContent, fileName)
        if (success) {
          console.log('Report saved successfully')
        }
      }
    } catch (error) {
      console.error('Failed to export report:', error)
    }
  }

  const handleSaveSession = async () => {
    const sessionData: SessionData = {
      version: '1.0',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      mode: currentMode.type,
      left: leftFile ? { type: 'file', path: leftFile.path } :
            leftFolder ? { type: 'folder', path: leftFolder.path } : null,
      right: rightFile ? { type: 'file', path: rightFile.path } :
             rightFolder ? { type: 'folder', path: rightFolder.path } : null,
      filters: currentMode.type === 'folder' ? filters : undefined,
    }

    try {
      const savedPath = await saveSession(sessionData)
      if (savedPath) {
        addRecentSession(sessionData, savedPath)
      }
    } catch (error) {
      console.error('Failed to save session:', error)
    }
  }

  const handleOpenSession = async () => {
    try {
      const sessionData = await loadSession()
      if (!sessionData) return

      // Apply session
      setCurrentMode({
        type: sessionData.mode,
        label: sessionData.mode.charAt(0).toUpperCase() + sessionData.mode.slice(1),
      })

      if (sessionData.filters) {
        setFilters(sessionData.filters)
      }

      // Load files/folders
      if (sessionData.left) {
        if (sessionData.left.type === 'file') {
          try {
            const content = await readTextFile(sessionData.left.path)
            setLeftFile({
              path: sessionData.left.path,
              content,
              language: getLanguageFromPath(sessionData.left.path),
            })
          } catch {
            console.warn('Failed to load left file from session')
          }
        } else {
          setLeftFolder({
            path: sessionData.left.path,
            name: sessionData.left.path.split(/[/\\]/).pop() || sessionData.left.path,
            type: 'folder',
            status: 'equal',
            children: [],
          })
        }
      }

      if (sessionData.right) {
        if (sessionData.right.type === 'file') {
          try {
            const content = await readTextFile(sessionData.right.path)
            setRightFile({
              path: sessionData.right.path,
              content,
              language: getLanguageFromPath(sessionData.right.path),
            })
          } catch {
            console.warn('Failed to load right file from session')
          }
        } else {
          setRightFolder({
            path: sessionData.right.path,
            name: sessionData.right.path.split(/[/\\]/).pop() || sessionData.right.path,
            type: 'folder',
            status: 'equal',
            children: [],
          })
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }

  const handleOpenRecentSession = async (filePath: string) => {
    try {
      const sessionData = await loadSessionFromPath(filePath)

      // Apply session
      setCurrentMode({
        type: sessionData.mode,
        label: sessionData.mode.charAt(0).toUpperCase() + sessionData.mode.slice(1),
      })

      if (sessionData.filters) {
        setFilters(sessionData.filters)
      }

      // Load files/folders
      if (sessionData.left) {
        if (sessionData.left.type === 'file') {
          try {
            const content = await readTextFile(sessionData.left.path)
            setLeftFile({
              path: sessionData.left.path,
              content,
              language: getLanguageFromPath(sessionData.left.path),
            })
          } catch {
            console.warn('Failed to load left file from session')
          }
        } else {
          setLeftFolder({
            path: sessionData.left.path,
            name: sessionData.left.path.split(/[/\\]/).pop() || sessionData.left.path,
            type: 'folder',
            status: 'equal',
            children: [],
          })
        }
      }

      if (sessionData.right) {
        if (sessionData.right.type === 'file') {
          try {
            const content = await readTextFile(sessionData.right.path)
            setRightFile({
              path: sessionData.right.path,
              content,
              language: getLanguageFromPath(sessionData.right.path),
            })
          } catch {
            console.warn('Failed to load right file from session')
          }
        } else {
          setRightFolder({
            path: sessionData.right.path,
            name: sessionData.right.path.split(/[/\\]/).pop() || sessionData.right.path,
            type: 'folder',
            status: 'equal',
            children: [],
          })
        }
      }
    } catch (error) {
      console.error('Failed to load recent session:', error)
    }
  }

  useKeyboardShortcuts({
    onSaveLeft: handleSaveLeft,
    onSaveRight: handleSaveRight,
    onOpenLeft: handleOpenLeft,
    onOpenRight: handleOpenRight,
    onSwap: handleSwap,
    onRefresh: handleRefresh,
    onNextDiff: handleNextDiff,
    onPrevDiff: handlePrevDiff,
    onNewSession: handleNewSession,
    onOpenSession: handleOpenSession,
    onSaveSession: handleSaveSession,
    onGoToLine: handleGoToLine,
  })

  const hasFiles = (currentMode.type === 'text' || currentMode.type === 'image' || currentMode.type === 'binary' || currentMode.type === 'audio' || currentMode.type === 'archive') && !!leftFile && !!rightFile
  const hasFolders = currentMode.type === 'folder' && !!leftFolder && !!rightFolder
  const canExport = hasFiles || hasFolders

  return (
    <div className={`App ${isDragging ? 'dragging' : ''} ${layoutMode === 'vertical' ? 'vertical-layout' : ''}`}>
      <Toolbar
        currentMode={currentMode}
        onModeChange={setCurrentMode}
        onSwap={handleSwap}
        onRefresh={handleRefresh}
        onNewSession={handleNewSession}
        onOpenSession={handleOpenSession}
        onSaveSession={handleSaveSession}
        onOpenRecentSession={handleOpenRecentSession}
        onPrevDiff={handlePrevDiff}
        onNextDiff={handleNextDiff}
        onFirstDiff={handleFirstDiff}
        onLastDiff={handleLastDiff}
        onGoToLine={handleGoToLine}
        layoutMode={layoutMode}
        onLayoutChange={setLayoutMode}
        wordWrap={wordWrap}
        onWordWrapChange={setWordWrap}
        showCompareOptions={showCompareOptions}
        onToggleCompareOptions={() => setShowCompareOptions(!showCompareOptions)}
        showBookmarkPanel={showBookmarkPanel}
        onToggleBookmarkPanel={() => setShowBookmarkPanel(!showBookmarkPanel)}
        bookmarkCount={bookmarks.length}
        onPrevBookmark={handlePrevBookmark}
        onNextBookmark={handleNextBookmark}
        onExportReport={handleExportReport}
        showDiffStats={showDiffStats}
        onToggleDiffStats={() => setShowDiffStats(!showDiffStats)}
        diffCount={diffCount}
        currentDiffIndex={currentDiffIndex}
        hasFiles={canExport}
        showSnapshotPanel={showSnapshotPanel}
        onToggleSnapshotPanel={() => setShowSnapshotPanel(!showSnapshotPanel)}
      />

      {/* Compare Options Panel */}
      {currentMode.type === 'text' && showCompareOptions && (
        <CompareOptionsPanel
          options={compareOptions}
          onToggleOption={toggleCompareOption}
          onReset={resetCompareOptions}
        />
      )}

      {/* File/Folder selectors based on mode */}
      {currentMode.type === 'text' || currentMode.type === 'image' || currentMode.type === 'audio' || currentMode.type === 'archive' || currentMode.type === 'binary' ? (
        <div className="file-selectors">
          <FileSelector
            label="Left"
            badge="L"
            file={leftFile}
            onSelect={setLeftFile}
            onClear={() => setLeftFile(null)}
            allowBinary={currentMode.type !== 'text'}
          />
          <FileSelector
            label="Right"
            badge="R"
            file={rightFile}
            onSelect={setRightFile}
            onClear={() => setRightFile(null)}
            allowBinary={currentMode.type !== 'text'}
          />
        </div>
      ) : (
        <div className="file-selectors">
          <FolderSelector
            label="Left"
            badge="L"
            folder={leftFolder}
            onSelect={setLeftFolder}
            onClear={() => setLeftFolder(null)}
          />
          <FolderSelector
            label="Right"
            badge="R"
            folder={rightFolder}
            onSelect={setRightFolder}
            onClear={() => setRightFolder(null)}
          />
        </div>
      )}

      {/* Filter panel (only for folder mode) */}
      {currentMode.type === 'folder' && (
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
        />
      )}

      {/* Merge actions (only for text mode) */}
      {currentMode.type === 'text' && (
        <MergeActions
          leftFile={leftFile}
          rightFile={rightFile}
          onMergeLeftToRight={handleMergeLeftToRight}
          onMergeRightToLeft={handleMergeRightToLeft}
          onSaveLeft={handleSaveLeft}
          onSaveRight={handleSaveRight}
          onLeftContentChange={handleLeftContentChange}
          onRightContentChange={handleRightContentChange}
          hasLeftChanges={hasLeftChanges}
          hasRightChanges={hasRightChanges}
        />
      )}

      {/* Diff viewer based on mode */}
      {currentMode.type === 'text' && (
        <DiffViewer
          leftFile={leftFile}
          rightFile={rightFile}
          onLeftContentChange={handleLeftContentChange}
          onRightContentChange={handleRightContentChange}
          leftEditable={true}
          rightEditable={true}
          wordWrap={wordWrap}
          compareOptions={compareOptions}
          bookmarks={bookmarks}
          onToggleBookmark={toggleBookmark}
        />
      )}

      {currentMode.type === 'folder' && (
        <FolderDiffViewer
          leftFolder={leftFolder}
          rightFolder={rightFolder}
          diffItems={folderDiffItems}
          onFileSelect={handleFileSelectFromFolder}
          onOpenInMode={handleOpenInMode}
          onRefresh={refreshFolderComparison}
          compareRule={compareRule}
          onCompareRuleChange={setCompareRule}
          alignmentMap={alignmentMap}
          onAlignmentChange={setAlignmentMap}
        />
      )}

      {/* Snapshot Panel */}
      {showSnapshotPanel && (
        <SnapshotPanel
          isOpen={showSnapshotPanel}
          onClose={() => setShowSnapshotPanel(false)}
          currentFolder={leftFolder?.path ?? null}
          onLoadSnapshot={(snapshot) => {
            console.log('Loaded snapshot:', snapshot.name)
            setShowSnapshotPanel(false)
          }}
        />
      )}

      {currentMode.type === 'binary' && (
        <BinaryViewer
          leftPath={leftFile?.path ?? null}
          rightPath={rightFile?.path ?? null}
        />
      )}

      {currentMode.type === 'merge' && (
        <ThreeWayMerge
          onMergeComplete={(result) => {
            console.log('Merge completed:', result)
          }}
        />
      )}

      {currentMode.type === 'image' && (
        <ImageDiffViewer
          leftPath={leftFile?.path ?? null}
          rightPath={rightFile?.path ?? null}
        />
      )}

      {currentMode.type === 'archive' && (
        <ArchiveDiffViewer
          leftPath={leftFile?.path ?? null}
          rightPath={rightFile?.path ?? null}
          onFileExtract={(leftContent, rightContent, entryPath) => {
            // Convert extracted files to text and switch to text mode
            const leftText = leftContent ? new TextDecoder().decode(leftContent) : null
            const rightText = rightContent ? new TextDecoder().decode(rightContent) : null

            if (leftText) {
              setLeftFile({
                path: `${leftFile?.path || 'archive'}:${entryPath}`,
                content: leftText,
                language: getLanguageFromPath(entryPath),
              })
            }

            if (rightText) {
              setRightFile({
                path: `${rightFile?.path || 'archive'}:${entryPath}`,
                content: rightText,
                language: getLanguageFromPath(entryPath),
              })
            }

            setCurrentMode({ type: 'text', label: 'Text' })
          }}
        />
      )}

      {currentMode.type === 'audio' && (
        <AudioDiffViewer
          leftPath={leftFile?.path ?? null}
          rightPath={rightFile?.path ?? null}
        />
      )}

      {/* Go to Line Dialog */}
      <GoToLineDialog
        isOpen={goToLineOpen}
        onClose={() => setGoToLineOpen(false)}
        onGoToLine={handleGoToLineSubmit}
        maxLines={diffHelperRef.current?.getLineCount() || 1}
        currentLine={diffHelperRef.current?.getCurrentLine() || 1}
      />

      {/* Bookmark Panel */}
      <BookmarkPanel
        bookmarks={bookmarks}
        onGoToBookmark={goToBookmark}
        onRemoveBookmark={(bookmark) => removeBookmark(bookmark.lineNumber, bookmark.side)}
        onClearBookmarks={clearBookmarks}
        isOpen={showBookmarkPanel}
        onClose={() => setShowBookmarkPanel(false)}
      />

      {/* Diff Statistics Panel */}
      <DiffStatsPanel
        leftFile={leftFile}
        rightFile={rightFile}
        isOpen={showDiffStats}
        onClose={() => setShowDiffStats(false)}
      />

      {/* Status bar */}
      <div className="status-bar">
        <div className="status-section">
          <div className={`status-item ${hasFiles || hasFolders ? 'success' : ''}`}>
            <span className="status-icon">
              {hasFiles || hasFolders ? '✓' : '○'}
            </span>
            {hasFiles ? 'Files loaded' : hasFolders ? 'Folders loaded' : 'Select files/folders'}
          </div>

          {stats && (
            <div className="status-item">
              <span className="status-icon">📊</span>
              L: {stats.leftLines} lines | R: {stats.rightLines} lines
            </div>
          )}

          {changes && (changes.added > 0 || changes.removed > 0 || changes.modified > 0) && (
            <div className="status-item diff-stats">
              <span className="stat-added" title="Added lines">+{changes.added}</span>
              <span className="stat-removed" title="Removed lines">-{changes.removed}</span>
              <span className="stat-modified" title="Modified lines">~{changes.modified}</span>
            </div>
          )}

          {folderStats && (folderStats.added > 0 || folderStats.removed > 0 || folderStats.modified > 0) && (
            <div className="status-item diff-stats">
              <span className="stat-added" title="Added files">+{folderStats.added}</span>
              <span className="stat-removed" title="Removed files">-{folderStats.removed}</span>
              <span className="stat-modified" title="Modified files">~{folderStats.modified}</span>
            </div>
          )}

          {(hasLeftChanges || hasRightChanges) && (
            <div className="status-item warning">
              <span className="status-icon">⚠️</span>
              Unsaved changes
            </div>
          )}

          {isComparingFolders && (
            <div className="status-item">
              <span className="status-icon">⏳</span>
              Comparing folders...
            </div>
          )}
        </div>

        <div className="status-right">
          <div className="status-item">
            Mode: {currentMode.label}
          </div>
          <div className="status-version">v0.1.0</div>
        </div>
      </div>
    </div>
  )
}

export default App