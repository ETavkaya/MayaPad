import type {
  AssistantMessage,
  ClipSlot,
  DeviceSnapshot,
  LayoutPresetName,
  Scene,
  Track,
  TransportState,
} from '../types'
import { DEFAULT_LAYOUT_PRESET, TRACK_LAYOUT_PRESET_ORDER, buildTracksFromRoleOrder } from './trackRoles'

export { DEFAULT_LAYOUT_PRESET } from './trackRoles'

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
    content: 'Local preview mode: AI actions currently trigger local workflow helpers.',
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

export function createDefaultTracks(layoutPreset: LayoutPresetName = DEFAULT_LAYOUT_PRESET): Track[] {
  return buildTracksFromRoleOrder(TRACK_LAYOUT_PRESET_ORDER[layoutPreset])
}

export function createDefaultScenes(): Scene[] {
  return SCENE_LABELS.map((label, index) => ({
    id: `scene-${index + 1}`,
    index,
    label,
  }))
}

export function createEmptyClips(): ClipSlot[] {
  const trackCount = TRACK_LAYOUT_PRESET_ORDER[DEFAULT_LAYOUT_PRESET].length
  return SCENE_LABELS.flatMap((_, sceneIndex) =>
    Array.from({ length: trackCount }, (_, trackIndex) => ({
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
      parsedKey: null,
      normalizedKey: null,
      keySource: 'unknown',
      keyConfidence: 'low',
      excluded: false,
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
