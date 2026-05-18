import { readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const AUDIO_EXTENSIONS = new Set(['.wav', '.aiff', '.aif', '.mp3', '.flac', '.ogg'])

function isWindowsDriveRoot(candidatePath) {
  return /^[A-Za-z]:\\$/.test(candidatePath)
}

export async function listFilesystemRoots() {
  if (process.platform === 'win32') {
    const roots = []

    for (let code = 65; code <= 90; code += 1) {
      const driveLetter = String.fromCharCode(code)
      const drivePath = `${driveLetter}:\\`

      try {
        const info = await stat(drivePath)
        if (info.isDirectory()) {
          roots.push({
            name: drivePath,
            absolutePath: drivePath,
          })
        }
      } catch {
        // ignore non-existing drives
      }
    }

    return roots
  }

  const roots = []
  const candidates = ['/', '/sample-library']

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue
    }

    try {
      const info = await stat(candidate)
      if (info.isDirectory()) {
        roots.push({
          name: candidate,
          absolutePath: candidate,
        })
      }
    } catch {
      // ignore inaccessible paths
    }
  }

  return roots
}

function normalizeAbsolutePath(inputPath) {
  return path.normalize(inputPath)
}

function getParentPath(currentPath) {
  const normalized = normalizeAbsolutePath(currentPath)

  if (process.platform === 'win32' && isWindowsDriveRoot(normalized)) {
    return null
  }

  const parent = path.dirname(normalized)
  if (parent === normalized) {
    return null
  }

  return parent
}

async function estimateRecursiveAudioCount(rootPath, limit = 4000) {
  let count = 0
  let scannedItems = 0
  const queue = [rootPath]

  while (queue.length > 0 && scannedItems < limit) {
    const currentPath = queue.shift()

    if (!currentPath) {
      continue
    }

    let entries = []
    try {
      entries = await readdir(currentPath, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      scannedItems += 1

      if (entry.isDirectory()) {
        queue.push(path.join(currentPath, entry.name))
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const extension = path.extname(entry.name).toLowerCase()
      if (AUDIO_EXTENSIONS.has(extension)) {
        count += 1
      }

      if (scannedItems >= limit) {
        break
      }
    }
  }

  return count
}

export async function listFoldersForPath(inputPath) {
  const absolutePath = normalizeAbsolutePath(inputPath)

  const folderStat = await stat(absolutePath).catch(() => null)
  if (!folderStat || !folderStat.isDirectory()) {
    throw new Error('Path does not exist or is not a directory.')
  }

  const entries = await readdir(absolutePath, { withFileTypes: true })

  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      absolutePath: path.join(absolutePath, entry.name),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))

  const audioFileCountDirect = entries.filter((entry) => {
    if (!entry.isFile()) {
      return false
    }

    const extension = path.extname(entry.name).toLowerCase()
    return AUDIO_EXTENSIONS.has(extension)
  }).length

  const audioFileCountRecursiveEstimate = await estimateRecursiveAudioCount(absolutePath)

  return {
    path: absolutePath,
    parentPath: getParentPath(absolutePath),
    folders,
    audioFileCountDirect,
    audioFileCountRecursiveEstimate,
  }
}
