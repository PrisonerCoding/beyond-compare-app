import { describe, it, expect } from 'vitest'
import {
  detectEncoding,
  decodeBytes,
  encodeString,
  getEncodingDisplayName,
  SUPPORTED_ENCODINGS,
  type FileEncoding
} from './encoding'

describe('encoding utilities', () => {
  describe('detectEncoding', () => {
    it('should detect ASCII encoding', () => {
      const bytes = new TextEncoder().encode('Hello World')
      const result = detectEncoding(bytes)
      expect(result.encoding).toBe('ASCII')
      expect(result.hasBOM).toBe(false)
    })

    it('should detect UTF-8 encoding (via fallback validation)', () => {
      const bytes = new TextEncoder().encode('你好世界') // Chinese characters
      const result = detectEncoding(bytes)
      // jschardet may fail in Node env, but fallback should detect UTF-8
      expect(result.encoding).toBe('UTF-8')
    })

    it('should detect UTF-8 with BOM', () => {
      // UTF-8 BOM: 0xEF, 0xBB, 0xBF
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF])
      const content = new TextEncoder().encode('Hello')
      const bytesWithBom = new Uint8Array(bom.length + content.length)
      bytesWithBom.set(bom, 0)
      bytesWithBom.set(content, bom.length)

      const result = detectEncoding(bytesWithBom)
      expect(result.encoding).toBe('UTF-8-BOM')
      expect(result.hasBOM).toBe(true)
      expect(result.bomType).toBe('UTF-8')
    })

    it('should detect UTF-16LE with BOM', () => {
      // UTF-16LE BOM: 0xFF, 0xFE
      const bom = new Uint8Array([0xFF, 0xFE])
      const result = detectEncoding(bom)
      expect(result.hasBOM).toBe(true)
      expect(result.bomType).toBe('UTF-16LE')
    })

    it('should detect UTF-16BE with BOM', () => {
      // UTF-16BE BOM: 0xFE, 0xFF
      const bom = new Uint8Array([0xFE, 0xFF])
      const result = detectEncoding(bom)
      expect(result.hasBOM).toBe(true)
      expect(result.bomType).toBe('UTF-16BE')
    })

    it('should return unknown for invalid bytes', () => {
      const bytes = new Uint8Array([0x80, 0x81, 0x82]) // Invalid UTF-8 sequence
      const result = detectEncoding(bytes)
      expect(result.encoding).toBe('unknown')
    })

    it('should handle empty bytes', () => {
      const bytes = new Uint8Array([])
      const result = detectEncoding(bytes)
      expect(result.encoding).toBe('ASCII')
    })
  })

  describe('decodeBytes', () => {
    it('should decode UTF-8 bytes', () => {
      const text = 'Hello World 你好'
      const bytes = new TextEncoder().encode(text)
      const decoded = decodeBytes(bytes, 'UTF-8')
      expect(decoded).toBe(text)
    })

    it('should decode ASCII bytes', () => {
      const text = 'Hello World'
      const bytes = new TextEncoder().encode(text)
      const decoded = decodeBytes(bytes, 'ASCII')
      expect(decoded).toBe(text)
    })

    it('should skip BOM when decoding', () => {
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF])
      const content = new TextEncoder().encode('Hello')
      const bytesWithBom = new Uint8Array(bom.length + content.length)
      bytesWithBom.set(bom, 0)
      bytesWithBom.set(content, bom.length)

      const decoded = decodeBytes(bytesWithBom, 'UTF-8-BOM')
      expect(decoded).toBe('Hello')
      expect(decoded.charCodeAt(0)).not.toBe(0xFEFF) // No BOM character
    })
  })

  describe('encodeString', () => {
    it('should encode string to UTF-8 bytes', () => {
      const text = 'Hello World'
      const bytes = encodeString(text, 'UTF-8')
      const decoded = new TextDecoder().decode(bytes)
      expect(decoded).toBe(text)
    })

    it('should encode string with UTF-8 BOM', () => {
      const text = 'Hello'
      const bytes = encodeString(text, 'UTF-8-BOM', true)

      // Check BOM is present
      expect(bytes[0]).toBe(0xEF)
      expect(bytes[1]).toBe(0xBB)
      expect(bytes[2]).toBe(0xBF)

      // Check content follows BOM
      const contentBytes = new TextEncoder().encode(text)
      expect(bytes.length).toBe(3 + contentBytes.length)
    })

    it('should not add BOM when addBOM is false', () => {
      const text = 'Hello'
      const bytes = encodeString(text, 'UTF-8-BOM', false)
      expect(bytes[0]).not.toBe(0xEF) // No BOM
    })
  })

  describe('getEncodingDisplayName', () => {
    it('should return friendly names', () => {
      expect(getEncodingDisplayName('UTF-8')).toBe('UTF-8')
      expect(getEncodingDisplayName('UTF-8-BOM')).toBe('UTF-8 with BOM')
      expect(getEncodingDisplayName('UTF-16LE')).toBe('UTF-16 (Little Endian)')
      expect(getEncodingDisplayName('UTF-16BE')).toBe('UTF-16 (Big Endian)')
      expect(getEncodingDisplayName('GBK')).toBe('GBK (Chinese)')
      expect(getEncodingDisplayName('BIG5')).toBe('BIG5 (Chinese Traditional)')
      expect(getEncodingDisplayName('SHIFT-JIS')).toBe('Shift-JIS (Japanese)')
      expect(getEncodingDisplayName('ASCII')).toBe('ASCII')
    })

    it('should return Unknown for unknown encoding', () => {
      expect(getEncodingDisplayName('unknown')).toBe('Unknown')
    })
  })

  describe('SUPPORTED_ENCODINGS', () => {
    it('should contain common encodings', () => {
      expect(SUPPORTED_ENCODINGS).toContain('UTF-8')
      expect(SUPPORTED_ENCODINGS).toContain('UTF-8-BOM')
      expect(SUPPORTED_ENCODINGS).toContain('UTF-16LE')
      expect(SUPPORTED_ENCODINGS).toContain('UTF-16BE')
      expect(SUPPORTED_ENCODINGS).toContain('GBK')
      expect(SUPPORTED_ENCODINGS).toContain('ASCII')
      expect(SUPPORTED_ENCODINGS).toContain('SHIFT-JIS')
    })

    it('should have reasonable number of supported encodings', () => {
      expect(SUPPORTED_ENCODINGS.length).toBeGreaterThanOrEqual(10)
    })
  })
})