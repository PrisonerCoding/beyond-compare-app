import { useState, useEffect, useRef, useCallback } from 'react'
import { readFile } from '@tauri-apps/plugin-fs'
import {
  decodeAudioFile,
  formatDuration,
  compareWaveforms,
  getAudioMimeType,
  type WaveformData,
  type AudioInfo,
} from '../utils/audioAnalysis'
import { Play, Pause, Volume2, VolumeX, ZoomIn, ZoomOut } from 'lucide-react'

interface AudioDiffViewerProps {
  leftPath: string | null
  rightPath: string | null
}

interface AudioData {
  path: string
  waveformData: WaveformData
  audioInfo: AudioInfo
  audioUrl: string // For playback
}

export function AudioDiffViewer({ leftPath, rightPath }: AudioDiffViewerProps) {
  const [leftAudio, setLeftAudio] = useState<AudioData | null>(null)
  const [rightAudio, setRightAudio] = useState<AudioData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [viewMode, setViewMode] = useState<'overlay' | 'side-by-side' | 'difference'>('overlay')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [activePlayer, setActivePlayer] = useState<'left' | 'right' | 'both'>('both')

  const leftAudioRef = useRef<HTMLAudioElement>(null)
  const rightAudioRef = useRef<HTMLAudioElement>(null)
  const leftCanvasRef = useRef<HTMLCanvasElement>(null)
  const rightCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const diffCanvasRef = useRef<HTMLCanvasElement>(null)

  // Load audio files
  useEffect(() => {
    const loadAudio = async () => {
      if (!leftPath && !rightPath) return

      setIsLoading(true)
      setError(null)

      try {
        if (leftPath) {
          const arrayBuffer = await readFile(leftPath)
          const waveformData = await decodeAudioFile(arrayBuffer.buffer)
          const mimeType = getAudioMimeType(leftPath)
          const base64 = arrayBufferToBase64(arrayBuffer)
          const audioUrl = `data:${mimeType};base64,${base64}`

          setLeftAudio({
            path: leftPath,
            waveformData,
            audioInfo: {
              duration: waveformData.duration,
              sampleRate: waveformData.sampleRate,
              numberOfChannels: waveformData.numberOfChannels,
            },
            audioUrl,
          })
        } else {
          setLeftAudio(null)
        }

        if (rightPath) {
          const arrayBuffer = await readFile(rightPath)
          const waveformData = await decodeAudioFile(arrayBuffer.buffer)
          const mimeType = getAudioMimeType(rightPath)
          const base64 = arrayBufferToBase64(arrayBuffer)
          const audioUrl = `data:${mimeType};base64,${base64}`

          setRightAudio({
            path: rightPath,
            waveformData,
            audioInfo: {
              duration: waveformData.duration,
              sampleRate: waveformData.sampleRate,
              numberOfChannels: waveformData.numberOfChannels,
            },
            audioUrl,
          })
        } else {
          setRightAudio(null)
        }

        setCurrentTime(0)
        setScrollOffset(0)
      } catch (e) {
        setError(`Failed to load audio: ${e}`)
      } finally {
        setIsLoading(false)
      }
    }

    loadAudio()
  }, [leftPath, rightPath])

  // Draw waveforms when data is loaded
  useEffect(() => {
    if (!leftAudio && !rightAudio) return

    const drawWaveforms = () => {
      if (viewMode === 'side-by-side') {
        if (leftCanvasRef.current && leftAudio) {
          drawWaveform(leftCanvasRef.current, leftAudio.waveformData, '#22d3ee', currentTime, zoomLevel, scrollOffset)
        }
        if (rightCanvasRef.current && rightAudio) {
          drawWaveform(rightCanvasRef.current, rightAudio.waveformData, '#f87171', currentTime, zoomLevel, scrollOffset)
        }
      } else if (viewMode === 'overlay' && overlayCanvasRef.current && leftAudio && rightAudio) {
        drawOverlayWaveform(overlayCanvasRef.current, leftAudio.waveformData, rightAudio.waveformData, currentTime, zoomLevel, scrollOffset)
      } else if (viewMode === 'difference' && diffCanvasRef.current && leftAudio && rightAudio) {
        drawDifferenceWaveform(diffCanvasRef.current, leftAudio.waveformData, rightAudio.waveformData, currentTime, zoomLevel, scrollOffset)
      }
    }

    drawWaveforms()
  }, [leftAudio, rightAudio, viewMode, currentTime, zoomLevel, scrollOffset])

  // Playback sync
  useEffect(() => {
    if (!isPlaying) return

    const updateTime = () => {
      if (leftAudioRef.current && activePlayer !== 'right') {
        setCurrentTime(leftAudioRef.current.currentTime)
      } else if (rightAudioRef.current && activePlayer === 'right') {
        setCurrentTime(rightAudioRef.current.currentTime)
      }
    }

    const interval = setInterval(updateTime, 50)
    return () => clearInterval(interval)
  }, [isPlaying, activePlayer])

  // Playback controls
  const handlePlay = () => {
    if (activePlayer === 'both' || activePlayer === 'left') {
      leftAudioRef.current?.play()
    }
    if (activePlayer === 'both' || activePlayer === 'right') {
      rightAudioRef.current?.play()
    }
    setIsPlaying(true)
  }

  const handlePause = () => {
    leftAudioRef.current?.pause()
    rightAudioRef.current?.pause()
    setIsPlaying(false)
  }

  const handleSeek = (time: number) => {
    if (leftAudioRef.current) {
      leftAudioRef.current.currentTime = time
    }
    if (rightAudioRef.current) {
      rightAudioRef.current.currentTime = time
    }
    setCurrentTime(time)
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const clickRatio = x / rect.width

    const maxDuration = Math.max(leftAudio?.audioInfo.duration || 0, rightAudio?.audioInfo.duration || 0)
    const seekTime = clickRatio * maxDuration

    handleSeek(seekTime)
  }

  const handleZoomIn = () => setZoomLevel(Math.min(10, zoomLevel * 1.5))
  const handleZoomOut = () => setZoomLevel(Math.max(1, zoomLevel / 1.5))

  const getFileName = (path: string) => path.split(/[/\\]/).pop() || path

  const arrayBufferToBase64 = (buffer: Uint8Array): string => {
    let binary = ''
    for (let i = 0; i < buffer.byteLength; i++) {
      binary += String.fromCharCode(buffer[i])
    }
    return btoa(binary)
  }

  // Canvas drawing functions
  const drawWaveform = (
    canvas: HTMLCanvasElement,
    data: WaveformData,
    color: string,
    currentTime: number,
    zoom: number,
    offset: number
  ) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const peaks = data.peaks

    // Clear
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    // Draw waveform
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()

    const visiblePeaks = Math.floor(peaks.length / zoom)
    const startIdx = Math.floor(offset * peaks.length)
    const samplesPerPixel = visiblePeaks / width

    for (let x = 0; x < width; x++) {
      const peakIndex = Math.floor(startIdx + x * samplesPerPixel)
      if (peakIndex < peaks.length) {
        const peak = peaks[peakIndex]
        const y = height / 2 - peak * height / 2
        const y2 = height / 2 + peak * height / 2

        ctx.moveTo(x, y)
        ctx.lineTo(x, y2)
      }
    }

    ctx.stroke()

    // Draw time cursor
    const duration = data.duration
    const cursorX = (currentTime / duration) * width

    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cursorX, 0)
    ctx.lineTo(cursorX, height)
    ctx.stroke()
  }

  const drawOverlayWaveform = (
    canvas: HTMLCanvasElement,
    leftData: WaveformData,
    rightData: WaveformData,
    currentTime: number,
    zoom: number,
    offset: number
  ) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    const maxDuration = Math.max(leftData.duration, rightData.duration)

    // Draw left waveform (cyan, semi-transparent)
    ctx.strokeStyle = '#22d3ee'
    ctx.globalAlpha = 0.7
    ctx.lineWidth = 1
    drawWaveformPath(ctx, width, height, leftData.peaks, zoom, offset)

    // Draw right waveform (red, semi-transparent)
    ctx.strokeStyle = '#f87171'
    ctx.globalAlpha = 0.7
    drawWaveformPath(ctx, width, height, rightData.peaks, zoom, offset)

    ctx.globalAlpha = 1

    // Draw time cursor
    const cursorX = (currentTime / maxDuration) * width
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cursorX, 0)
    ctx.lineTo(cursorX, height)
    ctx.stroke()
  }

  const drawDifferenceWaveform = (
    canvas: HTMLCanvasElement,
    leftData: WaveformData,
    rightData: WaveformData,
    currentTime: number,
    zoom: number,
    offset: number
  ) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    // Clear
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, width, height)

    const diff = compareWaveforms(leftData, rightData)
    const maxDuration = Math.max(leftData.duration, rightData.duration)

    // Draw difference waveform (yellow for high diff, green for low)
    const visiblePeaks = Math.floor(diff.length / zoom)
    const startIdx = Math.floor(offset * diff.length)
    const samplesPerPixel = visiblePeaks / width

    for (let x = 0; x < width; x++) {
      const peakIndex = Math.floor(startIdx + x * samplesPerPixel)
      if (peakIndex < diff.length) {
        const diffValue = diff[peakIndex]

        // Color based on difference magnitude
        const intensity = Math.min(1, diffValue * 2)
        ctx.fillStyle = `rgba(255, ${Math.floor(200 * (1 - intensity))}, 0, 0.8)`

        const y = height / 2 - diffValue * height / 2
        const y2 = height / 2 + diffValue * height / 2

        ctx.fillRect(x, y, 1, y2 - y)
      }
    }

    // Draw time cursor
    const cursorX = (currentTime / maxDuration) * width
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cursorX, 0)
    ctx.lineTo(cursorX, height)
    ctx.stroke()
  }

  const drawWaveformPath = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    peaks: Float32Array,
    zoom: number,
    offset: number
  ) => {
    ctx.beginPath()

    const visiblePeaks = Math.floor(peaks.length / zoom)
    const startIdx = Math.floor(offset * peaks.length)
    const samplesPerPixel = visiblePeaks / width

    for (let x = 0; x < width; x++) {
      const peakIndex = Math.floor(startIdx + x * samplesPerPixel)
      if (peakIndex < peaks.length) {
        const peak = peaks[peakIndex]
        const y = height / 2 - peak * height / 2
        const y2 = height / 2 + peak * height / 2

        ctx.moveTo(x, y)
        ctx.lineTo(x, y2)
      }
    }

    ctx.stroke()
  }

  if (!leftPath && !rightPath) {
    return (
      <div className="audio-empty">
        <div className="audio-empty-icon">🎵</div>
        <div className="audio-empty-title">Select audio files to compare</div>
        <div className="audio-empty-subtitle">
          Supported: MP3, WAV, OGG, FLAC, AAC, M4A
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="audio-loading">
        <span className="audio-spinner">⏳</span>
        <span className="audio-loading-text">Analyzing audio waveforms...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="audio-error">
        <span className="audio-error-icon">❌</span>
        <span className="audio-error-text">{error}</span>
      </div>
    )
  }

  const maxDuration = Math.max(leftAudio?.audioInfo.duration || 0, rightAudio?.audioInfo.duration || 0)

  return (
    <div className="audio-container">
      {/* Header */}
      <div className="audio-header">
        <div className="audio-info">
          {leftAudio && (
            <div className="audio-file-info left">
              <span className="audio-badge">L</span>
              <span className="audio-name">{getFileName(leftAudio.path)}</span>
              <span className="audio-duration">{formatDuration(leftAudio.audioInfo.duration)}</span>
              <span className="audio-detail">{leftAudio.audioInfo.numberOfChannels}ch, {leftAudio.audioInfo.sampleRate}Hz</span>
            </div>
          )}
          {rightAudio && (
            <div className="audio-file-info right">
              <span className="audio-badge">R</span>
              <span className="audio-name">{getFileName(rightAudio.path)}</span>
              <span className="audio-duration">{formatDuration(rightAudio.audioInfo.duration)}</span>
              <span className="audio-detail">{rightAudio.audioInfo.numberOfChannels}ch, {rightAudio.audioInfo.sampleRate}Hz</span>
            </div>
          )}
        </div>

        {/* View modes */}
        <div className="audio-controls">
          <div className="audio-view-modes">
            <button
              className={`audio-mode-btn ${viewMode === 'overlay' ? 'active' : ''}`}
              onClick={() => setViewMode('overlay')}
            >
              Overlay
            </button>
            <button
              className={`audio-mode-btn ${viewMode === 'side-by-side' ? 'active' : ''}`}
              onClick={() => setViewMode('side-by-side')}
            >
              Side by Side
            </button>
            <button
              className={`audio-mode-btn ${viewMode === 'difference' ? 'active' : ''}`}
              onClick={() => setViewMode('difference')}
            >
              Difference
            </button>
          </div>

          {/* Playback controls */}
          <div className="audio-playback-controls">
            <button
              className="audio-play-btn"
              onClick={isPlaying ? handlePause : handlePlay}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <span className="audio-time">
              {formatDuration(currentTime)} / {formatDuration(maxDuration)}
            </span>
            <button
              className="audio-mute-btn"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>

          {/* Zoom controls */}
          <div className="audio-zoom-controls">
            <button className="audio-zoom-btn" onClick={handleZoomOut}>
              <ZoomOut size={14} />
            </button>
            <span className="audio-zoom-value">{Math.round(zoomLevel * 100)}%</span>
            <button className="audio-zoom-btn" onClick={handleZoomIn}>
              <ZoomIn size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Waveform views */}
      <div className="audio-views">
        {viewMode === 'side-by-side' && (
          <div className="audio-side-by-side">
            <div className="audio-pane left-pane">
              <div className="audio-pane-header">
                <span className="pane-badge">L</span>
                {leftAudio ? getFileName(leftAudio.path) : 'No audio'}
              </div>
              <canvas
                ref={leftCanvasRef}
                className="audio-waveform-canvas"
                width={800}
                height={150}
                onClick={handleCanvasClick}
              />
              {leftAudio && (
                <audio
                  ref={leftAudioRef}
                  src={leftAudio.audioUrl}
                  muted={isMuted || activePlayer === 'right'}
                  onEnded={() => setIsPlaying(false)}
                />
              )}
            </div>
            <div className="audio-pane right-pane">
              <div className="audio-pane-header">
                <span className="pane-badge">R</span>
                {rightAudio ? getFileName(rightAudio.path) : 'No audio'}
              </div>
              <canvas
                ref={rightCanvasRef}
                className="audio-waveform-canvas"
                width={800}
                height={150}
                onClick={handleCanvasClick}
              />
              {rightAudio && (
                <audio
                  ref={rightAudioRef}
                  src={rightAudio.audioUrl}
                  muted={isMuted || activePlayer === 'left'}
                  onEnded={() => setIsPlaying(false)}
                />
              )}
            </div>
          </div>
        )}

        {viewMode === 'overlay' && (
          <div className="audio-overlay-container">
            <canvas
              ref={overlayCanvasRef}
              className="audio-waveform-canvas overlay"
              width={1600}
              height={200}
              onClick={handleCanvasClick}
            />
            {leftAudio && (
              <audio
                ref={leftAudioRef}
                src={leftAudio.audioUrl}
                muted={isMuted || activePlayer === 'right'}
                onEnded={() => setIsPlaying(false)}
              />
            )}
            {rightAudio && (
              <audio
                ref={rightAudioRef}
                src={rightAudio.audioUrl}
                muted={isMuted || activePlayer === 'left'}
                onEnded={() => setIsPlaying(false)}
              />
            )}
          </div>
        )}

        {viewMode === 'difference' && (
          <div className="audio-difference-container">
            <canvas
              ref={diffCanvasRef}
              className="audio-waveform-canvas difference"
              width={1600}
              height={200}
              onClick={handleCanvasClick}
            />
            {leftAudio && (
              <audio
                ref={leftAudioRef}
                src={leftAudio.audioUrl}
                muted={isMuted || activePlayer === 'right'}
                onEnded={() => setIsPlaying(false)}
              />
            )}
            {rightAudio && (
              <audio
                ref={rightAudioRef}
                src={rightAudio.audioUrl}
                muted={isMuted || activePlayer === 'left'}
                onEnded={() => setIsPlaying(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="audio-status-bar">
        <div className="audio-status-item">
          Mode: {viewMode === 'overlay' ? 'Overlay' : viewMode === 'side-by-side' ? 'Side by Side' : 'Difference'}
        </div>
        <div className="audio-status-item">
          Zoom: {Math.round(zoomLevel * 100)}%
        </div>
        {leftAudio && rightAudio && (
          <div className="audio-status-item">
            {leftAudio.audioInfo.duration === rightAudio.audioInfo.duration
              ? '✓ Same duration'
              : `⚠ Duration differs (${formatDuration(leftAudio.audioInfo.duration)} vs ${formatDuration(rightAudio.audioInfo.duration)})`}
          </div>
        )}
        <div className="audio-status-item hint">
          Click waveform to seek
        </div>
      </div>
    </div>
  )
}