import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import { save, open } from '@tauri-apps/plugin-dialog'

export interface SessionData {
  version: string
  created: string
  modified: string
  mode: 'text' | 'folder' | 'merge' | 'binary' | 'image'
  left: {
    type: 'file' | 'folder'
    path: string
  } | null
  right: {
    type: 'file' | 'folder'
    path: string
  } | null
  filters?: string[]
  notes?: string
}

const SESSION_VERSION = '1.0'

export async function saveSession(data: SessionData): Promise<string | null> {
  const filePath = await save({
    defaultPath: data.notes || 'session.bcsession',
    filters: [{ name: 'Beyond Compare Session', extensions: ['bcsession'] }],
    title: 'Save Session',
  })

  if (!filePath) return null

  const sessionToSave: SessionData = {
    ...data,
    version: SESSION_VERSION,
    modified: new Date().toISOString(),
  }

  if (!sessionToSave.created) {
    sessionToSave.created = new Date().toISOString()
  }

  const content = JSON.stringify(sessionToSave, null, 2)
  await writeTextFile(filePath, content)

  return filePath
}

export async function loadSession(): Promise<SessionData | null> {
  const filePath = await open({
    multiple: false,
    filters: [{ name: 'Beyond Compare Session', extensions: ['bcsession'] }],
    title: 'Open Session',
  })

  if (!filePath || typeof filePath !== 'string') return null

  try {
    const content = await readTextFile(filePath)
    const data = JSON.parse(content) as SessionData

    // Validate session version
    if (!data.version) {
      throw new Error('Invalid session file: missing version')
    }

    return data
  } catch (error) {
    console.error('Failed to load session:', error)
    throw error
  }
}

export function createDefaultSession(): SessionData {
  return {
    version: SESSION_VERSION,
    created: new Date().toISOString(),
    modified: new Date().toISOString(),
    mode: 'text',
    left: null,
    right: null,
  }
}

export function getSessionSummary(session: SessionData): string {
  const parts: string[] = []

  parts.push(`Mode: ${session.mode}`)

  if (session.left) {
    const name = session.left.path.split(/[/\\]/).pop() || session.left.path
    parts.push(`Left: ${name}`)
  }

  if (session.right) {
    const name = session.right.path.split(/[/\\]/).pop() || session.right.path
    parts.push(`Right: ${name}`)
  }

  if (session.filters && session.filters.length > 0) {
    parts.push(`Filters: ${session.filters.length}`)
  }

  if (session.notes) {
    parts.push(`Notes: "${session.notes}"`)
  }

  return parts.join(' | ')
}

// Recent sessions management
const RECENT_SESSIONS_KEY = 'bc_recent_sessions'
const MAX_RECENT_SESSIONS = 10

export interface RecentSession {
  path: string
  name: string
  modified: string
  summary: string
}

export function getRecentSessions(): RecentSession[] {
  try {
    const stored = localStorage.getItem(RECENT_SESSIONS_KEY)
    if (!stored) return []
    return JSON.parse(stored) as RecentSession[]
  } catch {
    return []
  }
}

export function addRecentSession(session: SessionData, path: string): void {
  const recent: RecentSession = {
    path,
    name: path.split(/[/\\]/).pop() || path,
    modified: session.modified,
    summary: getSessionSummary(session),
  }

  const current = getRecentSessions()

  // Remove existing entry for same path
  const filtered = current.filter(r => r.path !== path)

  // Add to front
  const updated = [recent, ...filtered].slice(0, MAX_RECENT_SESSIONS)

  localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify(updated))
}

export function clearRecentSessions(): void {
  localStorage.removeItem(RECENT_SESSIONS_KEY)
}

export async function loadSessionFromPath(filePath: string): Promise<SessionData> {
  const content = await readTextFile(filePath)
  const data = JSON.parse(content) as SessionData

  if (!data.version) {
    throw new Error('Invalid session file: missing version')
  }

  return data
}