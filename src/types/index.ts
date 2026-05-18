export type InspectorTab =
  | 'Clip'
  | 'Track'
  | 'Device'
  | 'Record'
  | 'Session'
  | 'Routing'

export type TrackRoleId =
  | 'drum'
  | 'drum2_hats'
  | 'bass'
  | 'instrument_chord'
  | 'melody'
  | 'guitar_texture'
  | 'vocal'
  | 'fx'

export type TrackIconName =
  | 'drum'
  | 'hats'
  | 'bass'
  | 'instrument'
  | 'melody'
  | 'guitar'
  | 'vocal'
  | 'fx'

export type LayoutPresetName = 'Classic' | 'Vocal First' | 'Instrument First' | 'Performance'

export type TrackCategory =
  | 'Drum'
  | 'Drum 2 / Hats'
  | 'Bass'
  | 'Instrument / Chord'
  | 'Melody'
  | 'Guitar / Texture'
  | 'Vocal'
  | 'FX'

export type SampleType = 'loop' | 'one-shot' | 'unknown'
export type ClipLaunchState = 'empty' | 'stopped' | 'queued' | 'playing' | 'stopping'
export type AutoFillSourceScope = 'selectedPack' | 'entireLibrary' | 'autoBestPack'
export type KeyStrictness = 'off' | 'compatible' | 'strict'
export type BpmSource = 'filename' | 'estimated' | 'manual' | 'unknown'
export type ClipSyncStatus = 'ready' | 'bpm_missing' | 'length_uncertain' | 'unsupported'
export type KeySource = 'filename' | 'folder' | 'manual' | 'analysis' | 'unknown'
export type KeyConfidence = 'high' | 'medium' | 'low'
export type TrackInputType = 'midi' | 'audio' | null
export type TrackLaunchRule = 'oneClipPerColumn'

export interface TransportState {
  isPlaying: boolean
  isRecording: boolean
  tempo: number
  timeSignature: '4/4' | '3/4' | '6/8'
  quantize: 'None' | '1/4' | '1/2' | '1 Bar' | '2 Bars' | '4 Bars' | '8 Bars'
  key: string
  scale: string
}

export interface AppConfig {
  sampleRoot: string | null
  lastScanAt: string | null
  audioDevicePreference: string | null
  midiDevicePreference: string | null
}

export interface AudioDeviceState {
  available: string[]
  selected: string | null
  status: 'not_connected' | 'connected'
}

export interface MidiDeviceState {
  inputs: string[]
  outputs: string[]
  launchpadDetected: boolean
  launchkeyDetected: boolean
  selected: string | null
  status: 'not_connected' | 'connected'
}

export interface DeviceSnapshot {
  audio: AudioDeviceState
  midi: MidiDeviceState
}

export interface BrowserCategory {
  id: string
  name: string
  count: number
}

export interface SampleRecord {
  id: string
  filename: string
  absolutePath: string
  relativePath: string
  category: string
  bpm: number | null
  detectedBpm: number | null
  bpmSource: BpmSource
  key: string | null
  parsedKey: string | null
  normalizedKey: string | null
  keySource: KeySource
  keyConfidence: KeyConfidence
  excluded: boolean
  type: SampleType
  loopConfidence: 'high' | 'medium' | 'low'
  duration: number | null
  durationSeconds: number | null
  estimatedBeats: number | null
  beatsLength: number | null
  syncStatus: ClipSyncStatus
  playbackRate: number | null
  tags: string[]
}

export interface FsRootEntry {
  name: string
  absolutePath: string
}

export interface FsFolderEntry {
  name: string
  absolutePath: string
}

export interface FsRootResponse {
  roots: FsRootEntry[]
}

export interface FsListResponse {
  path: string
  parentPath: string | null
  folders: FsFolderEntry[]
  audioFileCountDirect: number
  audioFileCountRecursiveEstimate?: number
}

export interface AutoFillSettings {
  sourceScope: AutoFillSourceScope
  targetBpm: number | null
  bpmTolerance: number
  targetKey: string | null
  keyStrictness: KeyStrictness
  allowUnknownKeySamples: boolean
  allowKeyNeutralStrict: boolean
  preferLoops: boolean
  allowOneShotsInFXOnly: boolean
  preferSameFolder: boolean
}

export interface ScanResult {
  sampleRoot: string
  scannedAt: string
  sampleCount: number
  categories: BrowserCategory[]
  importedFolders: string[]
  samples: SampleRecord[]
}

export interface TrackRoleDefinition {
  role: TrackRoleId
  label: TrackCategory
  shortLabel: string
  color: string
  icon: TrackIconName
  acceptedCategories: string[]
  preferredTypes: SampleType[]
  keyNeutral: boolean
  liveInput: boolean
  inputType: TrackInputType
  futureDevice: string | null
  allowOneShots: boolean
  launchRule: TrackLaunchRule
}

export interface Track {
  id: string
  index: number
  role: TrackRoleId
  label: TrackCategory
  shortLabel: string
  color: string
  icon: TrackIconName
  acceptedCategories: string[]
  preferredTypes: SampleType[]
  keyNeutral: boolean
  liveInput: boolean
  inputType: TrackInputType
  futureDevice: string | null
  allowOneShots: boolean
  launchRule: TrackLaunchRule
  hardwareColumnIndex: number
  armed: boolean
  muted: boolean
  solo: boolean
  selected: boolean
}

export interface ClipSlot {
  id: string
  trackIndex: number
  sceneIndex: number
  filled: boolean
  sampleId: string | null
  clipName: string | null
  category: string | null
  type: SampleType | null
  bpm: number | null
  key: string | null
  parsedKey: string | null
  normalizedKey: string | null
  keySource: KeySource
  keyConfidence: KeyConfidence
  excluded: boolean
  absolutePath: string | null
  relativePath: string | null
  detectedBpm: number | null
  bpmSource: BpmSource
  durationSeconds: number | null
  estimatedBeats: number | null
  beatsLength: number | null
  syncStatus: ClipSyncStatus
  playbackRate: number | null
  color: string | null
  playing: boolean
  launchState: ClipLaunchState
  missingFile: boolean
}

export interface Scene {
  id: string
  index: number
  label: string
}

export interface AssistantMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface SavedSessionSummary {
  id: string
  name: string
  createdAt: string | null
  updatedAt: string | null
  sampleRoot: string | null
}

export interface SessionManifestClip {
  id: string
  clipName: string | null
  filled: boolean
  trackIndex: number
  sceneIndex: number
  column: number
  row: number
  sampleId: string | null
  absolutePath: string | null
  relativePath: string | null
  category: string | null
  type: SampleType | null
  bpm: number | null
  key: string | null
  parsedKey?: string | null
  normalizedKey?: string | null
  keySource?: KeySource
  keyConfidence?: KeyConfidence
  excluded?: boolean
  detectedBpm?: number | null
  bpmSource?: BpmSource
  durationSeconds?: number | null
  estimatedBeats?: number | null
  beatsLength?: number | null
  syncStatus?: ClipSyncStatus
  playbackRate?: number | null
  color: string | null
  missingFile?: boolean
}

export interface SessionManifest {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  sampleRoot: string | null
  selectedPack: string | null
  tempo: number
  timeSignature: TransportState['timeSignature']
  quantize: TransportState['quantize']
  key: string
  scale: string
  autoFillSettings: AutoFillSettings
  layoutPresetName?: LayoutPresetName | null
  tracks?: Track[]
  clips: SessionManifestClip[]
  missingFilesCount?: number
}

export interface SampleOverrideRecord {
  manualKey: string | null
  manualBpm: number | null
  excluded: boolean
  notes: string
}

export interface TransportDiagnostics {
  audioContextState: string
  transportRunning: boolean
  transportStartTime: number | null
  currentAudioTime: number | null
  currentBeat: number
  nextBoundaryTime: number | null
  queuedEventsCount: number
  playingClipsCount: number
}
