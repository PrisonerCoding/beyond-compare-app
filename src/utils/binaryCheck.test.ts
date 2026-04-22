import { describe, it, expect } from 'vitest'
import {
  isBinaryFile,
  isAudioFile,
  isArchiveFile,
  getFileTypeDescription
} from './binaryCheck'

describe('binaryCheck utilities', () => {
  describe('isBinaryFile', () => {
    it('should identify document files as binary', () => {
      expect(isBinaryFile('document.pdf')).toBe(true)
      expect(isBinaryFile('report.doc')).toBe(true)
      expect(isBinaryFile('report.docx')).toBe(true)
      expect(isBinaryFile('data.xls')).toBe(true)
      expect(isBinaryFile('data.xlsx')).toBe(true)
    })

    it('should identify executable files as binary', () => {
      expect(isBinaryFile('program.exe')).toBe(true)
      expect(isBinaryFile('library.dll')).toBe(true)
      expect(isBinaryFile('lib.so')).toBe(true)
    })

    it('should identify archive files as binary', () => {
      expect(isBinaryFile('archive.zip')).toBe(true)
      expect(isBinaryFile('backup.tar')).toBe(true)
      expect(isBinaryFile('data.gz')).toBe(true)
      expect(isBinaryFile('compressed.rar')).toBe(true)
      expect(isBinaryFile('package.7z')).toBe(true)
    })

    it('should identify image files as binary', () => {
      expect(isBinaryFile('image.png')).toBe(true)
      expect(isBinaryFile('photo.jpg')).toBe(true)
      expect(isBinaryFile('photo.jpeg')).toBe(true)
      expect(isBinaryFile('animation.gif')).toBe(true)
      expect(isBinaryFile('icon.bmp')).toBe(true)
    })

    it('should identify audio/video files as binary', () => {
      expect(isBinaryFile('song.mp3')).toBe(true)
      expect(isBinaryFile('video.mp4')).toBe(true)
      expect(isBinaryFile('audio.wav')).toBe(true)
    })

    it('should identify text files as not binary', () => {
      expect(isBinaryFile('document.txt')).toBe(false)
      expect(isBinaryFile('script.js')).toBe(false)
      expect(isBinaryFile('style.css')).toBe(false)
      expect(isBinaryFile('data.json')).toBe(false)
      expect(isBinaryFile('config.yaml')).toBe(false)
      expect(isBinaryFile('code.ts')).toBe(false)
    })

    it('should handle files without extension', () => {
      expect(isBinaryFile('noextension')).toBe(false)
    })

    it('should handle case insensitive extensions', () => {
      expect(isBinaryFile('file.PDF')).toBe(true)
      expect(isBinaryFile('file.EXE')).toBe(true)
    })
  })

  describe('isAudioFile', () => {
    it('should identify audio files', () => {
      expect(isAudioFile('song.mp3')).toBe(true)
      expect(isAudioFile('audio.wav')).toBe(true)
      expect(isAudioFile('music.ogg')).toBe(true)
      expect(isAudioFile('lossless.flac')).toBe(true)
      expect(isAudioFile('compressed.aac')).toBe(true)
      expect(isAudioFile('itunes.m4a')).toBe(true)
    })

    it('should reject non-audio files', () => {
      expect(isAudioFile('document.txt')).toBe(false)
      expect(isAudioFile('video.mp4')).toBe(false)
      expect(isAudioFile('image.png')).toBe(false)
    })
  })

  describe('isArchiveFile', () => {
    it('should identify archive files', () => {
      expect(isArchiveFile('backup.zip')).toBe(true)
      expect(isArchiveFile('archive.tar')).toBe(true)
      expect(isArchiveFile('compressed.gz')).toBe(true)
      expect(isArchiveFile('package.rar')).toBe(true)
      expect(isArchiveFile('compressed.7z')).toBe(true)
    })

    it('should identify combined archive extensions', () => {
      expect(isArchiveFile('backup.tar.gz')).toBe(true)
      expect(isArchiveFile('backup.tar.bz2')).toBe(true)
    })

    it('should reject non-archive files', () => {
      expect(isArchiveFile('document.txt')).toBe(false)
      expect(isArchiveFile('image.png')).toBe(false)
    })
  })

  describe('getFileTypeDescription', () => {
    it('should return correct descriptions', () => {
      expect(getFileTypeDescription('report.pdf')).toBe('PDF Document')
      expect(getFileTypeDescription('letter.doc')).toBe('Word Document')
      expect(getFileTypeDescription('letter.docx')).toBe('Word Document')
      expect(getFileTypeDescription('data.xls')).toBe('Excel Spreadsheet')
      expect(getFileTypeDescription('data.xlsx')).toBe('Excel Spreadsheet')
      expect(getFileTypeDescription('photo.png')).toBe('PNG Image')
      expect(getFileTypeDescription('photo.jpg')).toBe('JPEG Image')
      expect(getFileTypeDescription('backup.zip')).toBe('ZIP Archive')
    })

    it('should return generic description for unknown types', () => {
      expect(getFileTypeDescription('unknown.xyz')).toBe('Binary File')
      expect(getFileTypeDescription('noextension')).toBe('Binary File')
    })
  })
})