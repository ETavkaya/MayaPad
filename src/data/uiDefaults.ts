import type {
  AssistantMessage,
  ClipSlot,
  DeviceSnapshot,
  Scene,
  Track,
  TrackCategory,
  TransportState,
} from '../types'

export const TRACK_LABELS: TrackCategory[] = [
  'Drum',
  'Drum 2 / Hats',
  'Bass',
  'Instrument / Chord',
  'Melody',
  'Guitar / Texture',
  'Vocal',
  'FX',
]

export const TRACK_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
]

export const SCENE_LABELS = [
  'Intro',
  'Verse',
  'Chorus',
  'Build',
  'Drop',
  'Variation',
  'Break',
  'Outro',
]

export const DEFAULT_TRANSPORT: TransportState = {
  isPlaying: false,
  isRecording: false,
  tempo: 120,
  timeSignature: '4/4',
  quantize: '1 Bar',
  key: 'C',
  scale: 'Minor',
}

export const DEFAULT_DEVICES: DeviceSnapshot = {
  audio: {
    available: [],
    selected: null,
    status: 'not_connected',
  },
  midi: {
    inputs: [],
    outputs: [],
    launchpadDetected: false,
    launchkeyDetected: false,
    selected: null,
    status: 'not_connected',
  },
}

export const DEFAULT_ASSISTANT_MESSAGES: AssistantMessage[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    content: 'Local copilot mode: actions are frontend workflows until backend AI integration is added.',
  },
  {
    id: 'msg-2',
    role: 'user',
    content: 'Build me a chill melodic layout from my selected bank.',
  },
  {
    id: 'msg-3',
    role: 'assistant',
    content: 'Use Auto Group or Auto Fill Grid after scanning your sample root.',
  },
]

export function createDefaultTracks(): Track[] {
  return TRACK_LABELS.map((label, index) => ({
    id: `track-${index + 1}`,
    index,
    label,
    color: TRACK_COLORS[index],
    armed: false,
    muted: false,
    solo: false,
    selected: index === 0,
  }))
}

export function createDefaultScenes(): Scene[] {
  return SCENE_LABELS.map((label, index) => ({
    id: `scene-${index + 1}`,
    index,
    label,
  }))
}

export function createEmptyClips(): ClipSlot[] {
  return SCENE_LABELS.flatMap((_, sceneIndex) =>
    TRACK_LABELS.map((_, trackIndex) => ({
      id: `clip-${sceneIndex + 1}-${trackIndex + 1}`,
      trackIndex,
      sceneIndex,
      filled: false,
      sampleId: null,
      clipName: null,
      category: null,
      type: null,
      bpm: null,
      key: null,
      absolutePath: null,
      relativePath: null,
      detectedBpm: null,
      bpmSource: 'unknown',
      durationSeconds: null,
      estimatedBeats: null,
      beatsLength: null,
      syncStatus: 'unsupported',
      playbackRate: null,
      color: null,
      playing: false,
      launchState: 'empty',
      missingFile: false,
    })),
  )
}
