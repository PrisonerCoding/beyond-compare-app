/**
 * Encoding detection and conversion utilities
 */

import jschardet from 'jschardet'

// Common encodings supported
export type FileEncoding =
  | 'UTF-8'
  | 'UTF-8-BOM'
  | 'UTF-16LE'
  | 'UTF-16BE'
  | 'GBK'
  | 'GB2312'
  | 'BIG5'
  | 'ISO-8859-1'
  | 'ISO-8859-15'
  | 'Windows-1252'
  | 'ASCII'
  | 'SHIFT-JIS'
  | 'EUC-JP'
  | 'EUC-KR'
  | 'KOI8-R'
  | 'unknown'

export interface EncodingInfo {
  encoding: FileEncoding
  confidence: number
  hasBOM: boolean
  bomType?: 'UTF-8' | 'UTF-16LE' | 'UTF-16BE' | 'UTF-32LE' | 'UTF-32BE'
}

// BOM signatures
const BOM_SIGNATURES: Record<string, { bytes: number[], encoding: FileEncoding, bomType: string }> = {
  'UTF-8': { bytes: [0xEF, 0xBB, 0xBF], encoding: 'UTF-8-BOM', bomType: 'UTF-8' },
  'UTF-16LE': { bytes: [0xFF, 0xFE], encoding: 'UTF-16LE', bomType: 'UTF-16LE' },
  'UTF-16BE': { bytes: [0xFE, 0xFF], encoding: 'UTF-16BE', bomType: 'UTF-16BE' },
  'UTF-32LE': { bytes: [0xFF, 0xFE, 0x00, 0x00], encoding: 'UTF-16LE', bomType: 'UTF-32LE' },
  'UTF-32BE': { bytes: [0x00, 0x00, 0xFE, 0xFF], encoding: 'UTF-16BE', bomType: 'UTF-32BE' },
}

/**
 * Check if byte array starts with BOM
 */
function checkBOM(bytes: Uint8Array): { hasBOM: boolean; bomType?: string; skipBytes: number } {
  for (const info of Object.values(BOM_SIGNATURES)) {
    if (bytes.length >= info.bytes.length) {
      const matches = info.bytes.every((b, i) => bytes[i] === b)
      if (matches) {
        return { hasBOM: true, bomType: info.bomType, skipBytes: info.bytes.length }
      }
    }
  }
  return { hasBOM: false, skipBytes: 0 }
}

/**
 * Detect encoding from byte array
 */
export function detectEncoding(bytes: Uint8Array): EncodingInfo {
  // First check for BOM
  const bomInfo = checkBOM(bytes)

  if (bomInfo.hasBOM) {
    const bomSignature = Object.values(BOM_SIGNATURES).find(
      s => s.bomType === bomInfo.bomType
    )
    return {
      encoding: bomSignature?.encoding || 'UTF-8-BOM',
      confidence: 1.0,
      hasBOM: true,
      bomType: bomInfo.bomType as any,
    }
  }

  // Try jschardet for encoding detection
  try {
    // Convert Uint8Array to regular array for jschardet
    const byteArray = Array.from(bytes)
    const detected = jschardet.detect(byteArray)

    if (detected.encoding && detected.confidence > 0.5) {
      // Normalize encoding name
      const normalizedEncoding = normalizeEncodingName(detected.encoding)
      return {
        encoding: normalizedEncoding,
        confidence: detected.confidence,
        hasBOM: false,
      }
    }
  } catch (e) {
    console.warn('Encoding detection failed:', e)
  }

  // Fallback: check if it's ASCII/UTF-8
  let isASCII = true
  let isValidUTF8 = true

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]
    if (byte > 127) {
      isASCII = false
      // UTF-8 validation: check for valid UTF-8 byte sequences
      if (byte >= 0xC0 && byte <= 0xDF) {
        // 2-byte sequence
        if (i + 1 >= bytes.length || (bytes[i + 1] & 0xC0) !== 0x80) isValidUTF8 = false
        i++ // Skip continuation byte
      } else if (byte >= 0xE0 && byte <= 0xEF) {
        // 3-byte sequence
        if (i + 2 >= bytes.length ||
            (bytes[i + 1] & 0xC0) !== 0x80 ||
            (bytes[i + 2] & 0xC0) !== 0x80) isValidUTF8 = false
        i += 2 // Skip continuation bytes
      } else if (byte >= 0xF0 && byte <= 0xF7) {
        // 4-byte sequence
        if (i + 3 >= bytes.length ||
            (bytes[i + 1] & 0xC0) !== 0x80 ||
            (bytes[i + 2] & 0xC0) !== 0x80 ||
            (bytes[i + 3] & 0xC0) !== 0x80) isValidUTF8 = false
        i += 3 // Skip continuation bytes
      } else if (byte >= 0x80 && byte <= 0xBF) {
        // Continuation byte without lead - invalid UTF-8
        isValidUTF8 = false
      } else if (byte >= 0xF8 && byte <= 0xFF) {
        // Invalid UTF-8 start byte
        isValidUTF8 = false
      }
    }
  }

  if (isASCII) {
    return { encoding: 'ASCII', confidence: 0.95, hasBOM: false }
  }

  if (isValidUTF8) {
    return { encoding: 'UTF-8', confidence: 0.9, hasBOM: false }
  }

  return { encoding: 'unknown', confidence: 0.3, hasBOM: false }
}

/**
 * Normalize encoding name from jschardet to our standard names
 */
function normalizeEncodingName(name: string): FileEncoding {
  const upperName = name.toUpperCase()

  // Mapping from jschardet names to our standard names
  const mappings: Record<string, FileEncoding> = {
    'UTF-8': 'UTF-8',
    'UTF8': 'UTF-8',
    'GBK': 'GBK',
    'GB2312': 'GB2312',
    'GB18030': 'GBK', // GB18030 is GBK compatible for most cases
    'BIG5': 'BIG5',
    'BIG-5': 'BIG5',
    'ISO-8859-1': 'ISO-8859-1',
    'ISO8859-1': 'ISO-8859-1',
    'ISO88591': 'ISO-8859-1',
    'ISO-8859-15': 'ISO-8859-15',
    'WINDOWS-1252': 'Windows-1252',
    'CP1252': 'Windows-1252',
    'ASCII': 'ASCII',
    'SHIFT_JIS': 'SHIFT-JIS',
    'SHIFT-JIS': 'SHIFT-JIS',
    'SJIS': 'SHIFT-JIS',
    'EUC-JP': 'EUC-JP',
    'EUCJP': 'EUC-JP',
    'EUC-KR': 'EUC-KR',
    'EUCKR': 'EUC-KR',
    'KOI8-R': 'KOI8-R',
    'KOI8R': 'KOI8-R',
  }

  return mappings[upperName] || 'unknown'
}

/**
 * Decode byte array with specified encoding
 */
export function decodeBytes(bytes: Uint8Array, encoding: FileEncoding): string {
  // Skip BOM if present
  const bomInfo = checkBOM(bytes)
  const dataBytes = bomInfo.hasBOM ? bytes.slice(bomInfo.skipBytes) : bytes

  try {
    // Try using TextDecoder API
    const decoderEncoding = mapEncodingToTextDecoder(encoding)
    const decoder = new TextDecoder(decoderEncoding)
    return decoder.decode(dataBytes)
  } catch (e) {
    console.warn('TextDecoder failed for encoding:', encoding, e)

    // Fallback: try UTF-8, then ISO-8859-1
    try {
      const utf8Decoder = new TextDecoder('utf-8')
      return utf8Decoder.decode(dataBytes)
    } catch {
      // Last resort: interpret as ISO-8859-1 (Latin-1)
      const latinDecoder = new TextDecoder('iso-8859-1')
      return latinDecoder.decode(dataBytes)
    }
  }
}

/**
 * Map our encoding names to TextDecoder accepted names
 */
function mapEncodingToTextDecoder(encoding: FileEncoding): string {
  const mappings: Record<FileEncoding, string> = {
    'UTF-8': 'utf-8',
    'UTF-8-BOM': 'utf-8',
    'UTF-16LE': 'utf-16le',
    'UTF-16BE': 'utf-16be',
    'GBK': 'gbk',
    'GB2312': 'gb2312',
    'BIG5': 'big5',
    'ISO-8859-1': 'iso-8859-1',
    'ISO-8859-15': 'iso-8859-15',
    'Windows-1252': 'windows-1252',
    'ASCII': 'ascii',
    'SHIFT-JIS': 'shift-jis',
    'EUC-JP': 'euc-jp',
    'EUC-KR': 'euc-kr',
    'KOI8-R': 'koi8-r',
    'unknown': 'utf-8',
  }

  return mappings[encoding] || 'utf-8'
}

/**
 * Encode string to byte array with specified encoding
 * Note: TextEncoder only supports UTF-8 output
 * For other encodings, we'd need a different library approach
 */
export function encodeString(content: string, encoding: FileEncoding, addBOM: boolean = false): Uint8Array {
  const encoder = new TextEncoder()
  const encoded = encoder.encode(content)

  if (addBOM && encoding === 'UTF-8-BOM') {
    // Add UTF-8 BOM
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF])
    const result = new Uint8Array(bom.length + encoded.length)
    result.set(bom, 0)
    result.set(encoded, bom.length)
    return result
  }

  return encoded
}

/**
 * Get friendly display name for encoding
 */
export function getEncodingDisplayName(encoding: FileEncoding): string {
  const names: Record<FileEncoding, string> = {
    'UTF-8': 'UTF-8',
    'UTF-8-BOM': 'UTF-8 with BOM',
    'UTF-16LE': 'UTF-16 (Little Endian)',
    'UTF-16BE': 'UTF-16 (Big Endian)',
    'GBK': 'GBK (Chinese)',
    'GB2312': 'GB2312 (Chinese Simplified)',
    'BIG5': 'BIG5 (Chinese Traditional)',
    'ISO-8859-1': 'ISO-8859-1 (Latin-1)',
    'ISO-8859-15': 'ISO-8859-15 (Latin-9)',
    'Windows-1252': 'Windows-1252',
    'ASCII': 'ASCII',
    'SHIFT-JIS': 'Shift-JIS (Japanese)',
    'EUC-JP': 'EUC-JP (Japanese)',
    'EUC-KR': 'EUC-KR (Korean)',
    'KOI8-R': 'KOI8-R (Russian)',
    'unknown': 'Unknown',
  }

  return names[encoding] || encoding
}

/**
 * List of all supported encodings
 */
export const SUPPORTED_ENCODINGS: FileEncoding[] = [
  'UTF-8',
  'UTF-8-BOM',
  'UTF-16LE',
  'UTF-16BE',
  'GBK',
  'GB2312',
  'BIG5',
  'ISO-8859-1',
  'Windows-1252',
  'ASCII',
  'SHIFT-JIS',
  'EUC-JP',
  'EUC-KR',
  'KOI8-R',
]