/**
 * Audio waveform analysis utilities using Web Audio API
 */

export interface WaveformData {
  samples: Float32Array[]
  duration: number
  sampleRate: number
  numberOfChannels: number
  peaks: Float32Array // Normalized peaks for visualization
}

export interface AudioInfo {
  duration: number
  sampleRate: number
  numberOfChannels: number
  bitrate?: number
}

/**
 * Decode audio file and extract waveform data
 */
export async function decodeAudioFile(arrayBuffer: ArrayBuffer): Promise<WaveformData> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    const samples: Float32Array[] = []
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      samples.push(audioBuffer.getChannelData(i))
    }

    // Generate normalized peaks for visualization
    const peaks = generatePeaks(samples, audioBuffer.length)

    return {
      samples,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      peaks,
    }
  } finally {
    await audioContext.close()
  }
}

/**
 * Generate normalized peaks for waveform visualization
 * Reduces the full sample data to a manageable number of peaks
 */
function generatePeaks(samples: Float32Array[], totalSamples: number): Float32Array {
  // Target around 2000 peaks for a good visual representation
  const targetPeaks = 2000
  const samplesPerPeak = Math.max(1, Math.floor(totalSamples / targetPeaks))

  const peaks: number[] = []

  // Use the first channel for visualization (or combine all channels)
  const channelData = samples[0]

  for (let i = 0; i < totalSamples; i += samplesPerPeak) {
    // Find the maximum amplitude in this window
    let max = 0
    for (let j = i; j < Math.min(i + samplesPerPeak, totalSamples); j++) {
      const absValue = Math.abs(channelData[j])
      if (absValue > max) max = absValue
    }
    peaks.push(max)
  }

  return new Float32Array(peaks)
}

/**
 * Get audio file info from ArrayBuffer
 */
export async function getAudioInfo(arrayBuffer: ArrayBuffer): Promise<AudioInfo> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
    }
  } finally {
    await audioContext.close()
  }
}

/**
 * Format duration as mm:ss
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Compare two waveforms and generate difference data
 */
export function compareWaveforms(left: WaveformData, right: WaveformData): Float32Array {
  // Align peaks by length
  const targetLength = Math.min(left.peaks.length, right.peaks.length)
  const leftPeaks = left.peaks.slice(0, targetLength)
  const rightPeaks = right.peaks.slice(0, targetLength)

  const diff = new Float32Array(targetLength)

  for (let i = 0; i < targetLength; i++) {
    // Calculate absolute difference
    diff[i] = Math.abs(leftPeaks[i] - rightPeaks[i])
  }

  return diff
}

/**
 * Detect audio file type from path
 */
export function getAudioMimeType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || ''

  const mimeTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
    webm: 'audio/webm',
  }

  return mimeTypes[ext] || 'audio/mpeg'
}

/**
 * Check if file is an audio file
 */
export function isAudioFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase() || ''
  const audioExtensions = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'webm', 'aiff', 'wma']
  return audioExtensions.includes(ext)
}