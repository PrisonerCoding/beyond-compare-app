import { describe, it, expect } from 'vitest'
import {
  formatDuration,
  compareWaveforms,
  getAudioMimeType,
  isAudioFile,
  type WaveformData
} from './audioAnalysis'

describe('audioAnalysis utilities', () => {
  describe('formatDuration', () => {
    it('should format duration correctly', () => {
      expect(formatDuration(0)).toBe('0:00')
      expect(formatDuration(60)).toBe('1:00')
      expect(formatDuration(90)).toBe('1:30')
      expect(formatDuration(125)).toBe('2:05')
      expect(formatDuration(3661)).toBe('61:01')
    })

    it('should pad seconds with zero', () => {
      expect(formatDuration(5)).toBe('0:05')
      expect(formatDuration(9)).toBe('0:09')
    })
  })

  describe('getAudioMimeType', () => {
    it('should return correct mime types', () => {
      expect(getAudioMimeType('song.mp3')).toBe('audio/mpeg')
      expect(getAudioMimeType('song.wav')).toBe('audio/wav')
      expect(getAudioMimeType('song.ogg')).toBe('audio/ogg')
      expect(getAudioMimeType('song.flac')).toBe('audio/flac')
      expect(getAudioMimeType('song.aac')).toBe('audio/aac')
      expect(getAudioMimeType('song.m4a')).toBe('audio/mp4')
      expect(getAudioMimeType('song.webm')).toBe('audio/webm')
    })

    it('should return default mime type for unknown extensions', () => {
      expect(getAudioMimeType('song.xyz')).toBe('audio/mpeg')
      expect(getAudioMimeType('noextension')).toBe('audio/mpeg')
    })

    it('should handle paths with multiple dots', () => {
      expect(getAudioMimeType('path/to/song.mp3')).toBe('audio/mpeg')
    })
  })

  describe('isAudioFile', () => {
    it('should identify audio files', () => {
      expect(isAudioFile('song.mp3')).toBe(true)
      expect(isAudioFile('song.wav')).toBe(true)
      expect(isAudioFile('song.ogg')).toBe(true)
      expect(isAudioFile('song.flac')).toBe(true)
      expect(isAudioFile('song.aac')).toBe(true)
      expect(isAudioFile('song.m4a')).toBe(true)
      expect(isAudioFile('song.webm')).toBe(true)
      expect(isAudioFile('song.aiff')).toBe(true)
      expect(isAudioFile('song.wma')).toBe(true)
    })

    it('should reject non-audio files', () => {
      expect(isAudioFile('document.txt')).toBe(false)
      expect(isAudioFile('image.png')).toBe(false)
      expect(isAudioFile('video.mp4')).toBe(false)
      expect(isAudioFile('noextension')).toBe(false)
    })

    it('should handle case insensitive extensions', () => {
      expect(isAudioFile('song.MP3')).toBe(true)
      expect(isAudioFile('song.WAV')).toBe(true)
    })
  })

  describe('compareWaveforms', () => {
    it('should compare waveforms and return difference', () => {
      const left: WaveformData = {
        samples: [new Float32Array([0.5, 0.6, 0.7, 0.8])],
        duration: 1,
        sampleRate: 44100,
        numberOfChannels: 1,
        peaks: new Float32Array([0.5, 0.6, 0.7, 0.8])
      }

      const right: WaveformData = {
        samples: [new Float32Array([0.4, 0.6, 0.9, 0.8])],
        duration: 1,
        sampleRate: 44100,
        numberOfChannels: 1,
        peaks: new Float32Array([0.4, 0.6, 0.9, 0.8])
      }

      const diff = compareWaveforms(left, right)
      expect(diff.length).toBe(4)
      expect(diff[0]).toBeCloseTo(0.1, 2) // |0.5 - 0.4|
      expect(diff[1]).toBeCloseTo(0, 2) // |0.6 - 0.6|
      expect(diff[2]).toBeCloseTo(0.2, 2) // |0.7 - 0.9|
      expect(diff[3]).toBeCloseTo(0, 2) // |0.8 - 0.8|
    })

    it('should handle different peak lengths', () => {
      const left: WaveformData = {
        samples: [new Float32Array([0.5, 0.6])],
        duration: 1,
        sampleRate: 44100,
        numberOfChannels: 1,
        peaks: new Float32Array([0.5, 0.6, 0.7, 0.8])
      }

      const right: WaveformData = {
        samples: [new Float32Array([0.4, 0.5])],
        duration: 1,
        sampleRate: 44100,
        numberOfChannels: 1,
        peaks: new Float32Array([0.4, 0.5])
      }

      const diff = compareWaveforms(left, right)
      expect(diff.length).toBe(2) // min(4, 2)
    })

    it('should handle identical waveforms', () => {
      const left: WaveformData = {
        samples: [new Float32Array([0.5, 0.6])],
        duration: 1,
        sampleRate: 44100,
        numberOfChannels: 1,
        peaks: new Float32Array([0.5, 0.6])
      }

      const right: WaveformData = {
        samples: [new Float32Array([0.5, 0.6])],
        duration: 1,
        sampleRate: 44100,
        numberOfChannels: 1,
        peaks: new Float32Array([0.5, 0.6])
      }

      const diff = compareWaveforms(left, right)
      expect(diff.every(d => d === 0)).toBe(true)
    })
  })
})