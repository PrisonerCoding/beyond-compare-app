import { useState, useCallback } from 'react'
import { readFile } from '@tauri-apps/plugin-fs'
import {
  type FileEncoding,
  type EncodingInfo,
  detectEncoding,
  decodeBytes,
} from '../utils/encoding'

export interface FileWithEncoding {
  path: string
  content: string
  bytes: Uint8Array
  encoding: EncodingInfo
  selectedEncoding: FileEncoding
}

export function useFileWithEncoding() {
  const [leftFile, setLeftFile] = useState<FileWithEncoding | null>(null)
  const [rightFile, setRightFile] = useState<FileWithEncoding | null>(null)

  const loadFile = useCallback(async (
    path: string,
    side: 'left' | 'right'
  ): Promise<FileWithEncoding | null> => {
    try {
      // Read file as bytes
      const bytes = await readFile(path)

      // Detect encoding
      const encoding = detectEncoding(bytes)

      // Decode with detected encoding
      const content = decodeBytes(bytes, encoding.encoding)

      const fileInfo: FileWithEncoding = {
        path,
        content,
        bytes,
        encoding,
        selectedEncoding: encoding.encoding,
      }

      if (side === 'left') {
        setLeftFile(fileInfo)
      } else {
        setRightFile(fileInfo)
      }

      return fileInfo
    } catch (error) {
      console.error(`Failed to load file ${path}:`, error)
      return null
    }
  }, [])

  const changeEncoding = useCallback((
    side: 'left' | 'right',
    newEncoding: FileEncoding
  ) => {
    const file = side === 'left' ? leftFile : rightFile
    if (!file) return

    const newContent = decodeBytes(file.bytes, newEncoding)

    const updatedFile: FileWithEncoding = {
      ...file,
      content: newContent,
      selectedEncoding: newEncoding,
    }

    if (side === 'left') {
      setLeftFile(updatedFile)
    } else {
      setRightFile(updatedFile)
    }
  }, [leftFile, rightFile])

  const clearFiles = useCallback(() => {
    setLeftFile(null)
    setRightFile(null)
  }, [])

  return {
    leftFile,
    rightFile,
    loadFile,
    changeEncoding,
    clearFiles,
  }
}