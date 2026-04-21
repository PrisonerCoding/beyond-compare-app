import { copyFile, remove, mkdir } from '@tauri-apps/plugin-fs'
import { join, dirname } from '@tauri-apps/api/path'

export interface SyncOperation {
  type: 'copy-to-left' | 'copy-to-right' | 'delete-left' | 'delete-right'
  relativePath: string
}

export interface SyncResult {
  success: boolean
  operation: SyncOperation
  error?: string
}

/**
 * Copy file from source to destination
 */
async function copyFileTo(sourcePath: string, destPath: string): Promise<void> {
  // Ensure destination directory exists
  const destDir = await dirname(destPath)

  try {
    // Try to create directory if it doesn't exist
    await mkdir(destDir, { recursive: true })
  } catch {
    // Directory might already exist, ignore error
  }

  // Copy the file
  await copyFile(sourcePath, destPath)
}

/**
 * Delete a file or directory
 */
async function deletePath(path: string): Promise<void> {
  try {
    await remove(path, { recursive: true })
  } catch (error) {
    console.error(`Failed to delete ${path}:`, error)
    throw error
  }
}

/**
 * Execute a single sync operation
 */
export async function executeSyncOperation(
  leftBasePath: string,
  rightBasePath: string,
  operation: SyncOperation
): Promise<SyncResult> {
  const leftPath = await join(leftBasePath, operation.relativePath)
  const rightPath = await join(rightBasePath, operation.relativePath)

  try {
    switch (operation.type) {
      case 'copy-to-left':
        await copyFileTo(rightPath, leftPath)
        break

      case 'copy-to-right':
        await copyFileTo(leftPath, rightPath)
        break

      case 'delete-left':
        await deletePath(leftPath)
        break

      case 'delete-right':
        await deletePath(rightPath)
        break
    }

    return { success: true, operation }
  } catch (error) {
    return {
      success: false,
      operation,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Execute multiple sync operations
 */
export async function executeSyncOperations(
  leftBasePath: string,
  rightBasePath: string,
  operations: SyncOperation[]
): Promise<SyncResult[]> {
  const results: SyncResult[] = []

  for (const operation of operations) {
    const result = await executeSyncOperation(leftBasePath, rightBasePath, operation)
    results.push(result)
  }

  return results
}

/**
 * Generate sync operations from folder comparison
 */
export function generateSyncOperations(
  items: Array<{ path: string; status: 'added' | 'removed' | 'modified' | 'equal'; type: 'file' | 'folder' }>,
  direction: 'left-to-right' | 'right-to-left' | 'mirror-left' | 'mirror-right'
): SyncOperation[] {
  const operations: SyncOperation[] = []

  for (const item of items) {
    if (item.type !== 'file') continue

    switch (direction) {
      case 'left-to-right':
        // Copy all left files to right (overwrite)
        if (item.status === 'removed' || item.status === 'modified') {
          operations.push({
            type: 'copy-to-right',
            relativePath: item.path,
          })
        }
        break

      case 'right-to-left':
        // Copy all right files to left (overwrite)
        if (item.status === 'added' || item.status === 'modified') {
          operations.push({
            type: 'copy-to-left',
            relativePath: item.path,
          })
        }
        break

      case 'mirror-left':
        // Mirror left to right: copy files, delete extras on right
        if (item.status === 'removed' || item.status === 'modified') {
          operations.push({
            type: 'copy-to-right',
            relativePath: item.path,
          })
        } else if (item.status === 'added') {
          // File exists only on right, delete it
          operations.push({
            type: 'delete-right',
            relativePath: item.path,
          })
        }
        break

      case 'mirror-right':
        // Mirror right to left: copy files, delete extras on left
        if (item.status === 'added' || item.status === 'modified') {
          operations.push({
            type: 'copy-to-left',
            relativePath: item.path,
          })
        } else if (item.status === 'removed') {
          // File exists only on left, delete it
          operations.push({
            type: 'delete-left',
            relativePath: item.path,
          })
        }
        break
    }
  }

  return operations
}