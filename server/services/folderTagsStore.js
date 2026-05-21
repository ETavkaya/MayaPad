import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'

const TAGS_DIR = path.resolve(process.cwd(), '.launchbrain')
const TAGS_PATH = path.join(TAGS_DIR, 'folder-tags.json')

const DEFAULT_FOLDER_TAGS = {}

let folderTagCache = DEFAULT_FOLDER_TAGS
let folderTagVersion = createHash('md5').update(JSON.stringify(DEFAULT_FOLDER_TAGS)).digest('hex')

function normalizeRelativeFolderPath(relativePath) {
  const normalized = String(relativePath ?? '')
    .trim()
    .replace(/\\+/g, '/')
    .replace(/^\/+|\/+$/g, '')

  return normalized === '.' ? '' : normalized
}

function normalizeFolderTagEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return {
      category: null,
      role: null,
      type: null,
      sessionSuitability: null,
      keyMode: null,
      inheritToChildren: false,
      ignored: false,
    }
  }

  return {
    category: typeof entry.category === 'string' && entry.category.trim() ? entry.category.trim() : null,
    role: typeof entry.role === 'string' && entry.role.trim() ? entry.role.trim() : null,
    type: typeof entry.type === 'string' && entry.type.trim() ? entry.type.trim() : null,
    sessionSuitability:
      typeof entry.sessionSuitability === 'string' && entry.sessionSuitability.trim()
        ? entry.sessionSuitability.trim().toLowerCase()
        : null,
    keyMode: typeof entry.keyMode === 'string' && entry.keyMode.trim() ? entry.keyMode.trim().toLowerCase() : null,
    inheritToChildren: Boolean(entry.inheritToChildren),
    ignored: Boolean(entry.ignored),
  }
}

function normalizeFolderTags(input) {
  const source = input && typeof input === 'object' && !Array.isArray(input)
    ? input.folders && typeof input.folders === 'object' && !Array.isArray(input.folders)
      ? input.folders
      : input
    : {}

  const normalized = {}
  for (const [relativePath, entry] of Object.entries(source)) {
    const key = normalizeRelativeFolderPath(relativePath)
    if (!key) {
      continue
    }
    normalized[key] = normalizeFolderTagEntry(entry)
  }

  return normalized
}

function updateVersion() {
  folderTagVersion = createHash('md5').update(JSON.stringify(folderTagCache)).digest('hex')
}

async function persistFolderTags() {
  await mkdir(TAGS_DIR, { recursive: true })
  await writeFile(TAGS_PATH, JSON.stringify(folderTagCache, null, 2), 'utf8')
  updateVersion()
}

export async function ensureFolderTagsFile() {
  await mkdir(TAGS_DIR, { recursive: true })

  if (!existsSync(TAGS_PATH)) {
    folderTagCache = { ...DEFAULT_FOLDER_TAGS }
    await persistFolderTags()
    return {
      tags: folderTagCache,
      version: folderTagVersion,
      path: TAGS_PATH,
    }
  }

  try {
    const content = await readFile(TAGS_PATH, 'utf8')
    folderTagCache = normalizeFolderTags(JSON.parse(content))
    updateVersion()
    await persistFolderTags()
  } catch {
    folderTagCache = { ...DEFAULT_FOLDER_TAGS }
    await persistFolderTags()
  }

  return {
    tags: folderTagCache,
    version: folderTagVersion,
    path: TAGS_PATH,
  }
}

export async function getFolderTags() {
  if (!existsSync(TAGS_PATH)) {
    return ensureFolderTagsFile()
  }

  if (!folderTagCache || Object.keys(folderTagCache).length === 0) {
    await ensureFolderTagsFile()
  }

  return {
    tags: folderTagCache,
    version: folderTagVersion,
    path: TAGS_PATH,
  }
}

export function resolveFolderTag(relativeFolderPath, folderTags = folderTagCache) {
  const normalized = normalizeRelativeFolderPath(relativeFolderPath)
  if (!normalized) {
    return {
      exact: null,
      inherited: [],
      merged: normalizeFolderTagEntry(null),
    }
  }

  const exact = folderTags[normalized] ? normalizeFolderTagEntry(folderTags[normalized]) : null
  const inherited = []
  const merged = normalizeFolderTagEntry(null)

  const segments = normalized.split('/').filter(Boolean)
  for (let index = 0; index < segments.length; index += 1) {
    const candidatePath = segments.slice(0, index + 1).join('/')
    const candidate = folderTags[candidatePath]
    if (!candidate) {
      continue
    }

    const normalizedCandidate = normalizeFolderTagEntry(candidate)
    const isExact = candidatePath === normalized
    if (!isExact && !normalizedCandidate.inheritToChildren) {
      continue
    }

    if (!isExact) {
      inherited.push({
        relativePath: candidatePath,
        ...normalizedCandidate,
      })
    }

    for (const [key, value] of Object.entries(normalizedCandidate)) {
      if (value !== null && value !== undefined && value !== false && value !== '') {
        merged[key] = value
      }
    }
  }

  if (exact) {
    for (const [key, value] of Object.entries(exact)) {
      if (value !== null && value !== undefined && value !== '') {
        merged[key] = value
      }
    }
  }

  return {
    exact,
    inherited,
    merged,
  }
}

export function getFolderTagsPath() {
  return TAGS_PATH
}
