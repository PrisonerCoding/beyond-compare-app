import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  GitBranch,
  GitCommitHorizontal,
  Clock,
  User,
  MessageSquare,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
  GitCompare,
  ArrowRight,
} from 'lucide-react'

export interface GitCommitInfo {
  hash: string
  shortHash: string
  author: string
  authorEmail: string
  date: string
  message: string
  parentHashes: string[]
}

export interface GitFileStatus {
  path: string
  status: string
  oldPath?: string
}

export interface GitBranchInfo {
  name: string
  isCurrent: boolean
  isRemote: boolean
  upstream?: string
}

interface GitHistoryPanelProps {
  repoPath: string
  onSelectCommit?: (commit: GitCommitInfo) => void
  onCompareCommits?: (commit1: GitCommitInfo, commit2: GitCommitInfo) => void
  onClose?: () => void
}

export function GitHistoryPanel({
  repoPath,
  onSelectCommit,
  onCompareCommits,
  onClose,
}: GitHistoryPanelProps) {
  const [commits, setCommits] = useState<GitCommitInfo[]>([])
  const [branches, setBranches] = useState<GitBranchInfo[]>([])
  const [currentBranch, setCurrentBranch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<GitCommitInfo | null>(null)
  const [commitFiles, setCommitFiles] = useState<GitFileStatus[]>([])
  const [compareCommit, setCompareCommit] = useState<GitCommitInfo | null>(null)
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set())
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    loadGitHistory()
  }, [repoPath])

  const loadGitHistory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Check if it's a git repo
      const isRepo = await invoke<boolean>('git_is_repo', { path: repoPath })
      if (!isRepo) {
        setError('Not a Git repository')
        setIsLoading(false)
        return
      }

      // Load commits
      const commitList = await invoke<GitCommitInfo[]>('git_log', { path: repoPath, limit })
      setCommits(commitList)

      // Load current branch
      const branch = await invoke<string>('git_get_current_branch', { path: repoPath })
      setCurrentBranch(branch)

      // Load branches
      const branchList = await invoke<GitBranchInfo[]>('git_branches', { path: repoPath })
      setBranches(branchList)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const loadCommitFiles = async (commit: GitCommitInfo) => {
    try {
      const files = await invoke<GitFileStatus[]>('git_show_files', {
        path: repoPath,
        commitHash: commit.hash,
      })
      setCommitFiles(files)
    } catch (err) {
      console.error('Failed to load commit files:', err)
    }
  }

  const handleCommitClick = (commit: GitCommitInfo) => {
    setSelectedCommit(commit)
    onSelectCommit?.(commit)

    // Toggle expand
    const newExpanded = new Set(expandedCommits)
    if (newExpanded.has(commit.hash)) {
      newExpanded.delete(commit.hash)
      setCommitFiles([])
    } else {
      newExpanded.add(commit.hash)
      loadCommitFiles(commit)
    }
    setExpandedCommits(newExpanded)
  }

  const handleCompareClick = (commit: GitCommitInfo) => {
    if (!compareCommit) {
      setCompareCommit(commit)
    } else if (compareCommit.hash !== commit.hash) {
      onCompareCommits?.(compareCommit, commit)
      setCompareCommit(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'A': return <ArrowRight size={12} className="status-icon added" />
      case 'M': return <RefreshCw size={12} className="status-icon modified" />
      case 'D': return '✕'
      case 'R': return <ArrowRight size={12} className="status-icon renamed" />
      case 'C': return <FileText size={12} className="status-icon copied" />
      default: return status
    }
  }

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays === 0) {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        if (diffHours === 0) {
          const diffMinutes = Math.floor(diffMs / (1000 * 60))
          return `${diffMinutes}m ago`
        }
        return `${diffHours}h ago`
      }
      if (diffDays < 7) return `${diffDays}d ago`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="git-history-panel">
      <div className="git-panel-header">
        <GitBranch size={16} />
        <span className="git-panel-title">Git History</span>
        <span className="git-current-branch">{currentBranch}</span>
        <button className="git-refresh-btn" onClick={loadGitHistory} disabled={isLoading}>
          <RefreshCw size={14} />
        </button>
        {onClose && (
          <button className="git-close-btn" onClick={onClose}>✕</button>
        )}
      </div>

      {/* Branch selector */}
      <div className="git-branch-selector">
        <select className="git-branch-select">
          {branches.filter(b => !b.isRemote).map(branch => (
            <option key={branch.name} selected={branch.isCurrent}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>

      {/* Compare indicator */}
      {compareCommit && (
        <div className="git-compare-indicator">
          Comparing: <strong>{compareCommit.shortHash}</strong>
          <button className="git-compare-cancel" onClick={() => setCompareCommit(null)}>
            ✕ Cancel
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="git-error">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="git-loading">Loading commits...</div>
      )}

      {/* Commit list */}
      <div className="git-commit-list">
        {commits.map(commit => (
          <div
            key={commit.hash}
            className={`git-commit-item ${selectedCommit?.hash === commit.hash ? 'selected' : ''} ${compareCommit?.hash === commit.hash ? 'compare-selected' : ''}`}
            onClick={() => handleCommitClick(commit)}
          >
            <div className="git-commit-header">
              <GitCommitHorizontal size={14} className="git-commit-icon" />
              <span className="git-commit-hash">{commit.shortHash}</span>
              <span className="git-commit-author">
                <User size={12} />
                {commit.author}
              </span>
              <span className="git-commit-date">
                <Clock size={12} />
                {formatDate(commit.date)}
              </span>
              {expandedCommits.has(commit.hash) ? (
                <ChevronDown size={12} className="git-expand-icon" />
              ) : (
                <ChevronRight size={12} className="git-expand-icon" />
              )}
            </div>

            <div className="git-commit-message">
              <MessageSquare size={12} />
              {commit.message.slice(0, 60)}{commit.message.length > 60 ? '...' : ''}
            </div>

            {/* Commit files */}
            {expandedCommits.has(commit.hash) && commitFiles.length > 0 && (
              <div className="git-commit-files">
                {commitFiles.map((file, idx) => (
                  <div key={idx} className="git-file-item">
                    {getStatusIcon(file.status)}
                    <span className="git-file-path">{file.path}</span>
                    {file.oldPath && (
                      <span className="git-file-old">(from {file.oldPath})</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Compare button */}
            <button
              className="git-compare-btn"
              onClick={(e) => {
                e.stopPropagation()
                handleCompareClick(commit)
              }}
              title="Compare with another commit"
            >
              <GitCompare size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Load more */}
      {commits.length >= limit && (
        <button
          className="git-load-more"
          onClick={() => {
            setLimit(limit + 50)
            loadGitHistory()
          }}
        >
          Load more commits
        </button>
      )}
    </div>
  )
}