import { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  Server,
  Globe,
  Key,
  User,
  Lock,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react'

export interface RemoteConfig {
  protocol: 'sftp' | 'ftp'
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  privateKeyPassphrase?: string
}

export interface RemoteFile {
  path: string
  name: string
  isDir: boolean
  size: number
  modified?: string
  permissions?: string
}

export interface ConnectionResult {
  success: boolean
  message: string
  fingerprint?: string
}

interface RemoteConnectionPanelProps {
  side: 'left' | 'right'
  onConnect?: (config: RemoteConfig) => void
  onSelectFile?: (config: RemoteConfig, file: RemoteFile) => void
  onClose?: () => void
}

export function RemoteConnectionPanel({
  side,
  onConnect,
  onSelectFile,
  onClose,
}: RemoteConnectionPanelProps) {
  const [protocol, setProtocol] = useState<'sftp' | 'ftp'>('sftp')
  const [host, setHost] = useState('')
  const [port, setPort] = useState(22)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [privateKeyPassphrase, setPrivateKeyPassphrase] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentPath, setCurrentPath] = useState('/')
  const [files, setFiles] = useState<RemoteFile[]>([])
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set())
  const [selectedFile, setSelectedFile] = useState<RemoteFile | null>(null)

  const defaultPorts = {
    sftp: 22,
    ftp: 21,
  }

  const handleProtocolChange = (newProtocol: 'sftp' | 'ftp') => {
    setProtocol(newProtocol)
    setPort(defaultPorts[newProtocol])
    setPrivateKey('')
    setPrivateKeyPassphrase('')
  }

  const handleConnect = async () => {
    if (!host || !username) {
      setConnectionResult({
        success: false,
        message: 'Host and username are required',
      })
      return
    }

    setIsConnecting(true)
    setConnectionResult(null)

    const config: RemoteConfig = {
      protocol,
      host,
      port,
      username,
      password: password || undefined,
      privateKey: privateKey || undefined,
      privateKeyPassphrase: privateKeyPassphrase || undefined,
    }

    try {
      const result = await invoke<ConnectionResult>('connect_remote', { config })
      setConnectionResult(result)

      if (result.success) {
        setIsConnected(true)
        onConnect?.(config)
        // Load root directory
        loadDirectory(config, '/')
      }
    } catch (error) {
      setConnectionResult({
        success: false,
        message: String(error),
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const loadDirectory = async (config: RemoteConfig, path: string) => {
    setIsLoadingFiles(true)

    try {
      const fileList = await invoke<RemoteFile[]>('list_remote_dir', { config, path })
      setFiles(fileList)
      setCurrentPath(path)
    } catch (error) {
      console.error('Failed to list directory:', error)
    } finally {
      setIsLoadingFiles(false)
    }
  }

  const handleFileClick = (file: RemoteFile) => {
    if (file.isDir) {
      // Toggle expand
      const newExpanded = new Set(expandedDirs)
      if (newExpanded.has(file.path)) {
        newExpanded.delete(file.path)
      } else {
        newExpanded.add(file.path)
        // Load subdirectory
        loadDirectory(getCurrentConfig(), file.path)
      }
      setExpandedDirs(newExpanded)
    } else {
      // Select file
      setSelectedFile(file)
      onSelectFile?.(getCurrentConfig(), file)
    }
  }

  const getCurrentConfig = (): RemoteConfig => ({
    protocol,
    host,
    port,
    username,
    password: password || undefined,
    privateKey: privateKey || undefined,
    privateKeyPassphrase: privateKeyPassphrase || undefined,
  })

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  return (
    <div className="remote-panel">
      <div className="remote-panel-header">
        <Server size={16} />
        <span className="remote-title">
          {side === 'left' ? 'L' : 'R'}: Remote Connection
        </span>
        {onClose && (
          <button className="remote-close-btn" onClick={onClose}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Connection form */}
      {!isConnected && (
        <div className="remote-form">
          {/* Protocol */}
          <div className="remote-field">
            <label className="remote-label">Protocol</label>
            <div className="remote-protocol-buttons">
              <button
                className={`remote-protocol-btn ${protocol === 'sftp' ? 'active' : ''}`}
                onClick={() => handleProtocolChange('sftp')}
              >
                <Globe size={14} />
                SFTP
              </button>
              <button
                className={`remote-protocol-btn ${protocol === 'ftp' ? 'active' : ''}`}
                onClick={() => handleProtocolChange('ftp')}
              >
                <Globe size={14} />
                FTP
              </button>
            </div>
          </div>

          {/* Host */}
          <div className="remote-field">
            <label className="remote-label">Host</label>
            <div className="remote-input-group">
              <Globe size={14} className="remote-input-icon" />
              <input
                type="text"
                placeholder="hostname or IP"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="remote-input"
              />
            </div>
          </div>

          {/* Port */}
          <div className="remote-field">
            <label className="remote-label">Port</label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(parseInt(e.target.value) || defaultPorts[protocol])}
              className="remote-input small"
            />
          </div>

          {/* Username */}
          <div className="remote-field">
            <label className="remote-label">Username</label>
            <div className="remote-input-group">
              <User size={14} className="remote-input-icon" />
              <input
                type="text"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="remote-input"
              />
            </div>
          </div>

          {/* Password */}
          <div className="remote-field">
            <label className="remote-label">Password</label>
            <div className="remote-input-group">
              <Lock size={14} className="remote-input-icon" />
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="remote-input"
              />
            </div>
          </div>

          {/* Private Key (SFTP only) */}
          {protocol === 'sftp' && (
            <div className="remote-field">
              <label className="remote-label">Private Key (optional)</label>
              <div className="remote-input-group">
                <Key size={14} className="remote-input-icon" />
                <textarea
                  placeholder="Paste private key content..."
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  className="remote-input textarea"
                />
              </div>
            </div>
          )}

          {/* Connection result */}
          {connectionResult && (
            <div className={`remote-result ${connectionResult.success ? 'success' : 'error'}`}>
              {connectionResult.success ? (
                <CheckCircle2 size={14} />
              ) : (
                <AlertCircle size={14} />
              )}
              <span>{connectionResult.message}</span>
              {connectionResult.fingerprint && (
                <span className="remote-fingerprint">
                  Key: {connectionResult.fingerprint.slice(0, 20)}...
                </span>
              )}
            </div>
          )}

          {/* Connect button */}
          <button
            className="remote-connect-btn"
            onClick={handleConnect}
            disabled={isConnecting || !host || !username}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      )}

      {/* File browser */}
      {isConnected && (
        <div className="remote-browser">
          {/* Path navigation */}
          <div className="remote-path-bar">
            <FolderOpen size={14} />
            <span className="remote-current-path">{currentPath}</span>
            <button
              className="remote-refresh-btn"
              onClick={() => loadDirectory(getCurrentConfig(), currentPath)}
              disabled={isLoadingFiles}
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* File list */}
          <div className="remote-file-list">
            {isLoadingFiles ? (
              <div className="remote-loading">Loading...</div>
            ) : files.length === 0 ? (
              <div className="remote-empty">No files</div>
            ) : (
              files.map((file, idx) => (
                <div
                  key={idx}
                  className={`remote-file-item ${selectedFile?.path === file.path ? 'selected' : ''}`}
                  onClick={() => handleFileClick(file)}
                >
                  {file.isDir ? (
                    <Folder size={14} className="remote-file-icon dir" />
                  ) : (
                    <File size={14} className="remote-file-icon file" />
                  )}
                  <span className="remote-file-name">{file.name}</span>
                  {!file.isDir && (
                    <span className="remote-file-size">{formatFileSize(file.size)}</span>
                  )}
                  {file.isDir && expandedDirs.has(file.path) && (
                    <ChevronDown size={12} className="remote-expand-icon" />
                  )}
                  {file.isDir && !expandedDirs.has(file.path) && (
                    <ChevronRight size={12} className="remote-expand-icon" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Disconnect button */}
          <button
            className="remote-disconnect-btn"
            onClick={() => {
              setIsConnected(false)
              setFiles([])
              setSelectedFile(null)
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}