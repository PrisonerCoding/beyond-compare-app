// History management using localStorage and IndexedDB
import type { SessionData } from './session'

export interface HistoryEntry {
  id: string
  timestamp: string
  type: 'comparison' | 'sync' | 'merge'
  mode: 'text' | 'folder' | 'merge' | 'binary' | 'image'
  leftPath: string
  rightPath: string
  leftName: string
  rightName: string
  stats?: ComparisonStats
  notes?: string
  tags?: string[]
}

export interface ComparisonStats {
  added?: number
  removed?: number
  modified?: number
  unchanged?: number
  conflicts?: number
  diffPixels?: number
}

export interface Snapshot {
  id: string
  timestamp: string
  name: string
  leftPath: string
  rightPath: string
  leftContent: string  // Base64 encoded
  rightContent: string  // Base64 encoded
  session: SessionData
}

const HISTORY_KEY = 'difflens_history'
const MAX_HISTORY_ENTRIES = 100
const MAX_SNAPSHOTS = 50

/**
 * Get comparison history
 */
export function getHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (!stored) return []
    return JSON.parse(stored) as HistoryEntry[]
  } catch {
    return []
  }
}

/**
 * Add entry to history
 */
export function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): HistoryEntry {
  const newEntry: HistoryEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  }

  const current = getHistory()
  const updated = [newEntry, ...current].slice(0, MAX_HISTORY_ENTRIES)

  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))

  return newEntry
}

/**
 * Clear history
 */
export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY)
}

/**
 * Delete specific history entry
 */
export function deleteHistoryEntry(id: string): void {
  const current = getHistory()
  const updated = current.filter(e => e.id !== id)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated))
}

/**
 * Get history entries filtered by type
 */
export function getHistoryByType(type: 'comparison' | 'sync' | 'merge'): HistoryEntry[] {
  return getHistory().filter(e => e.type === type)
}

/**
 * Search history
 */
export function searchHistory(query: string): HistoryEntry[] {
  const lowerQuery = query.toLowerCase()
  return getHistory().filter(e =>
    e.leftName.toLowerCase().includes(lowerQuery) ||
    e.rightName.toLowerCase().includes(lowerQuery) ||
    (e.notes && e.notes.toLowerCase().includes(lowerQuery)) ||
    (e.tags && e.tags.some(t => t.toLowerCase().includes(lowerQuery)))
  )
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Snapshots management using IndexedDB for larger storage
const DB_NAME = 'DiffLensDB'
const DB_VERSION = 1
const SNAPSHOTS_STORE = 'snapshots'

/**
 * Open IndexedDB
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        const store = db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('name', 'name', { unique: false })
      }
    }
  })
}

/**
 * Save snapshot to IndexedDB
 */
export async function saveSnapshot(
  name: string,
  leftPath: string,
  rightPath: string,
  leftContent: Uint8Array,
  rightContent: Uint8Array,
  session: SessionData
): Promise<Snapshot> {
  const db = await openDB()

  const snapshot: Snapshot = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    name,
    leftPath,
    rightPath,
    leftContent: arrayToBase64(leftContent),
    rightContent: arrayToBase64(rightContent),
    session,
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SNAPSHOTS_STORE, 'readwrite')
    const store = transaction.objectStore(SNAPSHOTS_STORE)

    // Check if we need to delete oldest snapshots
    const countRequest = store.count()
    countRequest.onsuccess = () => {
      if (countRequest.result >= MAX_SNAPSHOTS) {
        // Get oldest snapshot and delete it
        const index = store.index('timestamp')
        const oldestRequest = index.openCursor()
        oldestRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            store.delete(cursor.value.id)
          }
        }
      }
    }

    const addRequest = store.add(snapshot)
    addRequest.onsuccess = () => resolve(snapshot)
    addRequest.onerror = () => reject(addRequest.error)
  })
}

/**
 * Get all snapshots
 */
export async function getSnapshots(): Promise<Snapshot[]> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SNAPSHOTS_STORE, 'readonly')
    const store = transaction.objectStore(SNAPSHOTS_STORE)
    const index = store.index('timestamp')

    const request = index.getAll()
    request.onsuccess = () => {
      // Return in reverse order (newest first)
      resolve(request.result.reverse())
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * Delete snapshot
 */
export async function deleteSnapshot(id: string): Promise<void> {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SNAPSHOTS_STORE, 'readwrite')
    const store = transaction.objectStore(SNAPSHOTS_STORE)

    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Load snapshot content
 */
export async function loadSnapshotContent(snapshot: Snapshot): Promise<{
  leftContent: Uint8Array
  rightContent: Uint8Array
}> {
  return {
    leftContent: base64ToArray(snapshot.leftContent),
    rightContent: base64ToArray(snapshot.rightContent),
  }
}

/**
 * Convert Uint8Array to Base64
 */
function arrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert Base64 to Uint8Array
 */
function base64ToArray(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Compare two snapshots
 */
export interface SnapshotComparison {
  snapshot1: Snapshot
  snapshot2: Snapshot
  timestampDiff: string
  contentDiff?: {
    leftChanged: boolean
    rightChanged: boolean
  }
}

export function compareSnapshots(s1: Snapshot, s2: Snapshot): SnapshotComparison {
  const time1 = new Date(s1.timestamp)
  const time2 = new Date(s2.timestamp)
  const diffMs = Math.abs(time1.getTime() - time2.getTime())
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60)) % 24

  let timestampDiff: string
  if (diffDays > 0) {
    timestampDiff = `${diffDays} days, ${diffHours} hours`
  } else if (diffHours > 0) {
    timestampDiff = `${diffHours} hours`
  } else {
    timestampDiff = `${Math.floor(diffMs / (1000 * 60))} minutes`
  }

  return {
    snapshot1: s1,
    snapshot2: s2,
    timestampDiff,
    contentDiff: {
      leftChanged: s1.leftContent !== s2.leftContent,
      rightChanged: s1.rightContent !== s2.rightContent,
    },
  }
}