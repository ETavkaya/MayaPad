import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'

const AUDIO_EXTENSIONS = new Set(['.wav', '.aiff', '.aif', '.mp3', '.flac', '.ogg'])

export const CATEGORY_NAMES = [
  'All Samples',
  'Drums',
  'Hats / Perc',
  'Bass',
  'Instrument / Chord',
  'Melody',
  'Guitar / Texture',
  'Vocal',
  'FX',
  'Uncategorized',
]

const CATEGORY_KEYWORDS = [
  {
    category: 'Drums',
    keywords: ['kick', 'snare', 'clap', 'beat', 'drum'],
  },
  {
    category: 'Hats / Perc',
    keywords: ['hat', 'perc', 'shaker', 'ride', 'crash'],
  },
  {
    category: 'Bass',
    keywords: ['bass', 'sub', '808'],
  },
  {
    category: 'Instrument / Chord',
    keywords: ['chord', 'pad', 'keys', 'piano', 'synth'],
  },
  {
    category: 'Melody',
    keywords: ['melody', 'lead', 'arp', 'pluck'],
  },
  {
    category: 'Guitar / Texture',
    keywords: ['guitar', 'texture', 'ambience', 'ambient'],
  },
  {
    category: 'Vocal',
    keywords: ['vocal', 'vox', 'voice', 'maya'],
  },
  {
    category: 'FX',
    keywords: ['fx', 'riser', 'impact', 'downer', 'sweep', 'noise'],
  },
]

const LOOP_KEYWORDS = [
  'loop',
  'groove',
  'beat',
  'phrase',
  'arp',
  'chord',
  'melody',
  'bass',
  'pad',
  'texture',
  'ambience',
  'vocal',
  'vox',
  'guitar',
]

const EXPLICIT_ONESHOT_KEYWORDS = [
  'one-shot',
  'oneshot',
  'single',
  'hit',
  'impact',
  'stab',
  'shot',
]

const DRUM_HIT_KEYWORDS = [
  'kick',
  'snare',
  'clap',
  'rim',
  'tom',
  'crash',
  'ride',
  'closed hat',
  'open hat',
  'chh',
  'ohh',
]

const MAJOR_MINOR_MAP = {
  maj: 'Major',
  major: 'Major',
  min: 'Minor',
  minor: 'Minor',
}

function normalizeForMatch(value) {
  return value.toLowerCase().replace(/[^a-z0-9#b]+/g, ' ')
}

function inferCategory(value) {
  const normalized = normalizeForMatch(value)

  for (const rule of CATEGORY_KEYWORDS) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.category
    }
  }

  return 'Uncategorized'
}

function inferType(value) {
  const normalized = normalizeForMatch(value)

  const hasLoopKeyword = LOOP_KEYWORDS.some((keyword) => normalized.includes(keyword))

  if (EXPLICIT_ONESHOT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'one-shot'
  }

  if (hasLoopKeyword) {
    return 'loop'
  }

  if (DRUM_HIT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'one-shot'
  }

  return 'loop'
}

function inferLoopConfidence(value, inferredType) {
  const normalized = normalizeForMatch(value)

  if (inferredType === 'one-shot') {
    return 'low'
  }

  if (LOOP_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'high'
  }

  return 'medium'
}

function inferBpm(value) {
  const bpmPattern = /(?:^|[\s_\-()[\]{}])(\d{2,3})\s*[_-]?\s*bpm(?:$|[\s_\-()[\]{}])/i
  const barePattern = /(?:^|[_\-\s()[\]{}])(\d{2,3})(?:[_\-\s()[\]{}]|$)/

  const explicit = value.match(bpmPattern)
  if (explicit) {
    const bpm = Number(explicit[1])
    if (Number.isFinite(bpm) && bpm >= 50 && bpm <= 220) {
      return bpm
    }
  }

  const bare = value.match(barePattern)
  if (bare) {
    const bpm = Number(bare[1])
    if (Number.isFinite(bpm) && bpm >= 50 && bpm <= 220) {
      return bpm
    }
  }

  return null
}

function inferKey(value) {
  const normalized = value.replace(/[_-]/g, ' ')
  const keyWithMode = normalized.match(
    /(?:^|[\s()[\]{}])([A-G](?:#|b)?)(?:\s*)(major|minor|maj|min|m)(?:$|[\s()[\]{}])/i,
  )

  if (keyWithMode) {
    const note = keyWithMode[1].toUpperCase()
    const modeRaw = keyWithMode[2].toLowerCase()
    const mode = modeRaw === 'm' ? 'Minor' : MAJOR_MINOR_MAP[modeRaw] ?? 'Major'
    return `${note} ${mode}`
  }

  const noteOnly = normalized.match(/\b([A-G](?:#|b)?)\b/i)
  if (noteOnly) {
    return noteOnly[1].toUpperCase()
  }

  return null
}

function inferTags(relativePath, category, type) {
  const tokens = relativePath
    .toLowerCase()
    .split(/[^a-z0-9#b]+/g)
    .filter((token) => token.length > 2)

  const unique = new Set(tokens)
  if (category !== 'Uncategorized') {
    unique.add(category.toLowerCase())
  }
  if (type !== 'unknown') {
    unique.add(type)
  }

  return [...unique].slice(0, 8)
}

function fileId(absolutePath) {
  return createHash('md5').update(absolutePath).digest('hex')
}

async function walkDirectory(rootPath) {
  const files = []

  async function walk(currentPath) {
    let entries = []

    try {
      entries = await readdir(currentPath, { withFileTypes: true })
    } catch {
      return
    }

    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(currentPath, entry.name)

        if (entry.isDirectory()) {
          await walk(fullPath)
          return
        }

        if (!entry.isFile()) {
          return
        }

        const extension = path.extname(entry.name).toLowerCase()
        if (!AUDIO_EXTENSIONS.has(extension)) {
          return
        }

        files.push(fullPath)
      }),
    )
  }

  await walk(rootPath)
  return files
}

function createSampleRecord(absolutePath, sampleRoot) {
  const filename = path.basename(absolutePath)
  const relativePath = path.relative(sampleRoot, absolutePath)
  const searchable = `${relativePath} ${filename}`

  const category = inferCategory(searchable)
  const type = inferType(searchable)
  const loopConfidence = inferLoopConfidence(searchable, type)
  const detectedBpm = inferBpm(searchable)
  const bpmSource = detectedBpm !== null ? 'filename' : 'unknown'
  const key = inferKey(searchable)

  return {
    id: fileId(absolutePath),
    filename,
    absolutePath,
    relativePath,
    category,
    bpm: detectedBpm,
    detectedBpm,
    bpmSource,
    key,
    type,
    loopConfidence,
    duration: null,
    durationSeconds: null,
    estimatedBeats: null,
    beatsLength: null,
    syncStatus: detectedBpm !== null ? 'ready' : 'bpm_missing',
    playbackRate: null,
    tags: inferTags(relativePath, category, type),
  }
}

export function buildCategoryCounts(samples) {
  const counts = new Map(CATEGORY_NAMES.map((name) => [name, 0]))
  counts.set('All Samples', samples.length)

  for (const sample of samples) {
    counts.set(sample.category, (counts.get(sample.category) ?? 0) + 1)
  }

  return CATEGORY_NAMES.map((name) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    count: counts.get(name) ?? 0,
  }))
}

export function buildImportedFolders(samples) {
  const folders = new Set()

  for (const sample of samples) {
    const [firstFolder] = sample.relativePath.split(/[\\/]/)
    if (firstFolder && firstFolder !== sample.filename) {
      folders.add(firstFolder)
    }
  }

  return [...folders].sort((a, b) => a.localeCompare(b)).slice(0, 24)
}

export async function scanSampleLibrary(sampleRoot) {
  const files = await walkDirectory(sampleRoot)
  const samples = files
    .map((absolutePath) => createSampleRecord(absolutePath, sampleRoot))
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath))

  return {
    sampleRoot,
    scannedAt: new Date().toISOString(),
    sampleCount: samples.length,
    categories: buildCategoryCounts(samples),
    importedFolders: buildImportedFolders(samples),
    samples,
  }
}
