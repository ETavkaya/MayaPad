import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { hasDatabase, withDbClient } from './db.js'
import { getFolderTags, resolveFolderTag } from './folderTagsStore.js'
import { parseKey } from './musicTheory.js'
import { getSampleOverrides } from './overridesStore.js'
import { enqueueFolderEnrichmentJobs, isSemanticEnrichmentEnabled, runPendingSemanticEnrichmentJobs } from './semanticEnrichment.js'

const SCANNER_VERSION = 'semantic-v1'
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

const CATEGORY_DEFINITIONS = [
  {
    category: 'Drums',
    role: 'drum',
    subtype: 'drum_loop',
    keywords: ['drum loop', 'drumloop', 'drum loops', 'drums', 'breakbeat', 'beat', 'groove', 'full drum', 'funk break'],
    filenameKeywords: ['beat', 'groove', 'breakbeat', 'drumloop'],
    sessionSuitability: 'high',
    type: 'loop',
    keyMode: 'key-neutral',
  },
  {
    category: 'Hats / Perc',
    role: 'drum2_hats',
    subtype: 'top_loop',
    keywords: ['top loop', 'top loops', 'hat loop', 'hats', 'shaker', 'perc loop', 'percussion loop', 'afro percussion', 'percussion'],
    filenameKeywords: ['hat loop', 'top loop', 'perc loop', 'shaker', 'percussion loop'],
    sessionSuitability: 'high',
    type: 'loop',
    keyMode: 'key-neutral',
  },
  {
    category: 'Bass',
    role: 'bass',
    subtype: 'bass_loop',
    keywords: ['bass loops', 'bass loop', 'bassline', '808 loop', 'sub bass', 'bass'],
    filenameKeywords: ['bass', '808', 'sub bass'],
    sessionSuitability: 'high',
    type: 'loop',
    keyMode: 'harmonic',
  },
  {
    category: 'Instrument / Chord',
    role: 'instrument_chord',
    subtype: 'chord_loop',
    keywords: ['chord loops', 'chord', 'keys', 'piano', 'synth', 'construction kits', 'construction kit', 'pads', 'pad'],
    filenameKeywords: ['chord', 'keys', 'piano', 'pad', 'synth'],
    sessionSuitability: 'high',
    type: 'loop',
    keyMode: 'harmonic',
  },
  {
    category: 'Melody',
    role: 'melody',
    subtype: 'melody_loop',
    keywords: ['melody loops', 'melodic loops', 'melody', 'lead', 'arp', 'pluck'],
    filenameKeywords: ['melody', 'lead', 'arp', 'pluck'],
    sessionSuitability: 'high',
    type: 'loop',
    keyMode: 'harmonic',
  },
  {
    category: 'Guitar / Texture',
    role: 'guitar_texture',
    subtype: 'texture_loop',
    keywords: ['guitar loops', 'guitar', 'textures', 'texture', 'atmosphere', 'atmospheres', 'ambient', 'ambience', 'pads'],
    filenameKeywords: ['guitar', 'texture', 'ambient', 'ambience', 'atmosphere'],
    sessionSuitability: 'high',
    type: 'loop',
    keyMode: 'harmonic',
  },
  {
    category: 'Vocal',
    role: 'vocal',
    subtype: 'vocal_phrase',
    keywords: ['vocal atmospheres', 'vocal atmosphere', 'vocals', 'vocal', 'vox', 'voice', 'adlibs', 'adlib', 'wet vocals', 'dry vocals'],
    filenameKeywords: ['vocal', 'vox', 'voice', 'adlib', 'phrase'],
    sessionSuitability: 'high',
    type: 'loop',
    keyMode: 'harmonic',
  },
  {
    category: 'FX',
    role: 'fx',
    subtype: 'fx_transition',
    keywords: ['fx', 'riser', 'impact', 'sweep', 'downer', 'noise', 'reverse', 'transition', 'transitions', 'uplifter'],
    filenameKeywords: ['fx', 'riser', 'impact', 'sweep', 'reverse', 'transition'],
    sessionSuitability: 'medium',
    type: 'loop',
    keyMode: 'key-neutral',
  },
]

const HIGH_VALUE_LOOP_HINTS = [
  'loop',
  'loops',
  'phrase',
  'phrases',
  'groove',
  'grooves',
  'stem',
  'stems',
  'texture',
  'textures',
  'atmosphere',
  'atmospheres',
  'break',
  'breaks',
]

const LOW_VALUE_IGNORE_HINTS = [
  'one shot',
  'one-shot',
  'oneshot',
  'single hit',
  'single hits',
  'kick',
  'snare',
  'clap',
  'rim',
  'tom',
  'chh',
  'ohh',
  'closed hat',
  'open hat',
  'serum',
  'kontakt',
  'preset',
  'presets',
  'midi',
  'fxp',
  'project',
  'preview',
  'demo',
  'helper',
  'utility',
]

const SESSION_TAG_MAP = {
  dark: ['dark', 'moody', 'night'],
  melodic: ['melodic', 'melody', 'lead'],
  aggressive: ['aggressive', 'hard', 'heavy'],
  cinematic: ['cinematic', 'score', 'film'],
  afro: ['afro', 'afrobeats', 'afrobeat'],
  funk: ['funk', 'funky'],
  atmospheric: ['atmosphere', 'atmospheric', 'ambience', 'ambient'],
  ambient: ['ambient', 'ambience', 'texture'],
  vocal_texture: ['vocal atmosphere', 'vocal texture', 'adlib', 'vox'],
  emotional: ['emotional', 'soulful', 'sad'],
  rhythmic: ['groove', 'beat', 'percussion', 'drum loop'],
  punchy: ['punchy', 'punch', 'impact'],
  organic: ['organic', 'acoustic', 'guitar'],
  synthetic: ['synthetic', 'synth', 'digital'],
}

const INSTRUMENTATION_TAG_MAP = {
  drums: ['drum', 'kick', 'snare', 'clap', 'percussion', 'shaker', 'breakbeat'],
  bass: ['bass', '808', 'sub'],
  keys: ['piano', 'keys', 'rhodes'],
  synth: ['synth', 'pad', 'arp', 'lead'],
  guitar: ['guitar'],
  vocal: ['vocal', 'vox', 'voice', 'adlib', 'chant'],
  fx: ['fx', 'riser', 'impact', 'sweep', 'noise'],
}

function normalizePathKey(input) {
  return String(input ?? '')
    .trim()
    .replace(/\\+/g, '/')
    .replace(/^\/+|\/+$/g, '')
}

function normalizeText(input) {
  return String(input ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9#b]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function fileId(absolutePath) {
  return createHash('md5').update(absolutePath).digest('hex')
}

function safeJson(value, fallback) {
  if (!value) {
    return fallback
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return fallback
    }
  }

  return value
}

function splitRelativePath(relativePath) {
  return normalizePathKey(relativePath).split('/').filter(Boolean)
}

function getPackNameFromRelativePath(relativePath) {
  const segments = splitRelativePath(relativePath)
  return segments[0] ?? 'Root'
}

function getFolderRelativePath(relativePath) {
  const normalized = normalizePathKey(path.dirname(relativePath))
  return normalized === '.' ? '' : normalized
}

function getParentFolders(folderRelativePath) {
  const segments = splitRelativePath(folderRelativePath)
  if (segments.length <= 1) {
    return []
  }

  return segments.slice(0, -1).reverse()
}

function inferBpmFromText(value) {
  const text = String(value ?? '')
  const patterns = [
    /(?:^|[\s_\-()[\]{}])(\d{2,3})\s*[_-]?\s*bpm(?:$|[\s_\-()[\]{}])/i,
    /(?:^|[\s_\-()[\]{}])(\d{2,3})(?:$|[\s_\-()[\]{}])/,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match) {
      continue
    }

    const bpm = Number(match[1])
    if (Number.isFinite(bpm) && bpm >= 50 && bpm <= 220) {
      return bpm
    }
  }

  return null
}

function inferKeyFromContext(filename, folderRelativePath, packName) {
  const filenameStem = filename.replace(/\.[a-z0-9]{2,5}$/i, '')
  const filenameParsed = parseKey(filenameStem)
  if (filenameParsed) {
    return {
      key: filenameParsed.normalizedKey,
      normalizedKey: filenameParsed.normalizedKey,
      keySource: 'filename',
      keyConfidence: filenameParsed.confidence,
      parsedKey: filenameParsed.parsedKey,
    }
  }

  const folderParsed = parseKey(folderRelativePath)
  if (folderParsed) {
    return {
      key: folderParsed.normalizedKey,
      normalizedKey: folderParsed.normalizedKey,
      keySource: 'folder',
      keyConfidence: folderParsed.confidence === 'high' ? 'medium' : folderParsed.confidence,
      parsedKey: folderParsed.parsedKey,
    }
  }

  const packParsed = parseKey(packName)
  if (packParsed) {
    return {
      key: packParsed.normalizedKey,
      normalizedKey: packParsed.normalizedKey,
      keySource: 'folder',
      keyConfidence: 'low',
      parsedKey: packParsed.parsedKey,
    }
  }

  return {
    key: null,
    normalizedKey: null,
    keySource: 'unknown',
    keyConfidence: 'low',
    parsedKey: null,
  }
}

function inferTypeFromContext(folderContextText, filenameText) {
  const normalizedFolder = normalizeText(folderContextText)
  const normalizedFilename = normalizeText(filenameText)
  const combined = `${normalizedFolder} ${normalizedFilename}`.trim()

  const hasLoop = HIGH_VALUE_LOOP_HINTS.some((keyword) => combined.includes(keyword))
  const hasOneShot =
    LOW_VALUE_IGNORE_HINTS.some((keyword) => combined.includes(keyword)) &&
    !combined.includes('loop') &&
    !combined.includes('groove') &&
    !combined.includes('phrase')

  if (hasLoop) {
    return 'loop'
  }

  if (hasOneShot) {
    return 'one-shot'
  }

  return 'unknown'
}

function inferLoopConfidence(type, folderContextText, filenameText) {
  const combined = `${normalizeText(folderContextText)} ${normalizeText(filenameText)}`.trim()

  if (type === 'loop') {
    if (HIGH_VALUE_LOOP_HINTS.some((keyword) => combined.includes(keyword))) {
      return 'high'
    }

    return 'medium'
  }

  return 'low'
}

function collectTags(text, dictionary) {
  const normalized = normalizeText(text)
  const results = []

  for (const [tag, keywords] of Object.entries(dictionary)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      results.push(tag)
    }
  }

  return results
}

function inferFolderCategory(folderContextText, filenameText) {
  const folderText = normalizeText(folderContextText)
  const filenameNormalized = normalizeText(filenameText)
  const packText = `${folderText} ${filenameNormalized}`.trim()

  let bestMatch = null
  let bestScore = -1

  for (const definition of CATEGORY_DEFINITIONS) {
    let score = 0
    for (const keyword of definition.keywords) {
      if (folderText.includes(keyword)) {
        score += 5
      }
    }
    for (const keyword of definition.filenameKeywords) {
      if (filenameNormalized.includes(keyword)) {
        score += 2
      }
    }
    if (packText.includes(definition.category.toLowerCase())) {
      score += 1
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = definition
    }
  }

  if (!bestMatch || bestScore <= 0) {
    return {
      category: 'Uncategorized',
      role: null,
      subtype: 'unknown',
      categoryConfidence: 'low',
      categorySource: 'unknown',
      sessionSuitability: 'low',
      keyMode: 'unknown',
      baseType: null,
    }
  }

  return {
    category: bestMatch.category,
    role: bestMatch.role,
    subtype: bestMatch.subtype,
    categoryConfidence: bestScore >= 6 ? 'high' : 'medium',
    categorySource: folderText.includes(bestMatch.keywords[0]) ? 'folder' : 'filename',
    sessionSuitability: bestMatch.sessionSuitability,
    keyMode: bestMatch.keyMode,
    baseType: bestMatch.type,
  }
}

function inferSessionSuitability(categoryMeta, inferredType, semanticText) {
  const normalized = normalizeText(semanticText)

  if (LOW_VALUE_IGNORE_HINTS.some((keyword) => normalized.includes(keyword)) && inferredType !== 'loop') {
    return {
      sessionSuitability: 'ignore',
      ignored: true,
      ignoredReason: 'Utility/one-shot content is excluded from the live session grid by default.',
    }
  }

  if (categoryMeta.category === 'FX') {
    return {
      sessionSuitability: 'medium',
      ignored: false,
      ignoredReason: null,
    }
  }

  if (inferredType === 'loop' && categoryMeta.category !== 'Uncategorized') {
    return {
      sessionSuitability: 'high',
      ignored: false,
      ignoredReason: null,
    }
  }

  if (HIGH_VALUE_LOOP_HINTS.some((keyword) => normalized.includes(keyword))) {
    return {
      sessionSuitability: 'medium',
      ignored: false,
      ignoredReason: null,
    }
  }

  return {
    sessionSuitability: 'low',
    ignored: false,
    ignoredReason: null,
  }
}

function buildClassificationReason(parts) {
  return parts.filter(Boolean).join(' ')
}

function toSampleRecordFromRow(row) {
  const semanticTags = Array.isArray(row.semantic_tags) ? row.semantic_tags : safeJson(row.semantic_tags, [])
  const moodTags = Array.isArray(row.mood_tags) ? row.mood_tags : safeJson(row.mood_tags, [])
  const instrumentationTags = Array.isArray(row.instrumentation_tags)
    ? row.instrumentation_tags
    : safeJson(row.instrumentation_tags, [])
  const sourceContext = safeJson(row.source_context, {})

  return {
    id: row.id,
    filename: row.filename,
    absolutePath: row.absolute_path,
    relativePath: row.relative_path,
    extension: row.extension ?? path.extname(row.filename).toLowerCase(),
    sizeBytes: row.size_bytes ?? null,
    category: row.category ?? 'Uncategorized',
    categoryConfidence: row.category_confidence ?? 'low',
    categorySource: sourceContext.categorySource ?? 'unknown',
    bpm: row.bpm ?? null,
    detectedBpm: row.bpm ?? null,
    bpmSource: row.bpm_source ?? 'unknown',
    key: row.key ?? null,
    parsedKey: row.key ?? null,
    normalizedKey: row.normalized_key ?? null,
    keySource: row.key_source ?? 'unknown',
    keyConfidence: sourceContext.keyConfidence ?? 'low',
    excluded: Boolean(sourceContext.overrideExcluded ?? false),
    type: row.type ?? 'unknown',
    loopConfidence: row.loop_confidence ?? 'low',
    duration: row.duration_seconds ?? null,
    durationSeconds: row.duration_seconds ?? null,
    estimatedBeats: sourceContext.estimatedBeats ?? null,
    beatsLength: sourceContext.beatsLength ?? null,
    syncStatus: sourceContext.syncStatus ?? (row.bpm ? 'length_uncertain' : 'bpm_missing'),
    playbackRate: sourceContext.playbackRate ?? null,
    tags: [...new Set([...(semanticTags ?? []), ...(moodTags ?? []), ...(instrumentationTags ?? [])])].slice(0, 12),
    subtype: row.subtype ?? null,
    role: row.role ?? null,
    sessionSuitability: row.session_suitability ?? 'low',
    ignored: Boolean(row.ignored),
    ignoredReason: row.ignored_reason ?? null,
    semanticTags,
    moodTags,
    instrumentationTags,
    sourceContext,
    classificationReason: row.classification_reason ?? null,
  }
}

async function walkSampleLibrary(sampleRoot) {
  const audioFiles = []
  const directories = new Set()

  async function walk(currentPath) {
    let entries = []
    try {
      entries = await readdir(currentPath, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)
      if (entry.isDirectory()) {
        const relativeDirectory = normalizePathKey(path.relative(sampleRoot, fullPath))
        if (relativeDirectory) {
          directories.add(relativeDirectory)
        }
        await walk(fullPath)
        continue
      }

      if (!entry.isFile()) {
        continue
      }

      const extension = path.extname(entry.name).toLowerCase()
      if (!AUDIO_EXTENSIONS.has(extension)) {
        continue
      }

      const details = await stat(fullPath).catch(() => null)
      if (!details || !details.isFile()) {
        continue
      }

      audioFiles.push({
        absolutePath: fullPath,
        relativePath: normalizePathKey(path.relative(sampleRoot, fullPath)),
        filename: entry.name,
        extension,
        sizeBytes: details.size,
        modifiedAt: details.mtime.toISOString(),
      })

      const relativeDirectory = normalizePathKey(path.dirname(path.relative(sampleRoot, fullPath)))
      if (relativeDirectory && relativeDirectory !== '.') {
        directories.add(relativeDirectory)
      }
    }
  }

  await walk(sampleRoot)

  return {
    audioFiles,
    directories: [...directories].filter((item) => item && item !== '.'),
  }
}

function createSemanticRecord(fileEntry, sampleRoot, folderTagsState, existingRow) {
  const relativePath = fileEntry.relativePath
  const filename = fileEntry.filename
  const folderRelativePath = getFolderRelativePath(relativePath)
  const packName = getPackNameFromRelativePath(relativePath)
  const folderName = splitRelativePath(folderRelativePath).slice(-1)[0] ?? packName
  const parentFolders = getParentFolders(folderRelativePath)
  const folderTag = resolveFolderTag(folderRelativePath, folderTagsState.tags)
  const folderContextText = [packName, folderRelativePath, ...parentFolders].filter(Boolean).join(' ')
  const categoryMeta = inferFolderCategory(folderContextText, filename)
  const inferredType = folderTag.merged.type ?? inferTypeFromContext(folderContextText, filename) ?? categoryMeta.baseType ?? 'unknown'
  const loopConfidence = inferLoopConfidence(inferredType, folderContextText, filename)
  const keyMeta = inferKeyFromContext(filename, folderRelativePath, packName)
  const bpm = inferBpmFromText(`${folderContextText} ${filename}`)
  const suitabilityMeta = inferSessionSuitability(categoryMeta, inferredType, `${folderContextText} ${filename}`)
  const semanticText = [packName, folderRelativePath, filename].filter(Boolean).join(' ')

  const category = folderTag.merged.category ?? categoryMeta.category
  const role = folderTag.merged.role ?? categoryMeta.role
  const sessionSuitability = folderTag.merged.sessionSuitability ?? suitabilityMeta.sessionSuitability
  const ignored = folderTag.merged.ignored ? true : suitabilityMeta.ignored || sessionSuitability === 'ignore'
  const ignoredReason = folderTag.merged.ignored ? 'Ignored by folder tag override.' : suitabilityMeta.ignoredReason
  const type = folderTag.merged.type ?? inferredType
  const keyMode = folderTag.merged.keyMode ?? categoryMeta.keyMode
  const categoryConfidence = folderTag.exact ? 'high' : categoryMeta.categoryConfidence
  const categorySource = folderTag.exact ? 'manual' : categoryMeta.categorySource
  const keySource = keyMeta.keySource
  const keyConfidence = keyMeta.keyConfidence
  const subtype = categoryMeta.subtype

  const semanticTags = [...new Set(collectTags(semanticText, SESSION_TAG_MAP))]
  const moodTags = semanticTags.filter((tag) => ['dark', 'aggressive', 'cinematic', 'emotional', 'atmospheric', 'ambient'].includes(tag))
  const instrumentationTags = [...new Set(collectTags(semanticText, INSTRUMENTATION_TAG_MAP))]

  const classificationReason = buildClassificationReason([
    folderTag.exact ? `Folder tag override applied for ${folderRelativePath || packName}.` : null,
    category !== 'Uncategorized' ? `Folder context suggests ${category}.` : 'No strong folder category match.',
    bpm !== null ? `Parsed BPM ${bpm}.` : 'No reliable BPM token found.',
    keyMeta.normalizedKey ? `Parsed key ${keyMeta.normalizedKey}.` : 'No reliable key token found.',
    type === 'loop' ? 'Loop-oriented content prioritized for session launch.' : null,
    ignoredReason,
  ])

  const existingSourceContext = safeJson(existingRow?.source_context, {})
  const sourceContext = {
    scannerVersion: SCANNER_VERSION,
    folderTagsVersion: folderTagsState.version,
    packName,
    folderName,
    folderRelativePath,
    parentFolders,
    keyMode,
    categorySource,
    keyConfidence,
    semanticSource: folderTag.exact ? 'folder_tag' : 'scanner',
    folderTagExact: folderTag.exact,
    folderTagInherited: folderTag.inherited,
    enrichmentEligible: isSemanticEnrichmentEnabled(),
    estimatedBeats: existingSourceContext.estimatedBeats ?? null,
    beatsLength: existingSourceContext.beatsLength ?? null,
    syncStatus: existingSourceContext.syncStatus ?? (bpm !== null ? 'length_uncertain' : 'bpm_missing'),
    playbackRate: existingSourceContext.playbackRate ?? null,
  }

  return {
    id: fileId(fileEntry.absolutePath),
    sampleRoot,
    absolutePath: fileEntry.absolutePath,
    relativePath,
    filename,
    extension: fileEntry.extension,
    sizeBytes: fileEntry.sizeBytes,
    modifiedAt: fileEntry.modifiedAt,
    durationSeconds: existingRow?.duration_seconds ?? null,
    bpm,
    bpmSource: bpm !== null ? 'filename' : 'unknown',
    key: keyMeta.normalizedKey,
    normalizedKey: keyMeta.normalizedKey,
    keySource,
    category,
    subtype,
    role,
    type,
    loopConfidence,
    categoryConfidence,
    sessionSuitability,
    ignored,
    ignoredReason,
    semanticTags,
    moodTags,
    instrumentationTags,
    sourceContext,
    classificationReason,
    semanticSource: folderTag.exact ? 'folder_tag' : 'scanner',
    detectedBpm: bpm,
    parsedKey: keyMeta.parsedKey,
    keyConfidence,
    categorySource,
    tags: [...new Set([...semanticTags, ...moodTags, ...instrumentationTags, category.toLowerCase(), type])]
      .filter(Boolean)
      .slice(0, 12),
    excluded: false,
    duration: existingRow?.duration_seconds ?? null,
    estimatedBeats: sourceContext.estimatedBeats,
    beatsLength: sourceContext.beatsLength,
    syncStatus: sourceContext.syncStatus,
    playbackRate: sourceContext.playbackRate,
  }
}

async function loadExistingSampleRows(sampleRoot) {
  if (!hasDatabase()) {
    return new Map()
  }

  return withDbClient(async (client) => {
    const result = await client.query(
      `
        select *
        from samples
        where sample_root = $1
      `,
      [sampleRoot],
    )

    return new Map(result.rows.map((row) => [row.relative_path, row]))
  })
}

function isUnchangedFile(existingRow, fileEntry, folderTagsVersion) {
  if (!existingRow) {
    return false
  }

  const sourceContext = safeJson(existingRow.source_context, {})
  const rowModifiedAt =
    typeof existingRow.modified_at?.toISOString === 'function'
      ? existingRow.modified_at.toISOString()
      : String(existingRow.modified_at ?? '')

  return (
    Number(existingRow.size_bytes ?? 0) === Number(fileEntry.sizeBytes) &&
    rowModifiedAt === String(fileEntry.modifiedAt) &&
    sourceContext.scannerVersion === SCANNER_VERSION &&
    sourceContext.folderTagsVersion === folderTagsVersion
  )
}

async function persistSemanticIndex(sampleRoot, sampleRecords, directories, folderTagsState, folderPayloads) {
  if (!hasDatabase()) {
    return
  }

  const sampleOverrides = await getSampleOverrides().catch(() => ({}))

  await withDbClient(async (client) => {
    await client.query('begin')

    try {
      const packIdByRelative = new Map()
      const folderIdByRelative = new Map()

      const sortedDirectories = [...new Set(directories)]
        .filter((directory) => directory && directory !== '.')
        .sort((left, right) => left.split('/').length - right.split('/').length || left.localeCompare(right))

      for (const directory of sortedDirectories) {
        const segments = splitRelativePath(directory)
        const packRelativePath = segments[0]
        const packAbsolutePath = path.join(sampleRoot, packRelativePath)
        const packSemanticContext = {
          packName: packRelativePath,
          scannerVersion: SCANNER_VERSION,
        }

        if (!packIdByRelative.has(packRelativePath)) {
          const packResult = await client.query(
            `
              insert into packs (sample_root, name, relative_path, absolute_path, semantic_context, updated_at)
              values ($1, $2, $3, $4, $5::jsonb, now())
              on conflict (sample_root, relative_path)
              do update set
                name = excluded.name,
                absolute_path = excluded.absolute_path,
                semantic_context = excluded.semantic_context,
                updated_at = now()
              returning id
            `,
            [sampleRoot, packRelativePath, packRelativePath, packAbsolutePath, JSON.stringify(packSemanticContext)],
          )
          packIdByRelative.set(packRelativePath, packResult.rows[0].id)
        }

        const folderTag = resolveFolderTag(directory, folderTagsState.tags)
        const folderResult = await client.query(
          `
            insert into folders (pack_id, sample_root, name, relative_path, absolute_path, parent_relative_path, depth, semantic_context, folder_tags, updated_at)
            values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, now())
            on conflict (sample_root, relative_path)
            do update set
              pack_id = excluded.pack_id,
              name = excluded.name,
              absolute_path = excluded.absolute_path,
              parent_relative_path = excluded.parent_relative_path,
              depth = excluded.depth,
              semantic_context = excluded.semantic_context,
              folder_tags = excluded.folder_tags,
              updated_at = now()
            returning id
          `,
          [
            packIdByRelative.get(packRelativePath) ?? null,
            sampleRoot,
            segments[segments.length - 1] ?? packRelativePath,
            directory,
            path.join(sampleRoot, directory),
            segments.length > 1 ? segments.slice(0, -1).join('/') : null,
            segments.length,
            JSON.stringify({ scannerVersion: SCANNER_VERSION, packName: packRelativePath }),
            JSON.stringify(folderTag.merged),
          ],
        )
        folderIdByRelative.set(directory, folderResult.rows[0].id)
      }

      const scannedRelativePaths = []

      for (const sample of sampleRecords) {
        scannedRelativePaths.push(sample.relativePath)
        const packRelativePath = getPackNameFromRelativePath(sample.relativePath)
        const folderRelativePath = getFolderRelativePath(sample.relativePath)
        const packId = packIdByRelative.get(packRelativePath) ?? null
        const folderId = folderIdByRelative.get(folderRelativePath) ?? null

        await client.query(
          `
            insert into samples (
              id,
              pack_id,
              folder_id,
              sample_root,
              absolute_path,
              relative_path,
              filename,
              extension,
              size_bytes,
              modified_at,
              duration_seconds,
              bpm,
              bpm_source,
              key,
              normalized_key,
              key_source,
              category,
              subtype,
              role,
              type,
              loop_confidence,
              category_confidence,
              session_suitability,
              ignored,
              ignored_reason,
              semantic_tags,
              mood_tags,
              instrumentation_tags,
              source_context,
              classification_reason,
              semantic_source,
              updated_at
            ) values (
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27::jsonb,$28::jsonb,$29::jsonb,$30,$31,now()
            )
            on conflict (id)
            do update set
              pack_id = excluded.pack_id,
              folder_id = excluded.folder_id,
              sample_root = excluded.sample_root,
              absolute_path = excluded.absolute_path,
              relative_path = excluded.relative_path,
              filename = excluded.filename,
              extension = excluded.extension,
              size_bytes = excluded.size_bytes,
              modified_at = excluded.modified_at,
              duration_seconds = coalesce(excluded.duration_seconds, samples.duration_seconds),
              bpm = excluded.bpm,
              bpm_source = excluded.bpm_source,
              key = excluded.key,
              normalized_key = excluded.normalized_key,
              key_source = excluded.key_source,
              category = excluded.category,
              subtype = excluded.subtype,
              role = excluded.role,
              type = excluded.type,
              loop_confidence = excluded.loop_confidence,
              category_confidence = excluded.category_confidence,
              session_suitability = excluded.session_suitability,
              ignored = excluded.ignored,
              ignored_reason = excluded.ignored_reason,
              semantic_tags = excluded.semantic_tags,
              mood_tags = excluded.mood_tags,
              instrumentation_tags = excluded.instrumentation_tags,
              source_context = excluded.source_context,
              classification_reason = excluded.classification_reason,
              semantic_source = excluded.semantic_source,
              updated_at = now()
          `,
          [
            sample.id,
            packId,
            folderId,
            sampleRoot,
            sample.absolutePath,
            sample.relativePath,
            sample.filename,
            sample.extension,
            sample.sizeBytes,
            sample.modifiedAt,
            sample.durationSeconds,
            sample.bpm,
            sample.bpmSource,
            sample.key,
            sample.normalizedKey,
            sample.keySource,
            sample.category,
            sample.subtype,
            sample.role,
            sample.type,
            sample.loopConfidence,
            sample.categoryConfidence,
            sample.sessionSuitability,
            sample.ignored,
            sample.ignoredReason,
            JSON.stringify(sample.semanticTags ?? []),
            JSON.stringify(sample.moodTags ?? []),
            JSON.stringify(sample.instrumentationTags ?? []),
            JSON.stringify(sample.sourceContext ?? {}),
            sample.classificationReason,
            sample.semanticSource,
          ],
        )
      }

      await client.query(
        'delete from samples where sample_root = $1 and not (relative_path = any($2::text[]))',
        [sampleRoot, scannedRelativePaths.length > 0 ? scannedRelativePaths : ['__none__']],
      )

      const normalizedFolderTags = Object.entries(folderTagsState.tags)
      await client.query('delete from folder_tags where sample_root = $1', [sampleRoot])
      for (const [relativePath, entry] of normalizedFolderTags) {
        await client.query(
          `
            insert into folder_tags (sample_root, relative_path, category, role, type, session_suitability, key_mode, inherit_to_children, ignored, metadata, updated_at)
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,now())
          `,
          [
            sampleRoot,
            relativePath,
            entry.category,
            entry.role,
            entry.type,
            entry.sessionSuitability,
            entry.keyMode,
            Boolean(entry.inheritToChildren),
            Boolean(entry.ignored),
            JSON.stringify(entry),
          ],
        )
      }

      await client.query('delete from sample_overrides where sample_root = $1', [sampleRoot])
      for (const [relativePath, override] of Object.entries(sampleOverrides)) {
        await client.query(
          `
            insert into sample_overrides (sample_root, relative_path, manual_key, manual_bpm, excluded, notes, updated_at)
            values ($1,$2,$3,$4,$5,$6,now())
          `,
          [
            sampleRoot,
            relativePath,
            override?.manualKey ?? null,
            override?.manualBpm ?? null,
            Boolean(override?.excluded),
            typeof override?.notes === 'string' ? override.notes : '',
          ],
        )
      }

      await client.query('commit')
    } catch (error) {
      await client.query('rollback')
      throw error
    }
  })

  if (folderPayloads.length > 0) {
    await enqueueFolderEnrichmentJobs(sampleRoot, folderPayloads)
    runPendingSemanticEnrichmentJobs()
  }
}

function buildFolderPayloads(sampleRoot, sampleRecords) {
  const grouped = new Map()

  for (const sample of sampleRecords) {
    const folderRelativePath = getFolderRelativePath(sample.relativePath)
    if (!folderRelativePath) {
      continue
    }

    if (!grouped.has(folderRelativePath)) {
      grouped.set(folderRelativePath, [])
    }

    grouped.get(folderRelativePath).push(sample)
  }

  return [...grouped.entries()].map(([relativePath, samples]) => {
    const bpmCounts = new Map()
    const keyCounts = new Map()
    const extensionCounts = new Map()
    const categoryCounts = new Map()

    for (const sample of samples) {
      if (sample.detectedBpm !== null) {
        bpmCounts.set(sample.detectedBpm, (bpmCounts.get(sample.detectedBpm) ?? 0) + 1)
      }
      if (sample.normalizedKey) {
        keyCounts.set(sample.normalizedKey, (keyCounts.get(sample.normalizedKey) ?? 0) + 1)
      }
      extensionCounts.set(sample.extension, (extensionCounts.get(sample.extension) ?? 0) + 1)
      categoryCounts.set(sample.category, (categoryCounts.get(sample.category) ?? 0) + 1)
    }

    const topCategory =
      [...categoryCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null

    return {
      sampleRoot,
      relativePath,
      folderName: splitRelativePath(relativePath).slice(-1)[0] ?? relativePath,
      parentFolders: getParentFolders(relativePath),
      packName: getPackNameFromRelativePath(relativePath),
      sampleCount: samples.length,
      firstFilenames: samples.slice(0, 12).map((sample) => sample.filename),
      extensionStats: Object.fromEntries(extensionCounts),
      bpmPatterns: Object.fromEntries(bpmCounts),
      keyPatterns: Object.fromEntries(keyCounts),
      existingScannerGuesses: {
        category: topCategory,
        role: samples[0]?.role ?? null,
        sessionSuitability: samples[0]?.sessionSuitability ?? 'low',
      },
    }
  })
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

  return [...folders].sort((a, b) => a.localeCompare(b)).slice(0, 48)
}

export async function getSemanticIndexedSnapshot(sampleRoot) {
  if (!hasDatabase() || !sampleRoot) {
    return null
  }

  try {
    return await withDbClient(async (client) => {
      const result = await client.query(
        `
          select *
          from samples
          where sample_root = $1
            and ignored = false
          order by relative_path asc
        `,
        [sampleRoot],
      )

      if (result.rowCount === 0) {
        return null
      }

      const scannedAtResult = await client.query(
        `
          select max(updated_at) as scanned_at
          from samples
          where sample_root = $1
        `,
        [sampleRoot],
      )

      const samples = result.rows.map(toSampleRecordFromRow)

      return {
        sampleRoot,
        scannedAt: scannedAtResult.rows[0]?.scanned_at?.toISOString?.() ?? new Date().toISOString(),
        sampleCount: samples.length,
        categories: buildCategoryCounts(samples),
        importedFolders: buildImportedFolders(samples),
        samples,
      }
    })
  } catch {
    return null
  }
}

export async function scanSemanticLibrary(sampleRoot) {
  const folderTagsState = await getFolderTags()
  const { audioFiles, directories } = await walkSampleLibrary(sampleRoot)
  const existingRows = (await loadExistingSampleRows(sampleRoot)) ?? new Map()

  const semanticRecords = audioFiles
    .map((fileEntry) => {
      const existingRow = existingRows.get(fileEntry.relativePath) ?? null
      if (isUnchangedFile(existingRow, fileEntry, folderTagsState.version)) {
        return toSampleRecordFromRow(existingRow)
      }

      return createSemanticRecord(fileEntry, sampleRoot, folderTagsState, existingRow)
    })
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))

  const folderPayloads = buildFolderPayloads(sampleRoot, semanticRecords.filter((sample) => !sample.ignored))
  try {
    await persistSemanticIndex(sampleRoot, semanticRecords, directories, folderTagsState, folderPayloads)
  } catch (error) {
    console.error('Semantic index persistence failed; continuing with in-memory scan result.', error)
  }

  const visibleSamples = semanticRecords.filter((sample) => !sample.ignored)
  return {
    sampleRoot,
    scannedAt: new Date().toISOString(),
    sampleCount: visibleSamples.length,
    categories: buildCategoryCounts(visibleSamples),
    importedFolders: buildImportedFolders(visibleSamples),
    samples: visibleSamples,
  }
}
