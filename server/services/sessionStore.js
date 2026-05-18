import path from 'node:path'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'

const SESSION_DIR = path.resolve(process.cwd(), '.launchbrain', 'sessions')

function sanitizeSessionId(sessionId) {
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
    throw new Error('Invalid session id.')
  }

  return sessionId
}

function sessionFilePath(sessionId) {
  const safeId = sanitizeSessionId(sessionId)
  return path.join(SESSION_DIR, `${safeId}.json`)
}

function slugifyName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function generateSessionId(name) {
  const base = slugifyName(name) || 'session'
  const stamp = Date.now().toString()
  return `${base}-${stamp}`
}

async function ensureSessionDir() {
  await mkdir(SESSION_DIR, { recursive: true })
}

async function pathExists(filePath) {
  try {
    const info = await stat(filePath)
    return info.isFile()
  } catch {
    return false
  }
}

function normalizeManifestPayload(payload) {
  const now = new Date().toISOString()

  return {
    id: payload.id ?? null,
    name: typeof payload.name === 'string' && payload.name.trim().length > 0 ? payload.name.trim() : 'Untitled Set',
    createdAt: payload.createdAt ?? now,
    updatedAt: now,
    sampleRoot: payload.sampleRoot ?? null,
    selectedPack: payload.selectedPack ?? null,
    tempo: Number(payload.tempo ?? 120),
    timeSignature: payload.timeSignature ?? '4/4',
    quantize: payload.quantize ?? '1 Bar',
    key: payload.key ?? 'C',
    scale: payload.scale ?? 'Minor',
    autoFillSettings: payload.autoFillSettings ?? null,
    clips: Array.isArray(payload.clips) ? payload.clips : [],
  }
}

export async function listSavedSessions() {
  await ensureSessionDir()
  const entries = await readdir(SESSION_DIR, { withFileTypes: true })

  const sessions = []
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue
    }

    const fullPath = path.join(SESSION_DIR, entry.name)
    try {
      const content = await readFile(fullPath, 'utf8')
      const parsed = JSON.parse(content)
      sessions.push({
        id: parsed.id ?? entry.name.replace(/\.json$/i, ''),
        name: parsed.name ?? 'Untitled Set',
        createdAt: parsed.createdAt ?? null,
        updatedAt: parsed.updatedAt ?? parsed.createdAt ?? null,
        sampleRoot: parsed.sampleRoot ?? null,
      })
    } catch {
      // ignore malformed session files
    }
  }

  sessions.sort((left, right) => {
    const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0
    const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0
    return rightTime - leftTime
  })

  return sessions
}

export async function readSavedSession(sessionId) {
  await ensureSessionDir()
  const fullPath = sessionFilePath(sessionId)
  const content = await readFile(fullPath, 'utf8')
  return JSON.parse(content)
}

export async function saveSessionManifest({
  id,
  name,
  saveAs = false,
  session,
}) {
  await ensureSessionDir()

  const normalized = normalizeManifestPayload({
    ...session,
    name: name ?? session?.name,
  })

  let nextId = id ?? session?.id ?? null
  if (saveAs || !nextId) {
    nextId = generateSessionId(normalized.name)
  }

  const safeId = sanitizeSessionId(nextId)
  const fullPath = sessionFilePath(safeId)

  const existing = !saveAs && existsSync(fullPath) ? await readSavedSession(safeId).catch(() => null) : null

  const manifest = {
    ...normalized,
    id: safeId,
    createdAt: existing?.createdAt ?? normalized.createdAt,
    updatedAt: new Date().toISOString(),
  }

  await writeFile(fullPath, JSON.stringify(manifest, null, 2), 'utf8')
  return manifest
}

export async function resolveLoadedSession(sessionId) {
  const manifest = await readSavedSession(sessionId)
  const sampleRoot = manifest.sampleRoot ?? null

  const clips = await Promise.all(
    (Array.isArray(manifest.clips) ? manifest.clips : []).map(async (clip) => {
      if (!clip?.filled) {
        return {
          ...clip,
          missingFile: false,
        }
      }

      const absolutePath = typeof clip.absolutePath === 'string' ? path.normalize(clip.absolutePath) : null
      const relativePath = typeof clip.relativePath === 'string' ? clip.relativePath : null

      if (absolutePath && (await pathExists(absolutePath))) {
        return {
          ...clip,
          absolutePath,
          missingFile: false,
        }
      }

      if (sampleRoot && relativePath) {
        const rebuiltPath = path.resolve(sampleRoot, relativePath)
        if (await pathExists(rebuiltPath)) {
          return {
            ...clip,
            absolutePath: rebuiltPath,
            missingFile: false,
          }
        }
      }

      return {
        ...clip,
        absolutePath: absolutePath,
        missingFile: true,
      }
    }),
  )

  const missingFilesCount = clips.filter((clip) => clip?.filled && clip?.missingFile).length

  return {
    ...manifest,
    clips,
    missingFilesCount,
  }
}

export function getSessionDirectoryPath() {
  return SESSION_DIR
}
