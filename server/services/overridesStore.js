import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseKey } from './musicTheory.js'

const OVERRIDE_DIR = path.resolve(process.cwd(), '.launchbrain')
const OVERRIDE_PATH = path.join(OVERRIDE_DIR, 'sample-overrides.json')

let overrideCache = {}

function normalizeRelativePath(relativePath) {
  return String(relativePath ?? '')
    .trim()
    .replace(/\\+/g, '/')
}

function normalizeOverrideEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return {
      manualKey: null,
      manualBpm: null,
      excluded: false,
      notes: '',
    }
  }

  const manualBpmNumber = Number(entry.manualBpm)

  return {
    manualKey: typeof entry.manualKey === 'string' && entry.manualKey.trim() ? entry.manualKey.trim() : null,
    manualBpm:
      Number.isFinite(manualBpmNumber) && manualBpmNumber >= 30 && manualBpmNumber <= 300
        ? manualBpmNumber
        : null,
    excluded: Boolean(entry.excluded),
    notes: typeof entry.notes === 'string' ? entry.notes : '',
  }
}

async function persistOverrideCache() {
  await mkdir(OVERRIDE_DIR, { recursive: true })
  await writeFile(OVERRIDE_PATH, JSON.stringify(overrideCache, null, 2), 'utf8')
}

export async function ensureOverrideFile() {
  await mkdir(OVERRIDE_DIR, { recursive: true })

  if (!existsSync(OVERRIDE_PATH)) {
    overrideCache = {}
    await persistOverrideCache()
    return overrideCache
  }

  try {
    const content = await readFile(OVERRIDE_PATH, 'utf8')
    const parsed = JSON.parse(content)
    overrideCache = typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    overrideCache = {}
    await persistOverrideCache()
  }

  return overrideCache
}

export async function getSampleOverrides() {
  if (!existsSync(OVERRIDE_PATH)) {
    await ensureOverrideFile()
    return overrideCache
  }

  if (!overrideCache || Object.keys(overrideCache).length === 0) {
    await ensureOverrideFile()
  }

  return overrideCache
}

export async function upsertSampleOverride(relativePath, patch) {
  const normalizedPath = normalizeRelativePath(relativePath)
  if (!normalizedPath) {
    throw new Error('relativePath is required.')
  }

  await ensureOverrideFile()

  const current = normalizeOverrideEntry(overrideCache[normalizedPath])
  const merged = normalizeOverrideEntry({
    ...current,
    ...patch,
  })

  const hasMeaningfulValue =
    merged.manualKey !== null || merged.manualBpm !== null || merged.excluded || merged.notes.trim().length > 0

  if (!hasMeaningfulValue) {
    delete overrideCache[normalizedPath]
  } else {
    overrideCache[normalizedPath] = merged
  }

  await persistOverrideCache()

  return {
    relativePath: normalizedPath,
    override: overrideCache[normalizedPath] ?? null,
  }
}

export async function deleteSampleOverride(relativePath) {
  const normalizedPath = normalizeRelativePath(relativePath)
  if (!normalizedPath) {
    throw new Error('relativePath is required.')
  }

  await ensureOverrideFile()

  delete overrideCache[normalizedPath]
  await persistOverrideCache()

  return {
    relativePath: normalizedPath,
  }
}

export function applyOverridesToSamples(samples, overridesInput) {
  const overrides = overridesInput ?? overrideCache ?? {}

  return samples.map((sample) => {
    const relativePath = normalizeRelativePath(sample.relativePath)
    const override = normalizeOverrideEntry(overrides[relativePath])

    const next = {
      ...sample,
      originalParsedKey: sample.parsedKey ?? null,
      originalNormalizedKey: sample.normalizedKey ?? null,
      originalBpm: sample.bpm ?? null,
      originalDetectedBpm: sample.detectedBpm ?? null,
      excluded: override.excluded,
    }

    if (override.manualBpm !== null) {
      next.bpm = override.manualBpm
      next.detectedBpm = override.manualBpm
      next.bpmSource = 'manual'
    }

    if (override.manualKey !== null) {
      const parsed = parseKey(override.manualKey)
      if (parsed) {
        next.key = parsed.normalizedKey
        next.parsedKey = parsed.parsedKey
        next.normalizedKey = parsed.normalizedKey
        next.keySource = 'manual'
        next.keyConfidence = 'high'
      } else {
        next.key = null
        next.parsedKey = null
        next.normalizedKey = null
        next.keySource = 'manual'
        next.keyConfidence = 'high'
      }
    }

    return next
  })
}

export function getOverridePath() {
  return OVERRIDE_PATH
}

export function normalizeOverrideKey(relativePath) {
  return normalizeRelativePath(relativePath)
}
