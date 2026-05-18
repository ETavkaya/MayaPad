const DELIMITER_CLASS = '[\\s_\\-\\/\\\\\\[\\](){}]'
const MODE_TOKEN_PATTERN = 'major|minor|maj|min|m'

const NOTE_TO_PITCH_CLASS = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
}

const PITCH_CLASS_TO_CANONICAL_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function normalizeMode(modeToken) {
  const normalized = String(modeToken).toLowerCase()
  if (normalized === 'm' || normalized === 'minor' || normalized === 'min') {
    return 'Minor'
  }
  return 'Major'
}

function normalizeNoteToken(noteToken) {
  const token = String(noteToken ?? '').trim()
  if (!token) {
    return null
  }

  const normalized = `${token.charAt(0).toUpperCase()}${token.slice(1).toLowerCase()}`
  if (!(normalized in NOTE_TO_PITCH_CLASS)) {
    return null
  }

  return normalized
}

export function parseKey(input) {
  if (!input || typeof input !== 'string') {
    return null
  }

  const candidate = input.replace(/\.[a-z0-9]{2,5}$/i, '')

  const modeRegex = new RegExp(
    `(?:^|${DELIMITER_CLASS})([A-G](?:#|b)?)(?:\\s*|[_-]?)(?:(${MODE_TOKEN_PATTERN}))(?=$|${DELIMITER_CLASS})`,
    'gi',
  )

  const modeMatch = modeRegex.exec(candidate)
  if (modeMatch) {
    const tonic = normalizeNoteToken(modeMatch[1])
    if (!tonic) {
      return null
    }

    const mode = normalizeMode(modeMatch[2])
    const canonicalTonic = PITCH_CLASS_TO_CANONICAL_NOTE[NOTE_TO_PITCH_CLASS[tonic]]

    return {
      tonic,
      canonicalTonic,
      mode,
      parsedKey: `${tonic} ${mode}`,
      normalizedKey: `${canonicalTonic} ${mode}`,
      confidence: 'high',
      matchedText: modeMatch[0].trim(),
    }
  }

  const noteRegex = new RegExp(
    `(?:^|${DELIMITER_CLASS})([A-G](?:#|b)?)(?=$|${DELIMITER_CLASS})`,
    'gi',
  )

  const noteMatch = noteRegex.exec(candidate)
  if (!noteMatch) {
    return null
  }

  const tonic = normalizeNoteToken(noteMatch[1])
  if (!tonic) {
    return null
  }

  const canonicalTonic = PITCH_CLASS_TO_CANONICAL_NOTE[NOTE_TO_PITCH_CLASS[tonic]]
  return {
    tonic,
    canonicalTonic,
    mode: 'Major',
    parsedKey: `${tonic} Major`,
    normalizedKey: `${canonicalTonic} Major`,
    confidence: tonic.includes('#') || tonic.includes('b') ? 'medium' : 'low',
    matchedText: noteMatch[0].trim(),
  }
}

export function normalizeKey(input) {
  const parsed = parseKey(input)
  return parsed?.normalizedKey ?? null
}
