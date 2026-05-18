export type KeyMode = 'Major' | 'Minor'

export interface ParsedKey {
  tonic: string
  canonicalTonic: string
  mode: KeyMode
  normalizedKey: string
  confidence: 'high' | 'medium' | 'low'
  matchedText: string
}

export const ENHARMONIC_EQUIVALENTS: Record<string, string> = {
  'C#': 'Db',
  Db: 'C#',
  'D#': 'Eb',
  Eb: 'D#',
  'F#': 'Gb',
  Gb: 'F#',
  'G#': 'Ab',
  Ab: 'G#',
  'A#': 'Bb',
  Bb: 'A#',
}

const DELIMITER_CLASS = '[\\s_\\-\\/\\\\\\[\\](){}]'
const MODE_TOKEN_PATTERN = 'major|minor|maj|min|m'

const NOTE_TO_PITCH_CLASS: Record<string, number> = {
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

export const ALL_MUSICAL_KEYS = [
  'C Major',
  'C Minor',
  'C# Major',
  'C# Minor',
  'Db Major',
  'Db Minor',
  'D Major',
  'D Minor',
  'D# Major',
  'D# Minor',
  'Eb Major',
  'Eb Minor',
  'E Major',
  'E Minor',
  'F Major',
  'F Minor',
  'F# Major',
  'F# Minor',
  'Gb Major',
  'Gb Minor',
  'G Major',
  'G Minor',
  'G# Major',
  'G# Minor',
  'Ab Major',
  'Ab Minor',
  'A Major',
  'A Minor',
  'A# Major',
  'A# Minor',
  'Bb Major',
  'Bb Minor',
  'B Major',
  'B Minor',
] as const

function normalizeMode(modeToken: string): KeyMode {
  const normalized = modeToken.toLowerCase()
  if (normalized === 'm' || normalized === 'minor' || normalized === 'min') {
    return 'Minor'
  }
  return 'Major'
}

function normalizeNoteToken(noteToken: string) {
  const trimmed = noteToken.trim()
  if (!trimmed) {
    return null
  }

  const normalized = `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1).toLowerCase()}`
  if (!(normalized in NOTE_TO_PITCH_CLASS)) {
    return null
  }

  return normalized
}

export function keyToPitchClass(key: string | null) {
  const parsed = parseKey(key)
  if (!parsed) {
    return null
  }

  return NOTE_TO_PITCH_CLASS[parsed.canonicalTonic] ?? null
}

export function parseKey(input: string | null | undefined): ParsedKey | null {
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
    normalizedKey: `${canonicalTonic} Major`,
    confidence: tonic.includes('#') || tonic.includes('b') ? 'medium' : 'low',
    matchedText: noteMatch[0].trim(),
  }
}

export function normalizeKey(input: string | null | undefined) {
  const parsed = parseKey(input)
  return parsed?.normalizedKey ?? null
}

export function getRelativeMajorMinor(key: string | null | undefined) {
  const parsed = parseKey(key)
  if (!parsed) {
    return null
  }

  const pitch = NOTE_TO_PITCH_CLASS[parsed.canonicalTonic]
  if (pitch === undefined) {
    return null
  }

  if (parsed.mode === 'Major') {
    const relativeMinorPitch = (pitch + 9) % 12
    return `${PITCH_CLASS_TO_CANONICAL_NOTE[relativeMinorPitch]} Minor`
  }

  const relativeMajorPitch = (pitch + 3) % 12
  return `${PITCH_CLASS_TO_CANONICAL_NOTE[relativeMajorPitch]} Major`
}

export function getParallelMajorMinor(key: string | null | undefined) {
  const parsed = parseKey(key)
  if (!parsed) {
    return null
  }

  const nextMode: KeyMode = parsed.mode === 'Major' ? 'Minor' : 'Major'
  return `${parsed.canonicalTonic} ${nextMode}`
}

export function areKeysExactMatch(a: string | null | undefined, b: string | null | undefined) {
  const left = normalizeKey(a)
  const right = normalizeKey(b)
  if (!left || !right) {
    return false
  }

  return left === right
}

function semitoneDistance(leftPitch: number, rightPitch: number) {
  const diff = Math.abs(leftPitch - rightPitch)
  return Math.min(diff, 12 - diff)
}

export function areKeysCompatible(
  a: string | null | undefined,
  b: string | null | undefined,
  mode: 'off' | 'strict' | 'compatible',
) {
  if (mode === 'off') {
    return true
  }

  const left = parseKey(a)
  const right = parseKey(b)

  if (!left || !right) {
    return false
  }

  if (left.normalizedKey === right.normalizedKey) {
    return true
  }

  if (mode === 'strict') {
    return false
  }

  const leftRelative = getRelativeMajorMinor(left.normalizedKey)
  const rightRelative = getRelativeMajorMinor(right.normalizedKey)
  if (leftRelative === right.normalizedKey || rightRelative === left.normalizedKey) {
    return true
  }

  const leftParallel = getParallelMajorMinor(left.normalizedKey)
  const rightParallel = getParallelMajorMinor(right.normalizedKey)
  if (leftParallel === right.normalizedKey || rightParallel === left.normalizedKey) {
    return true
  }

  const leftPitch = NOTE_TO_PITCH_CLASS[left.canonicalTonic]
  const rightPitch = NOTE_TO_PITCH_CLASS[right.canonicalTonic]
  if (leftPitch === undefined || rightPitch === undefined) {
    return false
  }

  const distance = semitoneDistance(leftPitch, rightPitch)
  if (distance === 5 || distance === 7) {
    return true
  }

  return false
}
