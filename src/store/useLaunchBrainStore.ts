import { create } from 'zustand'
import {
  createDefaultScenes,
  createDefaultTracks,
  createEmptyClips,
  DEFAULT_LAYOUT_PRESET,
  DEFAULT_ASSISTANT_MESSAGES,
  DEFAULT_DEVICES,
  DEFAULT_TRANSPORT,
} from '../data/uiDefaults'
import {
  TRACK_LAYOUT_PRESET_ORDER,
  TRACK_ROLE_LIBRARY,
} from '../data/trackRoles'
import {
  analyzeSampleKey as apiAnalyzeSampleKey,
  getConfig,
  getDevices,
  getFilesystemFolderList,
  getFilesystemRoots,
  getSampleOverrides as apiGetSampleOverrides,
  loadSession as apiLoadSession,
  listSessions as apiListSessions,
  getSampleIndex,
  getSampleStreamUrl,
  scanSamples,
  saveSession as apiSaveSession,
  setSampleRoot,
  upsertSampleOverride as apiUpsertSampleOverride,
} from '../services/api'
import { audioTransport, type TransportClipRequest } from '../services/audioTransport'
import {
  ALL_MUSICAL_KEYS,
  areKeysCompatible,
  areKeysExactMatch,
  normalizeKey,
  parseKey,
} from '../utils/musicTheory'
import type {
  AppConfig,
  AssistantMessage,
  AutoFillSettings,
  BrowserCategory,
  ClipPreparationState,
  ClipSlot,
  DeviceSnapshot,
  FsFolderEntry,
  FsRootEntry,
  InspectorTab,
  LayoutPresetName,
  SavedSessionSummary,
  SampleRecord,
  SampleOverrideRecord,
  SampleType,
  Scene,
  SessionManifest,
  Track,
  TrackRoleId,
  TransportDiagnostics,
  TransportState,
} from '../types'

interface LaunchBrainState {
  transport: TransportState
  devices: DeviceSnapshot
  config: AppConfig
  categories: BrowserCategory[]
  importedFolders: string[]
  samples: SampleRecord[]
  tracks: Track[]
  scenes: Scene[]
  clips: ClipSlot[]
  selectedSampleId: string | null
  selectedClipId: string
  inspectorTab: InspectorTab
  inspectorOpen: boolean
  assistantMessages: AssistantMessage[]
  assistantInput: string
  browserQuery: string
  sampleRootInput: string
  isBootstrapping: boolean
  isScanning: boolean
  previewingSampleId: string | null
  previewingFilename: string | null
  playbackEngineStatus: string
  lastAction: string
  errorMessage: string | null
  activePack: string | null
  activeCategoryFilter: string | null
  activeBpmFilter: number | null
  activeKeyFilter: string | null
  activeTypeFilter: SampleType | null
  explorerGroupsOpen: {
    packs: boolean
    categories: boolean
    bpm: boolean
    key: boolean
    type: boolean
  }
  folderBrowserOpen: boolean
  folderBrowserLoading: boolean
  folderBrowserError: string | null
  filesystemRoots: FsRootEntry[]
  folderBrowserPath: string | null
  folderBrowserParentPath: string | null
  folderBrowserFolders: FsFolderEntry[]
  folderBrowserAudioFileCountDirect: number
  folderBrowserAudioFileCountRecursiveEstimate: number | null
  autoFillSettings: AutoFillSettings
  autoFillOptionsOpen: boolean
  layoutPresetName: LayoutPresetName
  autoFillResolvedSource: string
  autoFillResolvedSourceReason: string | null
  autoFillResolvedKey: string | null
  clockProgress: number
  clockBeatInBar: number
  clockBeatInCycle: number
  clockBeatsPerBar: number
  clockQuantizeBeats: number
  queuedSceneLabel: string | null
  autoFillCoverageLabel: string
  clipPreparationStatus: string | null
  currentSessionId: string | null
  currentSessionName: string
  lastSavedAt: string | null
  saveStatus: 'idle' | 'dirty' | 'saved'
  missingFilesCount: number
  lastClearSnapshot: {
    clips: ClipSlot[]
    missingFilesCount: number
    message: string
  } | null
  recentSessions: SavedSessionSummary[]
  selectedRecentSessionId: string | null
  sampleOverrides: Record<string, SampleOverrideRecord>
  transportDiagnostics: TransportDiagnostics
  lastScheduleError: string | null
  initializeApp: () => Promise<void>
  refreshSavedSessions: () => Promise<void>
  saveCurrentSession: (saveAs?: boolean, nameOverride?: string | null) => Promise<void>
  loadSavedSession: (sessionId: string) => Promise<void>
  setSelectedRecentSessionId: (sessionId: string | null) => void
  refreshDevices: () => Promise<void>
  setSampleRootInput: (value: string) => void
  saveSampleRoot: () => Promise<void>
  openFolderBrowser: () => Promise<void>
  closeFolderBrowser: () => void
  navigateFolderBrowser: (targetPath: string) => Promise<void>
  navigateFolderBrowserParent: () => Promise<void>
  applyCurrentFolderAsSampleRoot: () => Promise<void>
  scanSampleLibrary: () => Promise<void>
  setTransportPlay: () => void
  setTransportStop: () => void
  stopAllClipPlayback: () => void
  toggleRecord: () => void
  setTempo: (tempo: number) => void
  setTimeSignature: (timeSignature: TransportState['timeSignature']) => void
  setQuantize: (quantize: TransportState['quantize']) => void
  setKey: (key: string) => void
  setScale: (scale: string) => void
  setBrowserQuery: (query: string) => void
  setActivePack: (pack: string | null) => void
  setActiveCategoryFilter: (category: string | null) => void
  setActiveBpmFilter: (bpm: number | null) => void
  setActiveKeyFilter: (key: string | null) => void
  setActiveTypeFilter: (type: SampleType | null) => void
  clearLibraryFilters: () => void
  toggleExplorerGroup: (group: keyof LaunchBrainState['explorerGroupsOpen']) => void
  selectBrowserFile: (sampleId: string) => void
  analyzeKeyForSample: (sampleId: string) => Promise<void>
  setSampleManualKey: (sampleId: string, manualKey: string | null) => Promise<void>
  markSampleKeyUnknown: (sampleId: string) => Promise<void>
  setSampleAsProjectKey: (sampleId: string) => void
  toggleSampleExcludedInAutoFill: (sampleId: string, excluded: boolean) => Promise<void>
  showSampleMetadata: (sampleId: string) => void
  toggleSelectedSamplePreview: () => Promise<void>
  stopSamplePreview: () => void
  assignSampleToClip: (clipId: string, sampleId: string) => Promise<void>
  loadSelectedFileToSelectedClip: () => Promise<void>
  loadSampleToSelectedClip: (sampleId: string) => Promise<void>
  setAutoFillSettings: (partial: Partial<AutoFillSettings>) => void
  toggleAutoFillOptions: () => void
  applyLayoutPreset: (presetName: LayoutPresetName) => void
  moveTrackColumnLeft: (trackIndex: number) => void
  moveTrackColumnRight: (trackIndex: number) => void
  resetTrackOrder: () => void
  autoFillGrid: () => Promise<void>
  selectClip: (clipId: string) => void
  toggleClipPlayback: (clipId: string) => Promise<void>
  launchScene: (sceneIndex: number) => Promise<void>
  selectTrack: (trackId: string) => void
  toggleTrackArm: (trackId: string) => void
  toggleTrackMute: (trackId: string) => void
  toggleTrackSolo: (trackId: string) => void
  stopTrack: (trackId: string) => void
  setInspectorTab: (tab: InspectorTab) => void
  openInspectorTab: (tab: InspectorTab) => void
  toggleInspector: () => void
  clearClip: (clipId: string) => void
  clearSelectedClip: () => void
  clearRow: (sceneIndex: number) => void
  clearColumn: (trackIndex: number) => void
  clearAllGrid: () => void
  removeMissingClips: () => void
  undoLastClear: () => void
  canUndoClear: boolean
  setAssistantInput: (value: string) => void
  submitAssistantPrompt: () => void
  runAssistantQuickAction: (action: string) => void
}

const DEFAULT_ROLE_ORDER = TRACK_LAYOUT_PRESET_ORDER[DEFAULT_LAYOUT_PRESET]

const LOOP_CONFIDENCE_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1,
}

const SESSION_SUITABILITY_WEIGHT = {
  high: 5,
  medium: 2,
  low: -3,
  ignore: -12,
}

const DEFAULT_AUTO_FILL_SETTINGS: AutoFillSettings = {
  sourceScope: 'autoBestPack',
  targetBpm: null,
  bpmTolerance: 3,
  targetKey: null,
  keyStrictness: 'compatible',
  allowUnknownKeySamples: true,
  allowKeyNeutralStrict: true,
  allowDuplicates: false,
  preloadGridClips: false,
  preferLoops: true,
  allowOneShotsInFXOnly: true,
  preferSameFolder: true,
}

const IMMEDIATE_STOP_MESSAGE = 'Stopped: all clips'
const CLIP_PRELOAD_CONCURRENCY = 4
const DRUM_ROLE_HINTS = ['drumloop', 'drum loop', 'beat', 'groove', 'full drum', 'drums', 'kick loop', 'breakbeat']
const DRUM2_ROLE_HINTS = [
  'hat loop',
  'hats',
  'top loop',
  'shaker',
  'perc loop',
  'percussion',
  'snare loop',
  'clap loop',
  'ride loop',
  'crash loop',
]
const FX_ROLE_HINTS = ['fx', 'riser', 'impact', 'sweep', 'downer', 'reverse', 'transition', 'noise', 'atmosphere']
const HARMONIC_ROLE_HINTS = ['bass', 'chord', 'pad', 'melody', 'lead', 'guitar', 'vocal', 'vox', 'voice', 'piano', 'synth']

let previewAudio: HTMLAudioElement | null = null
let previewSampleId: string | null = null
let unsubscribeAudioTransport: (() => void) | null = null
let clipPreloadActiveCount = 0
let clipPreloadQueue: Array<{ clipId: string; sampleId: string }> = []
const clipPreloadQueuedKeys = new Set<string>()
const pendingTrackLaunches = new Map<number, { clipId: string; sceneLabel: string | null }>()

function defaultConfig(): AppConfig {
  return {
    sampleRoot: null,
    lastScanAt: null,
    audioDevicePreference: null,
    midiDevicePreference: null,
  }
}

function getSamplePack(sample: SampleRecord): string {
  const [pack] = sample.relativePath.split(/[\\/]/)
  return pack && pack.length > 0 ? pack : 'Root'
}

function getSampleFamilyKey(sample: SampleRecord) {
  const stem = sample.filename.replace(/\.[^.]+$/, '').toLowerCase()
  const normalized = stem
    .replace(/\b\d{2,3}\s?bpm\b/g, ' ')
    .replace(/\b(?:[a-g](?:#|b)?)(?:\s?(?:major|minor|maj|min|m))\b/gi, ' ')
    .replace(/\b(?:loop|loops|one shot|oneshot|shot|take|mix|version|v\d+)\b/gi, ' ')
    .replace(/[_\-()[\]]+/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const tokens = normalized.split(' ').filter((token) => token.length > 2)
  const base = tokens.slice(0, 4).join(' ')

  return `${getSamplePack(sample)}::${base || stem}`
}

function getTrackLabel(tracks: Track[], trackIndex: number) {
  return tracks[trackIndex]?.label ?? `Track ${trackIndex + 1}`
}

function setPendingTrackLaunch(trackIndex: number, clipId: string, sceneLabel: string | null = null) {
  pendingTrackLaunches.set(trackIndex, { clipId, sceneLabel })
}

function clearPendingTrackLaunch(trackIndex: number, clipId?: string) {
  const pending = pendingTrackLaunches.get(trackIndex)
  if (!pending) {
    return
  }

  if (!clipId || pending.clipId === clipId) {
    pendingTrackLaunches.delete(trackIndex)
  }
}

function clearAllPendingTrackLaunches() {
  pendingTrackLaunches.clear()
}

function syncTrackMixState(tracks: Track[]) {
  audioTransport.setTrackMix(
    tracks.map((track) => ({
      trackIndex: track.index,
      muted: track.muted,
      solo: track.solo,
      volume: track.volume,
    })),
  )
}

function truncateStatusLabel(value: string | null | undefined, maxLength = 28) {
  if (!value) {
    return 'Clip'
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
}

function normalizeForRoleMatch(value: string) {
  return ` ${value.toLowerCase().replace(/[^a-z0-9#b]+/g, ' ').trim()} `
}

function includesRoleHint(text: string, hints: string[]) {
  return hints.some((hint) => text.includes(` ${hint} `) || text.includes(hint))
}

function getSampleRoleMatchText(sample: SampleRecord) {
  return normalizeForRoleMatch(
    `${sample.filename} ${sample.relativePath} ${sample.tags.join(' ')} ${sample.category}`,
  )
}

function getRoleOrderFromTracks(tracks: Track[]) {
  return [...tracks]
    .sort((left, right) => left.index - right.index)
    .map((track) => track.role)
}

const LEGACY_LABEL_TO_ROLE: Record<string, TrackRoleId> = {
  Drum: 'drum',
  'Drum 2 / Hats': 'drum2_hats',
  Bass: 'bass',
  'Instrument / Chord': 'instrument_chord',
  Melody: 'melody',
  'Guitar / Texture': 'guitar_texture',
  Vocal: 'vocal',
  FX: 'fx',
}

function inferRoleFromLegacyTrack(track: Partial<Track>): TrackRoleId | null {
  if (track.role && TRACK_ROLE_LIBRARY[track.role]) {
    return track.role
  }

  const fromLabel = track.label ? LEGACY_LABEL_TO_ROLE[track.label] : null
  return fromLabel ?? null
}

function normalizeRoleOrderFromLoadedTracks(loadedTracks: Partial<Track>[] | null | undefined) {
  if (!loadedTracks || loadedTracks.length === 0) {
    return [...DEFAULT_ROLE_ORDER]
  }

  const sorted = [...loadedTracks].sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
  const seen = new Set<TrackRoleId>()
  const roleOrder: TrackRoleId[] = []

  for (const track of sorted) {
    const role = inferRoleFromLegacyTrack(track)
    if (!role || seen.has(role)) {
      continue
    }
    seen.add(role)
    roleOrder.push(role)
  }

  for (const role of DEFAULT_ROLE_ORDER) {
    if (!seen.has(role)) {
      roleOrder.push(role)
    }
  }

  return roleOrder.slice(0, DEFAULT_ROLE_ORDER.length)
}

function inferLayoutPresetName(roleOrder: TrackRoleId[]): LayoutPresetName {
  for (const [presetName, presetOrder] of Object.entries(TRACK_LAYOUT_PRESET_ORDER)) {
    const matches =
      presetOrder.length === roleOrder.length &&
      presetOrder.every((role, index) => roleOrder[index] === role)

    if (matches) {
      return presetName as LayoutPresetName
    }
  }

  return DEFAULT_LAYOUT_PRESET
}

function buildTracksFromRoleOrderWithState(currentTracks: Track[], roleOrder: TrackRoleId[]) {
  const trackByRole = new Map(currentTracks.map((track) => [track.role, track]))
  const selectedRole = currentTracks.find((track) => track.selected)?.role ?? roleOrder[0] ?? null

  return roleOrder.map((role, index) => {
    const definition = TRACK_ROLE_LIBRARY[role]
    const existing = trackByRole.get(role)

    return {
      id: `track-${index + 1}`,
      index,
      role: definition.role,
      label: definition.label,
      shortLabel: definition.shortLabel,
      color: definition.color,
      icon: definition.icon,
      acceptedCategories: [...definition.acceptedCategories],
      preferredTypes: [...definition.preferredTypes],
      keyNeutral: definition.keyNeutral,
      liveInput: definition.liveInput,
      inputType: definition.inputType,
      futureDevice: definition.futureDevice,
      allowOneShots: definition.allowOneShots,
      launchRule: definition.launchRule,
      hardwareColumnIndex: index,
      armed: existing?.armed ?? false,
      muted: existing?.muted ?? false,
      solo: existing?.solo ?? false,
      selected: role === selectedRole,
      volume: existing?.volume ?? 1,
      playingClipId: existing?.playingClipId ?? null,
      queuedClipId: existing?.queuedClipId ?? null,
    }
  })
}

function remapClipsForRoleOrder(
  clips: ClipSlot[],
  currentTracks: Track[],
  nextTracks: Track[],
) {
  const clipByCell = new Map<string, ClipSlot>()
  for (const clip of clips) {
    clipByCell.set(`${clip.sceneIndex}:${clip.trackIndex}`, clip)
  }

  const currentTrackByRole = new Map(currentTracks.map((track) => [track.role, track]))
  const nextClips: ClipSlot[] = []

  for (let sceneIndex = 0; sceneIndex < 8; sceneIndex += 1) {
    for (let trackIndex = 0; trackIndex < nextTracks.length; trackIndex += 1) {
      const targetCell = clipByCell.get(`${sceneIndex}:${trackIndex}`)
      const targetBase =
        targetCell ??
        ({
          ...emptyClip({
            id: `clip-${sceneIndex + 1}-${trackIndex + 1}`,
            trackIndex,
            sceneIndex,
            filled: false,
            sampleId: null,
            clipName: null,
            category: null,
            categoryConfidence: 'low',
            categorySource: 'unknown',
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
            preparationState: 'unloaded',
            preparationError: null,
            color: null,
            playing: false,
            launchState: 'empty',
            missingFile: false,
          }),
        } as ClipSlot)

      const role = nextTracks[trackIndex]?.role
      const previousTrack = role ? currentTrackByRole.get(role) : null
      const source = previousTrack
        ? clipByCell.get(`${sceneIndex}:${previousTrack.index}`) ?? null
        : null

      if (!source || !source.filled) {
        nextClips.push(emptyClip(targetBase))
        continue
      }

      nextClips.push({
        ...source,
        id: `clip-${sceneIndex + 1}-${trackIndex + 1}`,
        sceneIndex,
        trackIndex,
        color: nextTracks[trackIndex]?.color ?? source.color,
        playing: false,
        launchState: 'stopped',
      })
    }
  }

  return nextClips
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) {
    return [...items]
  }

  const next = [...items]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

function applyTrackRoleOrderToState(
  state: LaunchBrainState,
  roleOrder: TrackRoleId[],
  presetOverride?: LayoutPresetName,
) {
  const nextTracks = buildTracksFromRoleOrderWithState(state.tracks, roleOrder)
  const nextClips = remapClipsForRoleOrder(state.clips, state.tracks, nextTracks)
  const selectedClip = state.clips.find((clip) => clip.id === state.selectedClipId)
  const selectedRole = selectedClip ? state.tracks[selectedClip.trackIndex]?.role ?? null : null
  const selectedSceneIndex = selectedClip?.sceneIndex ?? 0
  const selectedTrackIndex = selectedRole ? roleOrder.indexOf(selectedRole) : 0
  const safeSelectedTrackIndex =
    selectedTrackIndex >= 0 && selectedTrackIndex < nextTracks.length ? selectedTrackIndex : 0
  const nextSelectedClipId = `clip-${selectedSceneIndex + 1}-${safeSelectedTrackIndex + 1}`

  return {
    tracks: nextTracks,
    clips: nextClips,
    selectedClipId: nextSelectedClipId,
    layoutPresetName: presetOverride ?? inferLayoutPresetName(roleOrder),
    missingFilesCount: nextClips.filter((clip) => clip.filled && clip.missingFile).length,
  }
}

function getSampleEffectiveKey(sample: SampleRecord) {
  return sample.normalizedKey ?? normalizeKey(sample.key)
}

function getProjectHarmonicKey(transport: TransportState) {
  const explicit = normalizeKey(`${transport.key} ${transport.scale}`)
  if (explicit) {
    return explicit
  }

  return normalizeKey(transport.key)
}

function resolveActiveHarmonicTargetKey(
  targetKeyFromOptions: string | null,
  activeKeyFilter: string | null,
  transport: TransportState,
  sourceSamples: SampleRecord[],
) {
  if (targetKeyFromOptions) {
    return normalizeKey(targetKeyFromOptions)
  }

  if (activeKeyFilter) {
    const normalizedFilter = normalizeKey(activeKeyFilter)
    if (normalizedFilter) {
      return normalizedFilter
    }
  }

  const projectKey = getProjectHarmonicKey(transport)
  if (projectKey) {
    return projectKey
  }

  return inferMostCommonKey(sourceSamples)
}

function inferMostCommonBpm(samples: SampleRecord[]) {
  const counts = new Map<number, number>()

  for (const sample of samples) {
    if (sample.bpm === null) {
      continue
    }

    counts.set(sample.bpm, (counts.get(sample.bpm) ?? 0) + 1)
  }

  let bestBpm: number | null = null
  let bestCount = 0

  for (const [bpm, count] of counts.entries()) {
    if (count > bestCount) {
      bestBpm = bpm
      bestCount = count
    }
  }

  return bestBpm
}

function getSampleEffectiveBpm(sample: SampleRecord, fallbackBpm: number | null) {
  if (sample.detectedBpm !== null) {
    return { bpm: sample.detectedBpm, source: sample.bpmSource ?? ('filename' as const) }
  }

  if (sample.bpm !== null) {
    return { bpm: sample.bpm, source: sample.bpmSource ?? ('filename' as const) }
  }

  if (fallbackBpm !== null) {
    return { bpm: fallbackBpm, source: 'estimated' as const }
  }

  return { bpm: null, source: 'unknown' as const }
}

function inferMostCommonKey(samples: SampleRecord[]) {
  const counts = new Map<string, number>()

  for (const sample of samples) {
    const sampleKey = getSampleEffectiveKey(sample)
    if (!sampleKey) {
      continue
    }

    counts.set(sampleKey, (counts.get(sampleKey) ?? 0) + 1)
  }

  let bestKey: string | null = null
  let bestCount = 0

  for (const [key, count] of counts.entries()) {
    if (count > bestCount) {
      bestKey = key
      bestCount = count
    }
  }

  return bestKey
}

function applySampleToClip(clip: ClipSlot, sample: SampleRecord, trackColor: string): ClipSlot {
  return {
    ...clip,
    filled: true,
    sampleId: sample.id,
    clipName: sample.filename,
    category: sample.category,
    categoryConfidence: sample.categoryConfidence,
    categorySource: sample.categorySource,
    type: sample.type,
    bpm: sample.bpm,
    detectedBpm: sample.detectedBpm ?? sample.bpm,
    bpmSource: sample.bpmSource ?? (sample.bpm !== null ? 'filename' : 'unknown'),
    key: sample.key,
    parsedKey: sample.parsedKey ?? sample.key,
    normalizedKey: sample.normalizedKey ?? normalizeKey(sample.key),
    keySource: sample.keySource ?? 'unknown',
    keyConfidence: sample.keyConfidence ?? 'low',
    excluded: sample.excluded ?? false,
    absolutePath: sample.absolutePath,
    relativePath: sample.relativePath,
    durationSeconds: sample.durationSeconds ?? null,
    estimatedBeats: sample.estimatedBeats ?? null,
    beatsLength: sample.beatsLength ?? null,
    syncStatus: sample.syncStatus ?? 'unsupported',
    playbackRate: sample.playbackRate ?? null,
    subtype: sample.subtype ?? null,
    role: sample.role ?? null,
    sessionSuitability: sample.sessionSuitability ?? 'low',
    semanticTags: sample.semanticTags ?? [],
    moodTags: sample.moodTags ?? [],
    instrumentationTags: sample.instrumentationTags ?? [],
    sourceContext: sample.sourceContext ?? null,
    classificationReason: sample.classificationReason ?? null,
    preparationState: 'unloaded',
    preparationError: null,
    color: trackColor,
    playing: false,
    launchState: 'stopped',
    missingFile: false,
  }
}

function emptyClip(clip: ClipSlot): ClipSlot {
  return {
    ...clip,
    filled: false,
    sampleId: null,
    clipName: null,
    category: null,
    categoryConfidence: 'low',
    categorySource: 'unknown',
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
    subtype: null,
    role: null,
    sessionSuitability: 'low',
    semanticTags: [],
    moodTags: [],
    instrumentationTags: [],
    sourceContext: null,
    classificationReason: null,
    preparationState: 'unloaded',
    preparationError: null,
    color: null,
    playing: false,
    launchState: 'empty',
    missingFile: false,
  }
}

function applyScanSnapshotToState(scanSnapshot: {
  sampleRoot: string
  scannedAt: string
  sampleCount: number
  categories: BrowserCategory[]
  importedFolders: string[]
  samples: SampleRecord[]
}) {
  return {
    categories: scanSnapshot.categories,
    importedFolders: scanSnapshot.importedFolders,
    samples: scanSnapshot.samples,
    selectedSampleId: scanSnapshot.samples[0]?.id ?? null,
    sampleRootInput: scanSnapshot.sampleRoot,
  }
}

function stopAudioElement(audio: HTMLAudioElement) {
  audio.pause()
  audio.currentTime = 0
}

function isLoopLike(type: SampleType) {
  return type !== 'one-shot'
}

function isKeyNeutralTrack(track: Track) {
  return track.keyNeutral || track.role === 'drum' || track.role === 'drum2_hats' || track.role === 'fx'
}

function isMediumOrHighCategory(sample: SampleRecord) {
  return sample.categoryConfidence === 'high' || sample.categoryConfidence === 'medium'
}

function isRoleCategoryMatch(sample: SampleRecord, track: Track) {
  const roleText = getSampleRoleMatchText(sample)
  const hasHarmonicHints = includesRoleHint(roleText, HARMONIC_ROLE_HINTS)

  switch (track.role) {
    case 'drum':
      return (
        sample.category === 'Drums' &&
        isMediumOrHighCategory(sample) &&
        isLoopLike(sample.type) &&
        includesRoleHint(roleText, DRUM_ROLE_HINTS) &&
        !includesRoleHint(roleText, FX_ROLE_HINTS) &&
        !hasHarmonicHints
      )
    case 'drum2_hats':
      return (
        (sample.category === 'Hats / Perc' || sample.category === 'Drums') &&
        isMediumOrHighCategory(sample) &&
        isLoopLike(sample.type) &&
        includesRoleHint(roleText, DRUM2_ROLE_HINTS) &&
        !includesRoleHint(roleText, FX_ROLE_HINTS) &&
        !hasHarmonicHints
      )
    case 'fx':
      return sample.category === 'FX' && isMediumOrHighCategory(sample) && includesRoleHint(roleText, FX_ROLE_HINTS)
    default:
      if (sample.role && sample.role !== track.role) {
        return false
      }
      return track.acceptedCategories.includes(sample.category) && isMediumOrHighCategory(sample)
  }
}

function summarizeClipPreparationCounts(clips: ClipSlot[]) {
  let unloaded = 0
  let loading = 0
  let ready = 0
  let failed = 0

  for (const clip of clips) {
    if (!clip.filled) {
      continue
    }

    if (clip.preparationState === 'unloaded') {
      unloaded += 1
    } else
    if (clip.preparationState === 'loading') {
      loading += 1
    } else if (clip.preparationState === 'ready') {
      ready += 1
    } else if (clip.preparationState === 'failed') {
      failed += 1
    }
  }

  return {
    unloaded,
    loading,
    ready,
    failed,
    total: unloaded + loading + ready + failed,
  }
}

function computePackCoverage(samples: SampleRecord[], tracks: Track[]) {
  const statsByPack = new Map<string, { roles: Set<string>; usableLoops: number; bpmCounts: Map<number, number> }>()

  for (const sample of samples) {
    const pack = getSamplePack(sample)
    if (!statsByPack.has(pack)) {
      statsByPack.set(pack, {
        roles: new Set(),
        usableLoops: 0,
        bpmCounts: new Map(),
      })
    }

    const stats = statsByPack.get(pack)
    if (!stats) {
      continue
    }

    if (isLoopLike(sample.type) && isMediumOrHighCategory(sample)) {
      stats.usableLoops += 1
    }

    const bpmValue = sample.detectedBpm ?? sample.bpm
    if (bpmValue !== null) {
      stats.bpmCounts.set(bpmValue, (stats.bpmCounts.get(bpmValue) ?? 0) + 1)
    }

    for (const track of tracks) {
      if (isRoleCategoryMatch(sample, track)) {
        stats.roles.add(track.role)
      }
    }
  }

  let bestPack: string | null = null
  let bestScore = -1

  for (const [pack, stats] of statsByPack.entries()) {
    const bpmConsistency = Math.max(0, ...stats.bpmCounts.values())
    const score = stats.roles.size * 100 + stats.usableLoops * 3 + bpmConsistency * 2
    if (score > bestScore) {
      bestPack = pack
      bestScore = score
    }
  }

  return bestPack
}

function scoreSampleCandidate(
  sample: SampleRecord,
  track: Track,
  preferredPack: string | null,
  targetBpm: number | null,
  targetKey: string | null,
  settings: AutoFillSettings,
  usedRelativePaths: Set<string>,
  usedSampleFamilies: Set<string>,
) {
  if (sample.excluded || sample.ignored || sample.sessionSuitability === 'ignore') {
    return Number.NEGATIVE_INFINITY
  }

  if (!settings.allowDuplicates && usedRelativePaths.has(sample.relativePath)) {
    return Number.NEGATIVE_INFINITY
  }

  const sampleFamilyKey = getSampleFamilyKey(sample)
  if (!settings.allowDuplicates && usedSampleFamilies.has(sampleFamilyKey)) {
    return Number.NEGATIVE_INFINITY
  }

  if (!isRoleCategoryMatch(sample, track)) {
    return Number.NEGATIVE_INFINITY
  }

  let score = 0
  const samplePack = getSamplePack(sample)
  const isFxTrack = track.role === 'fx'
  const allowKeyNeutralStrict = settings.allowKeyNeutralStrict && isKeyNeutralTrack(track)
  score += 42

  if (sample.role && sample.role === track.role) {
    score += 18
  }

  if (preferredPack && samplePack === preferredPack) {
    score += 18
  }

  if (settings.preferSameFolder && preferredPack) {
    score += samplePack === preferredPack ? 8 : -4
  }

  const bpmValue = sample.detectedBpm ?? sample.bpm
  if (targetBpm !== null && bpmValue !== null) {
    const distance = Math.abs(bpmValue - targetBpm)

    if (distance <= settings.bpmTolerance) {
      score += 34 - distance * 1.2
    } else if (distance <= settings.bpmTolerance * 2) {
      score += 4 - distance * 0.65
    } else {
      score -= 18
    }
  } else if (bpmValue === null) {
    score -= 14
  }

  const sampleKey = getSampleEffectiveKey(sample)

  if (targetKey && settings.keyStrictness !== 'off') {
    if (!sampleKey) {
      if (!allowKeyNeutralStrict && !settings.allowUnknownKeySamples) {
        return Number.NEGATIVE_INFINITY
      }
      score += allowKeyNeutralStrict ? 6 : -14
    } else if (settings.keyStrictness === 'strict') {
      if (allowKeyNeutralStrict) {
        score += 6
      } else if (!areKeysExactMatch(sampleKey, targetKey)) {
        return Number.NEGATIVE_INFINITY
      }
      if (!allowKeyNeutralStrict) {
        score += 26
      }
    } else if (areKeysExactMatch(sampleKey, targetKey)) {
      score += 22
    } else if (areKeysCompatible(sampleKey, targetKey, 'compatible')) {
      score += 11
    } else if (allowKeyNeutralStrict) {
      score += 4
    } else {
      return Number.NEGATIVE_INFINITY
    }
  }

  if (settings.preferLoops) {
    if (isLoopLike(sample.type)) {
      score += 12
    } else {
      score -= isFxTrack ? 3 : 20
    }
  }

  if ((settings.allowOneShotsInFXOnly || !track.allowOneShots) && !isFxTrack && sample.type === 'one-shot') {
    return Number.NEGATIVE_INFINITY
  }

  score += (LOOP_CONFIDENCE_WEIGHT[sample.loopConfidence] ?? 0) * 2
  score += SESSION_SUITABILITY_WEIGHT[sample.sessionSuitability ?? 'low'] ?? 0

  return score
}

function getCoverageLabel(samples: SampleRecord[], tracks: Track[]) {
  const matchedRoles = tracks.filter((track) =>
    samples.some((sample) => isRoleCategoryMatch(sample, track)),
  ).length

  if (matchedRoles >= Math.max(6, tracks.length - 1)) {
    return 'Full pack'
  }

  if (matchedRoles <= 2) {
    return 'Narrow pack'
  }

  return 'Partial pack'
}

function buildSessionManifestFromState(
  state: LaunchBrainState,
  options?: {
    nameOverride?: string | null
  },
) {
  const name = options?.nameOverride?.trim() || state.currentSessionName || 'Untitled Set'

  return {
    id: state.currentSessionId,
    name,
    createdAt: state.lastSavedAt,
    updatedAt: state.lastSavedAt,
    sampleRoot: state.config.sampleRoot,
    selectedPack: state.activePack,
    tempo: state.transport.tempo,
    timeSignature: state.transport.timeSignature,
    quantize: state.transport.quantize,
    key: state.transport.key,
    scale: state.transport.scale,
    autoFillSettings: state.autoFillSettings,
    layoutPresetName: state.layoutPresetName,
    tracks: state.tracks.map((track) => ({
      ...track,
      playingClipId: null,
      queuedClipId: null,
    })),
    clips: state.clips.map((clip) => ({
      id: clip.id,
      clipName: clip.clipName,
      filled: clip.filled,
      trackIndex: clip.trackIndex,
      sceneIndex: clip.sceneIndex,
      column: clip.trackIndex + 1,
      row: clip.sceneIndex + 1,
      sampleId: clip.sampleId,
      absolutePath: clip.absolutePath,
      relativePath: clip.relativePath,
      category: clip.category,
      categoryConfidence: clip.categoryConfidence,
      categorySource: clip.categorySource,
      type: clip.type,
      bpm: clip.bpm,
      key: clip.key,
      parsedKey: clip.parsedKey,
      normalizedKey: clip.normalizedKey,
      keySource: clip.keySource,
      keyConfidence: clip.keyConfidence,
      excluded: clip.excluded,
      detectedBpm: clip.detectedBpm,
      bpmSource: clip.bpmSource,
      durationSeconds: clip.durationSeconds,
      estimatedBeats: clip.estimatedBeats,
      beatsLength: clip.beatsLength,
      syncStatus: clip.syncStatus,
      playbackRate: clip.playbackRate,
      subtype: clip.subtype,
      role: clip.role,
      sessionSuitability: clip.sessionSuitability,
      semanticTags: clip.semanticTags,
      moodTags: clip.moodTags,
      instrumentationTags: clip.instrumentationTags,
      sourceContext: clip.sourceContext,
      classificationReason: clip.classificationReason,
      color: clip.color,
      missingFile: clip.missingFile,
    })),
  }
}

function applyLoadedSessionToClipGrid(
  currentClips: ClipSlot[],
  loadedManifest: SessionManifest,
  tracks: Track[],
): {
  nextClips: ClipSlot[]
  missingFilesCount: number
} {
  const clipMap = new Map(loadedManifest.clips.map((clip) => [clip.id, clip]))

  let missingFilesCount = 0

  const nextClips = currentClips.map((clip) => {
    const saved = clipMap.get(clip.id)
    if (!saved || !saved.filled) {
      return emptyClip(clip)
    }

    const missingFile = Boolean(saved.missingFile)
    if (missingFile) {
      missingFilesCount += 1
    }

    return {
      ...clip,
      filled: true,
      sampleId: saved.sampleId ?? null,
      clipName: saved.clipName ?? null,
      category: saved.category ?? null,
      categoryConfidence: saved.categoryConfidence ?? 'low',
      categorySource: saved.categorySource ?? 'unknown',
      type: saved.type ?? null,
      bpm: saved.bpm ?? null,
      key: saved.key ?? null,
      parsedKey: saved.parsedKey ?? saved.key ?? null,
      normalizedKey: saved.normalizedKey ?? normalizeKey(saved.key ?? null),
      keySource: saved.keySource ?? 'unknown',
      keyConfidence: saved.keyConfidence ?? 'low',
      excluded: saved.excluded ?? false,
      detectedBpm: saved.detectedBpm ?? saved.bpm ?? null,
      bpmSource: saved.bpmSource ?? (saved.bpm !== null ? 'filename' : 'unknown'),
      durationSeconds: saved.durationSeconds ?? null,
      estimatedBeats: saved.estimatedBeats ?? null,
      beatsLength: saved.beatsLength ?? null,
      syncStatus: saved.syncStatus ?? 'unsupported',
      playbackRate: saved.playbackRate ?? null,
      subtype: saved.subtype ?? null,
      role: saved.role ?? null,
      sessionSuitability: saved.sessionSuitability ?? 'low',
      semanticTags: saved.semanticTags ?? [],
      moodTags: saved.moodTags ?? [],
      instrumentationTags: saved.instrumentationTags ?? [],
      sourceContext: saved.sourceContext ?? null,
      classificationReason: saved.classificationReason ?? null,
      preparationState: 'unloaded' as const,
      preparationError: null,
      absolutePath: saved.absolutePath ?? null,
      relativePath: saved.relativePath ?? null,
      color: saved.color ?? tracks[clip.trackIndex]?.color ?? null,
      playing: false,
      launchState: 'stopped' as const,
      missingFile,
    }
  })

  return {
    nextClips,
    missingFilesCount,
  }
}

function getBeatsPerBar(timeSignature: TransportState['timeSignature']) {
  const top = Number(timeSignature.split('/')[0])
  if (!Number.isFinite(top) || top <= 0) {
    return 4
  }

  return top
}

function getQuantizeBeats(
  quantize: TransportState['quantize'],
  beatsPerBar: number,
) {
  switch (quantize) {
    case 'None':
      return 0
    case '1/4':
      return 1
    case '1/2':
      return 2
    case '1 Bar':
      return beatsPerBar
    case '2 Bars':
      return beatsPerBar * 2
    case '4 Bars':
      return beatsPerBar * 4
    case '8 Bars':
      return beatsPerBar * 8
    default:
      return beatsPerBar
  }
}

export const useLaunchBrainStore = create<LaunchBrainState>((set, get) => {
  const stopPreviewInternal = () => {
    if (previewAudio) {
      previewAudio.onended = null
      stopAudioElement(previewAudio)
      previewAudio = null
    }

    previewSampleId = null
  }

  const startPreviewInternal = async (sampleId: string) => {
    const sample = get().samples.find((item) => item.id === sampleId)
    if (!sample) {
      return
    }

    stopPreviewInternal()

    const audio = new Audio(getSampleStreamUrl(sample.id))
    audio.loop = false
    audio.onended = () => {
      if (previewSampleId !== sample.id) {
        return
      }

      previewSampleId = null
      previewAudio = null
      set({ previewingSampleId: null, previewingFilename: null })
    }

    try {
      await audio.play()
      previewAudio = audio
      previewSampleId = sample.id
      set({
        previewingSampleId: sample.id,
        previewingFilename: sample.filename,
        playbackEngineStatus: 'Browser playback engine',
        lastAction: `Previewing sample: ${sample.filename}`,
      })
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : 'Failed to preview sample',
        lastAction: 'Sample preview failed',
      })
    }
  }

  const buildClipPreparationStatus = (clips: ClipSlot[]) => {
    const counts = summarizeClipPreparationCounts(clips)
    if (counts.total === 0) {
      return null
    }

    if (counts.loading === 0 && counts.failed === 0 && counts.ready >= counts.total) {
      return null
    }

    let status = `Preparing clips: ${counts.ready}/${counts.total}`
    if (counts.loading > 0) {
      status += `, ${counts.loading} loading`
    }
    if (counts.failed > 0) {
      status += `, ${counts.failed} failed`
    }

    return status
  }

  const buildTransportDiagnosticsState = (
    clips: ClipSlot[] = get().clips,
    lastScheduleError: string | null = get().lastScheduleError,
  ) => {
    const base = audioTransport.getDiagnostics()
    const counts = summarizeClipPreparationCounts(clips)

    return {
      ...base,
      loadingClipsCount: counts.loading,
      readyClipsCount: counts.ready,
      failedClipsCount: counts.failed,
      lastScheduleError,
    }
  }

  const ensureAudioTransportSubscription = () => {
    if (unsubscribeAudioTransport) {
      return
    }

    unsubscribeAudioTransport = audioTransport.subscribe((event) => {
      if (event.type === 'clock') {
        set(() => ({
          clockProgress: event.snapshot.progress,
          clockBeatInBar: event.snapshot.beatInBar,
          clockBeatInCycle: event.snapshot.beatInCycle,
          clockBeatsPerBar: event.snapshot.beatsPerBar,
          clockQuantizeBeats: event.snapshot.quantizeBeats,
        }))
        return
      }

      if (event.type === 'clip-error') {
        clearPendingTrackLaunch(event.trackIndex, event.clipId)
        set((state) => ({
          clips: state.clips.map((clip) =>
            clip.id === event.clipId
              ? {
                  ...clip,
                  playing: false,
                  launchState: clip.filled ? 'stopped' : 'empty',
                  syncStatus: 'unsupported',
                  preparationState: 'failed',
                  preparationError: event.message,
                }
              : clip,
          ),
          tracks: state.tracks.map((track) =>
            track.index === event.trackIndex && track.queuedClipId === event.clipId
              ? { ...track, queuedClipId: null, playingClipId: track.playingClipId === event.clipId ? null : track.playingClipId }
              : track.index === event.trackIndex && track.playingClipId === event.clipId
                ? { ...track, playingClipId: null }
                : track,
          ),
          errorMessage: event.message,
          lastScheduleError: event.message,
          lastAction: `Failed: ${truncateStatusLabel(event.filename ?? event.message)}`,
          clipPreparationStatus: buildClipPreparationStatus(
            state.clips.map((clip) =>
              clip.id === event.clipId
                ? {
                    ...clip,
                    playing: false,
                    launchState: clip.filled ? 'stopped' : 'empty',
                    syncStatus: 'unsupported',
                    preparationState: 'failed',
                    preparationError: event.message,
                  }
                : clip,
            ),
          ),
          transportDiagnostics: buildTransportDiagnosticsState(
            state.clips.map((clip) =>
              clip.id === event.clipId
                ? {
                    ...clip,
                    playing: false,
                    launchState: clip.filled ? 'stopped' : 'empty',
                    syncStatus: 'unsupported',
                    preparationState: 'failed',
                    preparationError: event.message,
                  }
                : clip,
            ),
            event.message,
          ),
        }))
        return
      }

      if (event.type === 'clip-started') {
        clearPendingTrackLaunch(event.trackIndex, event.clipId)
        set((state) => ({
          clips: state.clips.map((clip) => {
            if (clip.trackIndex !== event.trackIndex) {
              return clip
            }

            if (clip.id === event.clipId) {
              return {
                ...clip,
                playing: true,
                launchState: 'playing',
                durationSeconds: event.sync.durationSeconds,
                detectedBpm: event.sync.detectedBpm,
                bpmSource: event.sync.bpmSource,
                estimatedBeats: event.sync.estimatedBeats,
                beatsLength: event.sync.beatsLength,
                syncStatus: event.sync.syncStatus,
                playbackRate: event.sync.playbackRate,
              }
            }

            return {
              ...clip,
              playing: false,
              launchState: clip.filled ? 'stopped' : 'empty',
            }
          }),
          tracks: state.tracks.map((track) =>
            track.index === event.trackIndex
              ? {
                  ...track,
                  playingClipId: event.clipId,
                  queuedClipId: track.queuedClipId === event.clipId ? null : track.queuedClipId,
                }
              : track,
          ),
          queuedSceneLabel: null,
          playbackEngineStatus: 'Browser playback engine',
          transportDiagnostics: buildTransportDiagnosticsState(state.clips, state.lastScheduleError),
          lastAction: state.queuedSceneLabel
            ? `Scene launched: ${state.queuedSceneLabel}`
            : `Playing: ${truncateStatusLabel(event.filename ?? event.clipId)}`,
        }))
        return
      }

      if (event.type === 'clip-stopped') {
        set((state) => ({
          ...(() => {
            const currentClip = state.clips.find((clip) => clip.id === event.clipId)
            if (!currentClip || (!currentClip.playing && currentClip.launchState !== 'stopping')) {
              return state
            }

            return {
              clips: state.clips.map((clip) =>
                clip.id === event.clipId
                  ? {
                      ...clip,
                      playing: false,
                      launchState: clip.filled ? 'stopped' : 'empty',
                    }
                  : clip,
              ),
              tracks: state.tracks.map((track) =>
                track.index === event.trackIndex && track.playingClipId === event.clipId
                  ? { ...track, playingClipId: null }
                  : track,
              ),
              transportDiagnostics: buildTransportDiagnosticsState(state.clips, state.lastScheduleError),
              lastAction:
                state.queuedSceneLabel || state.clips.some((clip) => clip.trackIndex === event.trackIndex && clip.playing && clip.id !== event.clipId)
                  ? state.lastAction
                  : event.filename
                    ? `Stopped: ${truncateStatusLabel(event.filename)}`
                    : state.lastAction,
            }
          })(),
        }))
      }
    })
  }

  const stopTransportClock = () => {
    clearAllPendingTrackLaunches()
    audioTransport.stopTransport()
    const beatsPerBar = getBeatsPerBar(get().transport.timeSignature)
    set({
      clockProgress: 0,
      clockBeatInBar: 1,
      clockBeatInCycle: 1,
      clockBeatsPerBar: beatsPerBar,
      clockQuantizeBeats: Math.max(1, getQuantizeBeats(get().transport.quantize, beatsPerBar) || beatsPerBar),
      transportDiagnostics: buildTransportDiagnosticsState(get().clips, get().lastScheduleError),
    })
  }

  const configureAudioTransport = () => {
    const state = get()
    audioTransport.configure({
      tempo: state.transport.tempo,
      timeSignature: state.transport.timeSignature,
      quantize: state.transport.quantize,
    })
  }

  const getBeatsUntilBoundaryText = () => {
    const state = get()
    if (state.transport.quantize === 'None') {
      return 'starts immediately'
    }

    const beatsRemaining = state.transport.isPlaying
      ? Math.max(1, state.clockQuantizeBeats - state.clockBeatInCycle + 1)
      : Math.max(1, state.clockQuantizeBeats)

    return `starts in ${beatsRemaining} beat${beatsRemaining === 1 ? '' : 's'}`
  }

  const buildTransportClipRequest = (clip: ClipSlot): TransportClipRequest | null => {
    if (!clip.filled || !clip.sampleId || clip.preparationState !== 'ready') {
      return null
    }

    const state = get()
    const sample = state.samples.find((item) => item.id === clip.sampleId) ?? null
    const samplePack = sample ? getSamplePack(sample) : null
    const packSamples = samplePack ? state.samples.filter((item) => getSamplePack(item) === samplePack) : state.samples
    const packBpm = inferMostCommonBpm(packSamples)
    const effectiveBpm = sample ? getSampleEffectiveBpm(sample, packBpm) : { bpm: clip.detectedBpm ?? clip.bpm, source: clip.bpmSource }

    return {
      clipId: clip.id,
      trackIndex: clip.trackIndex,
      sampleId: clip.sampleId,
      filename: clip.clipName,
      type: clip.type ?? 'unknown',
      bpm: clip.bpm ?? effectiveBpm.bpm,
      detectedBpm: clip.detectedBpm ?? effectiveBpm.bpm,
      bpmSource: clip.bpmSource ?? effectiveBpm.source,
      beatsLength: clip.beatsLength,
      estimatedBeats: clip.estimatedBeats,
    }
  }

  const ensureClipReadyForPlayback = (clip: ClipSlot) => {
    if (!clip.filled || !clip.sampleId) {
      set({ lastAction: 'Playback unavailable on empty clip.' })
      return false
    }

    if (clip.preparationState === 'ready') {
      return true
    }

    if (clip.preparationState === 'failed') {
      set({
        lastAction: `Failed: ${truncateStatusLabel(clip.clipName ?? clip.id)}`,
        lastScheduleError: clip.preparationError ?? get().lastScheduleError,
        transportDiagnostics: buildTransportDiagnosticsState(get().clips, clip.preparationError ?? get().lastScheduleError),
      })
      return false
    }

    if (clip.preparationState === 'unloaded') {
      enqueueClipPreparation(clip.id, clip.sampleId, true)
    }

    set({ lastAction: `Preparing: ${truncateStatusLabel(clip.clipName ?? clip.id)}` })
    return false
  }

  const buildTransportRequestFromSample = (
    clip: Pick<ClipSlot, 'id' | 'trackIndex'>,
    sample: SampleRecord,
  ): TransportClipRequest => {
    const state = get()
    const samplePack = getSamplePack(sample)
    const packSamples = state.samples.filter((item) => getSamplePack(item) === samplePack)
    const packBpm = inferMostCommonBpm(packSamples)
    const effectiveBpm = getSampleEffectiveBpm(sample, packBpm)

    return {
      clipId: clip.id,
      trackIndex: clip.trackIndex,
      sampleId: sample.id,
      filename: sample.filename,
      type: sample.type ?? 'unknown',
      bpm: sample.bpm ?? effectiveBpm.bpm,
      detectedBpm: sample.detectedBpm ?? effectiveBpm.bpm,
      bpmSource:
        sample.detectedBpm !== null || sample.bpm !== null
          ? sample.bpmSource ?? 'filename'
          : effectiveBpm.source,
      beatsLength: sample.beatsLength,
      estimatedBeats: sample.estimatedBeats,
    }
  }

  const prepareSampleForGridClip = async (
    clip: Pick<ClipSlot, 'id' | 'trackIndex'>,
    sample: SampleRecord,
  ) => {
    const request = buildTransportRequestFromSample(clip, sample)
    const sync = await audioTransport.prepareClipForPlayback(request)

    return {
      bpm: request.bpm,
      detectedBpm: sync.detectedBpm ?? request.detectedBpm,
      bpmSource: sync.detectedBpm !== null ? sync.bpmSource : request.bpmSource,
      durationSeconds: sync.durationSeconds,
      estimatedBeats: sync.estimatedBeats,
      beatsLength: sync.beatsLength,
      syncStatus: sync.syncStatus,
      playbackRate: sync.playbackRate,
    } as Partial<SampleRecord>
  }

  const markClipPreparationState = (
    clipId: string,
    sampleId: string,
    nextState: ClipPreparationState,
    preparationError: string | null = null,
    preparedPatch?: Partial<SampleRecord>,
  ) => {
    set((current) => {
      const clip = current.clips.find((entry) => entry.id === clipId)
      if (!clip || clip.sampleId !== sampleId) {
        return current
      }

      const sourceSample = current.samples.find((entry) => entry.id === sampleId)
      const preparedSample =
        sourceSample && preparedPatch
          ? ({
              ...sourceSample,
              ...preparedPatch,
            } as SampleRecord)
          : sourceSample

      const nextSamples =
        sourceSample && preparedPatch
          ? current.samples.map((sample) => (sample.id === sampleId ? preparedSample ?? sample : sample))
          : current.samples

      const nextClips: ClipSlot[] = current.clips.map((entry) => {
        if (entry.id !== clipId) {
          return entry
        }

        if (preparedSample) {
          const preparedClip = applySampleToClip(
            entry,
            preparedSample,
            entry.color ?? current.tracks[entry.trackIndex]?.color ?? '#64748b',
          )

          return {
            ...preparedClip,
            preparationState: nextState,
            preparationError,
            playing: entry.playing,
            launchState: entry.launchState,
          }
        }

        return {
          ...entry,
          preparationState: nextState,
          preparationError,
          syncStatus: nextState === 'failed' ? 'unsupported' : entry.syncStatus,
          playing: false,
          launchState: entry.filled ? 'stopped' : 'empty',
        }
      })

      return {
        samples: nextSamples,
        clips: nextClips,
        clipPreparationStatus: buildClipPreparationStatus(nextClips),
        transportDiagnostics: buildTransportDiagnosticsState(nextClips, current.lastScheduleError),
      }
    })
  }

  const pumpClipPreparationQueue = () => {
    while (clipPreloadActiveCount < CLIP_PRELOAD_CONCURRENCY && clipPreloadQueue.length > 0) {
      const nextJob = clipPreloadQueue.shift()
      if (!nextJob) {
        break
      }

      clipPreloadActiveCount += 1
      const queueKey = `${nextJob.clipId}:${nextJob.sampleId}`

      void (async () => {
        const current = get()
        const clip = current.clips.find((entry) => entry.id === nextJob.clipId)
        const sample = current.samples.find((entry) => entry.id === nextJob.sampleId)
        if (!clip || !sample || clip.sampleId !== sample.id || !clip.filled) {
          return
        }

        markClipPreparationState(clip.id, sample.id, 'loading')

        try {
          const preparedPatch = await prepareSampleForGridClip(clip, sample)
          markClipPreparationState(clip.id, sample.id, 'ready', null, preparedPatch)
          const currentClip = get().clips.find((entry) => entry.id === clip.id)
          if (currentClip?.launchState === 'queued') {
            void queuePreparedClipLaunch(clip.id)
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Clip decode failed'
          console.debug('LaunchBrain preload failed', {
            clipId: clip.id,
            sampleId: sample.id,
            diagnostics: audioTransport.getDiagnostics(),
            message,
          })

          set({
            lastScheduleError: message,
            errorMessage: message,
          })
          markClipPreparationState(clip.id, sample.id, 'failed', message)
        }
      })()
        .finally(() => {
          clipPreloadActiveCount = Math.max(0, clipPreloadActiveCount - 1)
          clipPreloadQueuedKeys.delete(queueKey)
          pumpClipPreparationQueue()
        })
    }
  }

  const enqueueClipPreparation = (clipId: string, sampleId: string, prioritize = false) => {
    const queueKey = `${clipId}:${sampleId}`
    if (clipPreloadQueuedKeys.has(queueKey)) {
      return
    }

    clipPreloadQueuedKeys.add(queueKey)
    if (prioritize) {
      clipPreloadQueue.unshift({ clipId, sampleId })
    } else {
      clipPreloadQueue.push({ clipId, sampleId })
    }
    pumpClipPreparationQueue()
  }

  const enqueuePreparationForFilledClips = (clips: ClipSlot[]) => {
    for (const clip of clips) {
      if (!clip.filled || !clip.sampleId) {
        continue
      }

      enqueueClipPreparation(clip.id, clip.sampleId)
    }
  }

  const queuePreparedClipLaunch = async (clipId: string) => {
    const clip = get().clips.find((entry) => entry.id === clipId)
    if (!clip || !clip.filled || !clip.sampleId || clip.preparationState !== 'ready' || clip.playing) {
      return
    }

    const pending = pendingTrackLaunches.get(clip.trackIndex)
    if (!pending || pending.clipId !== clip.id) {
      return
    }

    if (get().transport.quantize === 'None') {
      await startClipNow(clip.id)
      return
    }

    await ensureTransportForQueuedLaunch()
    const boundaryTime = audioTransport.getNextBoundaryTime()
    queueTrackSwitch(clip.trackIndex, clip.id, boundaryTime)
    set({
      lastAction: `Queued: ${truncateStatusLabel(clip.clipName)} - ${getBeatsUntilBoundaryText()}`,
    })
  }

  const releaseClipFromTransport = (clip: ClipSlot) => {
    clearPendingTrackLaunch(clip.trackIndex, clip.id)
    audioTransport.cancelQueuedTrackActions(clip.trackIndex)
    audioTransport.stopClipImmediately(clip.id)

    if (clip.playing || clip.launchState === 'stopping') {
      console.debug('LaunchBrain clip transport state cleared for replacement', {
        clipId: clip.id,
        diagnostics: audioTransport.getDiagnostics(),
      })
    }
  }

  const assignPreparedSampleToClipInternal = async (clipId: string, sampleId: string) => {
    const state = get()
    const selectedSample = state.samples.find((sample) => sample.id === sampleId)
    const selectedClip = state.clips.find((clip) => clip.id === clipId)
    if (!selectedSample || !selectedClip) {
      set({ lastAction: 'Assign skipped: invalid sample or clip' })
      return
    }

    const track = state.tracks.find((item) => item.index === selectedClip.trackIndex)
    const trackColor = track?.color ?? '#64748b'
    releaseClipFromTransport(selectedClip)

    const optimisticClip = applySampleToClip(selectedClip, selectedSample, trackColor)
    set((current) => {
      const nextClips: ClipSlot[] = current.clips.map((clip) =>
        clip.id === selectedClip.id
          ? {
              ...optimisticClip,
              playing: false,
              launchState: 'stopped',
              preparationState: 'loading',
              preparationError: null,
            }
          : clip,
      )

      return {
        clips: nextClips,
        selectedClipId: selectedClip.id,
        selectedSampleId: selectedSample.id,
        missingFilesCount: nextClips.filter((clip) => clip.filled && clip.missingFile).length,
        saveStatus: 'dirty',
        errorMessage: null,
        clipPreparationStatus: buildClipPreparationStatus(nextClips),
        transportDiagnostics: buildTransportDiagnosticsState(nextClips, current.lastScheduleError),
        lastAction: `Preparing: ${truncateStatusLabel(selectedSample.filename)}`,
      }
    })

    enqueueClipPreparation(selectedClip.id, selectedSample.id, true)
  }

  const ensureTransportForQueuedLaunch = async () => {
    ensureAudioTransportSubscription()
    configureAudioTransport()

    const state = get()
    if (!state.transport.isPlaying) {
      await audioTransport.startTransport()
      set((current) => ({
        transport: {
          ...current.transport,
          isPlaying: true,
        },
        playbackEngineStatus: 'Browser playback engine',
        lastAction: 'Transport running',
      }))
    }
  }

  const stopClipNow = (clip: ClipSlot, statusMessage?: string) => {
    void audioTransport.queueClipStop(
      {
        clipId: clip.id,
        trackIndex: clip.trackIndex,
        filename: clip.clipName,
      },
      audioTransport.getNextBoundaryTime('None'),
    )
    set({ lastAction: statusMessage ?? get().lastAction })
  }

  const stopTrackNow = (trackIndex: number) => {
    const state = get()
    clearPendingTrackLaunch(trackIndex)
    const targetClips = state.clips.filter((clip) => clip.trackIndex === trackIndex && clip.playing)
    for (const clip of targetClips) {
      void audioTransport.queueClipStop(
        { clipId: clip.id, trackIndex: clip.trackIndex, filename: clip.clipName },
        audioTransport.getNextBoundaryTime('None'),
      )
    }
    set((current) => ({
      tracks: current.tracks.map((track) =>
        track.index === trackIndex ? { ...track, queuedClipId: null } : track,
      ),
      lastAction: `Stopped: ${truncateStatusLabel(getTrackLabel(state.tracks, trackIndex))}`,
    }))
  }

  const stopAllClipsNow = () => {
    clearAllPendingTrackLaunches()
    audioTransport.stopAll()
    set((state) => ({
      clips: state.clips.map((clip) => ({
        ...clip,
        playing: false,
        launchState: clip.filled ? 'stopped' : 'empty',
      })),
      tracks: state.tracks.map((track) => ({
        ...track,
        playingClipId: null,
        queuedClipId: null,
      })),
      queuedSceneLabel: null,
      lastAction: IMMEDIATE_STOP_MESSAGE,
    }))
  }

  const queueTrackSwitch = (trackIndex: number, startClipId: string, boundaryOverride?: number) => {
    const state = get()
    const trackLabel = getTrackLabel(state.tracks, trackIndex)
    const beatsMessage = getBeatsUntilBoundaryText()
    const hasOtherPlaying = state.clips.some(
      (clip) => clip.trackIndex === trackIndex && clip.playing && clip.id !== startClipId,
    )
    const startClip = state.clips.find((clip) => clip.id === startClipId)
    const isClipReady = Boolean(startClip && startClip.preparationState === 'ready')
    const stoppingClips = state.clips.filter((clip) => clip.trackIndex === trackIndex && clip.playing && clip.id !== startClipId)
    setPendingTrackLaunch(trackIndex, startClipId, state.queuedSceneLabel)

    set((current) => ({
      tracks: current.tracks.map((track) =>
        track.index === trackIndex
          ? {
              ...track,
              queuedClipId: startClipId,
            }
          : track,
      ),
      clips: current.clips.map((clip) => {
        if (clip.trackIndex !== trackIndex) {
          return clip
        }

        if (clip.id === startClipId) {
          return {
            ...clip,
            launchState: 'queued',
          }
        }

        if (clip.launchState === 'queued') {
          return {
            ...clip,
            launchState: clip.playing ? 'playing' : clip.filled ? 'stopped' : 'empty',
          }
        }

        if (clip.playing && isClipReady) {
          return {
            ...clip,
            launchState: 'stopping',
          }
        }

        return clip
      }),
      lastAction:
        startClip && !isClipReady
          ? `Preparing: ${truncateStatusLabel(startClip.clipName)}`
          : hasOtherPlaying
            ? `Queued: ${trackLabel} - ${beatsMessage}`
            : `Queued: ${truncateStatusLabel(startClip?.clipName ?? startClipId)} - ${beatsMessage}`,
    }))

    if (!startClip) {
      return
    }

    if (!isClipReady) {
      ensureClipReadyForPlayback(startClip)
      return
    }

    const request = startClip ? buildTransportClipRequest(startClip) : null
    if (!request) {
      return
    }

    void (async () => {
      await ensureTransportForQueuedLaunch()
      const boundaryTime = boundaryOverride ?? audioTransport.getNextBoundaryTime()
      audioTransport.cancelQueuedTrackActions(trackIndex)

      for (const clip of stoppingClips) {
        await audioTransport.queueClipStop(
          {
            clipId: clip.id,
            trackIndex: clip.trackIndex,
            filename: clip.clipName,
          },
          boundaryTime,
        )
      }

      await audioTransport.queueClipStart(request, boundaryTime)
    })()
  }

  const startClipNow = async (clipId: string) => {
    const state = get()
    const target = state.clips.find((clip) => clip.id === clipId)
    if (!target || !target.filled || !target.sampleId) {
      set({ lastAction: 'Playback unavailable on empty clip.' })
      return
    }

    if (!ensureClipReadyForPlayback(target)) {
      return
    }

    const request = buildTransportClipRequest(target)
    if (!request) {
      return
    }

    await ensureTransportForQueuedLaunch()
    const boundaryTime = audioTransport.getNextBoundaryTime('None')

    const sameTrackPlaying = state.clips.filter((clip) => clip.trackIndex === target.trackIndex && clip.playing && clip.id !== clipId)
    for (const clip of sameTrackPlaying) {
      await audioTransport.queueClipStop(
        {
          clipId: clip.id,
          trackIndex: clip.trackIndex,
          filename: clip.clipName,
        },
        boundaryTime,
      )
    }

    await audioTransport.queueClipStart(request, boundaryTime)
  }

  const resolveAutoFillSource = (
    samples: SampleRecord[],
    tracks: Track[],
    activePack: string | null,
    sourceScope: AutoFillSettings['sourceScope'],
  ) => {
    if (sourceScope === 'entireLibrary') {
      return {
        sourceSamples: samples,
        chosenPack: null as string | null,
        sourceLabel: 'Entire library',
        sourceReason: 'Using the full library as the current source.',
      }
    }

    if (sourceScope === 'selectedPack') {
      if (activePack) {
        const scoped = samples.filter((sample) => getSamplePack(sample) === activePack)
        if (scoped.length > 0) {
          return {
            sourceSamples: scoped,
            chosenPack: activePack,
            sourceLabel: `Selected Bank: ${activePack}`,
            sourceReason: 'Using the selected pack as the current source context.',
          }
        }
      }

      const bestPack = computePackCoverage(samples, tracks)
      if (bestPack) {
        return {
          sourceSamples: samples.filter((sample) => getSamplePack(sample) === bestPack),
          chosenPack: bestPack,
          sourceLabel: `Auto-selected pack: ${bestPack}`,
          sourceReason: 'Auto-selected because it has the best category coverage and BPM/key compatibility.',
        }
      }

      return {
        sourceSamples: samples,
        chosenPack: null,
        sourceLabel: 'Entire library (fallback)',
        sourceReason: 'Falling back to the full library because no selected pack was available.',
      }
    }

    const bestPack = computePackCoverage(samples, tracks)
    if (bestPack) {
      return {
        sourceSamples: samples.filter((sample) => getSamplePack(sample) === bestPack),
        chosenPack: bestPack,
        sourceLabel: `Auto-selected pack: ${bestPack}`,
        sourceReason: 'Auto-selected because it has the best category coverage and BPM/key compatibility.',
      }
    }

    return {
      sourceSamples: samples,
      chosenPack: null,
      sourceLabel: 'Entire library (fallback)',
      sourceReason: 'Falling back to the full library because no strong source pack was found.',
    }
  }

  const createClearSnapshot = (state: LaunchBrainState, message: string) => {
    return {
      clips: state.clips.map((clip) => ({ ...clip })),
      missingFilesCount: state.missingFilesCount,
      message,
    }
  }

  const normalizeOverridePath = (relativePath: string) => relativePath.replace(/\\+/g, '/')

  const applySamplePatchAcrossState = (
    state: LaunchBrainState,
    sampleId: string,
    patch: Partial<SampleRecord>,
  ) => {
    const nextSamples = state.samples.map((sample) => (sample.id === sampleId ? { ...sample, ...patch } : sample))

    const nextClips = state.clips.map((clip) => {
      if (clip.sampleId !== sampleId) {
        return clip
      }

      return {
        ...clip,
        bpm: patch.bpm ?? clip.bpm,
        detectedBpm: patch.detectedBpm ?? clip.detectedBpm,
        bpmSource: patch.bpmSource ?? clip.bpmSource,
        key: patch.key ?? clip.key,
        parsedKey: patch.parsedKey ?? clip.parsedKey,
        normalizedKey: patch.normalizedKey ?? clip.normalizedKey,
        keySource: patch.keySource ?? clip.keySource,
        keyConfidence: patch.keyConfidence ?? clip.keyConfidence,
        excluded: patch.excluded ?? clip.excluded,
        durationSeconds: patch.durationSeconds ?? clip.durationSeconds,
        estimatedBeats: patch.estimatedBeats ?? clip.estimatedBeats,
        beatsLength: patch.beatsLength ?? clip.beatsLength,
        syncStatus: patch.syncStatus ?? clip.syncStatus,
        playbackRate: patch.playbackRate ?? clip.playbackRate,
      }
    })

    return {
      samples: nextSamples,
      clips: nextClips,
    }
  }

  const clearClipByIdInternal = (clipId: string) => {
    const clip = get().clips.find((item) => item.id === clipId)
    if (clip) {
      clearPendingTrackLaunch(clip.trackIndex, clip.id)
    }
    if (clip?.playing) {
      void audioTransport.queueClipStop(
        {
          clipId: clip.id,
          trackIndex: clip.trackIndex,
          filename: clip.clipName,
        },
        audioTransport.getNextBoundaryTime('None'),
      )
    }
    return set((state) => {
      const nextClips = state.clips.map((clip) => (clip.id === clipId ? emptyClip(clip) : clip))
      return {
        clips: nextClips,
        clipPreparationStatus: buildClipPreparationStatus(nextClips),
        transportDiagnostics: buildTransportDiagnosticsState(nextClips, state.lastScheduleError),
        missingFilesCount: nextClips.filter((clip) => clip.filled && clip.missingFile).length,
        lastClearSnapshot: createClearSnapshot(state, 'Undo clear clip'),
        canUndoClear: true,
        saveStatus: 'dirty',
      }
    })
  }

  return {
    transport: { ...DEFAULT_TRANSPORT },
    devices: { ...DEFAULT_DEVICES },
    config: defaultConfig(),
    categories: [],
    importedFolders: [],
    samples: [],
    tracks: createDefaultTracks(DEFAULT_LAYOUT_PRESET),
    scenes: createDefaultScenes(),
    clips: createEmptyClips(),
    selectedSampleId: null,
    selectedClipId: 'clip-1-1',
    inspectorTab: 'Clip',
    inspectorOpen: true,
    assistantMessages: [...DEFAULT_ASSISTANT_MESSAGES],
    assistantInput: '',
    browserQuery: '',
    sampleRootInput: '',
    isBootstrapping: false,
    isScanning: false,
    previewingSampleId: null,
    previewingFilename: null,
    playbackEngineStatus: 'Browser playback engine',
    lastAction: 'Ready',
    errorMessage: null,
    activePack: null,
    activeCategoryFilter: null,
    activeBpmFilter: null,
    activeKeyFilter: null,
    activeTypeFilter: null,
    explorerGroupsOpen: {
      packs: true,
      categories: false,
      bpm: false,
      key: false,
      type: false,
    },
    folderBrowserOpen: false,
    folderBrowserLoading: false,
    folderBrowserError: null,
    filesystemRoots: [],
    folderBrowserPath: null,
    folderBrowserParentPath: null,
    folderBrowserFolders: [],
    folderBrowserAudioFileCountDirect: 0,
    folderBrowserAudioFileCountRecursiveEstimate: null,
    autoFillSettings: { ...DEFAULT_AUTO_FILL_SETTINGS },
    autoFillOptionsOpen: false,
    layoutPresetName: DEFAULT_LAYOUT_PRESET,
    autoFillResolvedSource: 'Auto best pack',
    autoFillResolvedSourceReason: 'Auto-selects the pack with the best category coverage and BPM/key compatibility.',
    autoFillResolvedKey: null,
    clockProgress: 0,
    clockBeatInBar: 1,
    clockBeatInCycle: 1,
    clockBeatsPerBar: 4,
    clockQuantizeBeats: 4,
    queuedSceneLabel: null,
    currentSessionId: null,
    currentSessionName: 'Untitled Set',
    clipPreparationStatus: null,
    lastSavedAt: null,
    saveStatus: 'idle',
    missingFilesCount: 0,
    lastClearSnapshot: null,
    recentSessions: [],
    selectedRecentSessionId: null,
    sampleOverrides: {},
    transportDiagnostics: audioTransport.getDiagnostics(),
    lastScheduleError: null,
    autoFillCoverageLabel: 'Partial pack',
    canUndoClear: false,

    initializeApp: async () => {
      set({ isBootstrapping: true, errorMessage: null })
      ensureAudioTransportSubscription()

      try {
        const [config, devices, sampleIndex, sessionList, overrideResponse] = await Promise.all([
          getConfig(),
          getDevices(),
          getSampleIndex(),
          apiListSessions().catch(() => ({ sessions: [] })),
          apiGetSampleOverrides().catch(() => ({ overrides: {} })),
        ])

        set({
          config,
          devices,
          sampleRootInput: config.sampleRoot ?? '',
          ...(sampleIndex ? applyScanSnapshotToState(sampleIndex) : {}),
          recentSessions: sessionList.sessions,
          selectedRecentSessionId: sessionList.sessions[0]?.id ?? null,
          sampleOverrides: overrideResponse.overrides ?? {},
          isBootstrapping: false,
          lastAction: sampleIndex
            ? `Library scanned (cached): ${sampleIndex.sampleCount} samples`
            : 'Loaded config and device status',
          playbackEngineStatus: 'Browser playback engine',
        })
        configureAudioTransport()
        syncTrackMixState(get().tracks)
      } catch (error) {
        set({
          isBootstrapping: false,
          errorMessage: error instanceof Error ? error.message : 'Failed to load app state',
          lastAction: 'Initialization failed',
        })
      }
    },

    refreshSavedSessions: async () => {
      try {
        const response = await apiListSessions()
        set((state) => ({
          recentSessions: response.sessions,
          selectedRecentSessionId:
            state.selectedRecentSessionId && response.sessions.some((item) => item.id === state.selectedRecentSessionId)
              ? state.selectedRecentSessionId
              : response.sessions[0]?.id ?? null,
        }))
      } catch (error) {
        set({
          errorMessage: error instanceof Error ? error.message : 'Failed to list saved sessions',
        })
      }
    },

    saveCurrentSession: async (saveAs = false, nameOverride = null) => {
      const state = get()
      const payload = buildSessionManifestFromState(state, { nameOverride })

      try {
        const response = await apiSaveSession({
          id: saveAs ? null : state.currentSessionId,
          name: payload.name,
          saveAs,
          session: payload,
        })

        const saved = response.session
        await get().refreshSavedSessions()

        set({
          currentSessionId: saved.id,
          currentSessionName: saved.name,
          lastSavedAt: saved.updatedAt,
          saveStatus: 'saved',
          selectedRecentSessionId: saved.id,
          lastAction: `Session saved: ${saved.name}`,
        })
      } catch (error) {
        set({
          errorMessage: error instanceof Error ? error.message : 'Failed to save session',
          lastAction: 'Save set failed',
        })
      }
    },

    loadSavedSession: async (sessionId) => {
      try {
        const response = await apiLoadSession(sessionId)
        const loaded = response.session

        clearAllPendingTrackLaunches()
        audioTransport.stopAll()
        clipPreloadQueue = []
        clipPreloadQueuedKeys.clear()

        const state = get()
        const loadedRoleOrder = normalizeRoleOrderFromLoadedTracks((loaded.tracks as Partial<Track>[] | undefined) ?? [])
        const restoredTracks = buildTracksFromRoleOrderWithState(
          Array.isArray(loaded.tracks) && loaded.tracks.length > 0 ? (loaded.tracks as Track[]) : state.tracks,
          loadedRoleOrder,
        ).map((track) => ({
          ...track,
          playingClipId: null,
          queuedClipId: null,
        }))
        const applied = applyLoadedSessionToClipGrid(state.clips, loaded, restoredTracks)
        const restoredPresetName =
          loaded.layoutPresetName ??
          inferLayoutPresetName(loadedRoleOrder)

        set((current) => ({
          transport: {
            ...current.transport,
            tempo: loaded.tempo,
            timeSignature: loaded.timeSignature,
            quantize: loaded.quantize,
            key: loaded.key,
            scale: loaded.scale,
            isPlaying: false,
          },
          config: {
            ...current.config,
            sampleRoot: loaded.sampleRoot ?? current.config.sampleRoot,
          },
          activePack: loaded.selectedPack ?? null,
          autoFillSettings: {
            ...DEFAULT_AUTO_FILL_SETTINGS,
            ...current.autoFillSettings,
            ...(loaded.autoFillSettings ?? {}),
          },
          tracks: restoredTracks,
          layoutPresetName: restoredPresetName,
          autoFillResolvedSource: loaded.selectedPack
            ? `Selected pack: ${loaded.selectedPack}`
            : current.autoFillResolvedSource,
          autoFillResolvedSourceReason: loaded.selectedPack
            ? 'Using the selected pack from the loaded session.'
            : current.autoFillResolvedSourceReason,
          autoFillResolvedKey: normalizeKey(loaded.autoFillSettings?.targetKey ?? null),
          clips: applied.nextClips,
          currentSessionId: loaded.id,
          currentSessionName: loaded.name,
          lastSavedAt: loaded.updatedAt,
          saveStatus: 'saved',
          selectedRecentSessionId: loaded.id,
          missingFilesCount: applied.missingFilesCount,
          clipPreparationStatus: buildClipPreparationStatus(applied.nextClips),
          transportDiagnostics: buildTransportDiagnosticsState(applied.nextClips, current.lastScheduleError),
          lastClearSnapshot: null,
          canUndoClear: false,
          queuedSceneLabel: null,
          lastAction:
            applied.missingFilesCount > 0
              ? `Session loaded: ${loaded.name} (${applied.missingFilesCount} missing files)`
              : `Session loaded: ${loaded.name}`,
        }))

        stopTransportClock()
        configureAudioTransport()
        syncTrackMixState(restoredTracks)
        enqueuePreparationForFilledClips(applied.nextClips)
      } catch (error) {
        set({
          errorMessage: error instanceof Error ? error.message : 'Failed to load session',
          lastAction: 'Load set failed',
        })
      }
    },

    setSelectedRecentSessionId: (sessionId) => {
      set({ selectedRecentSessionId: sessionId })
    },

    refreshDevices: async () => {
      try {
        const devices = await getDevices()
        set({ devices, lastAction: 'Device status refreshed' })
      } catch (error) {
        set({
          errorMessage: error instanceof Error ? error.message : 'Failed to refresh devices',
          lastAction: 'Device refresh failed',
        })
      }
    },

    setSampleRootInput: (value) => {
      set({ sampleRootInput: value })
    },

    saveSampleRoot: async () => {
      const sampleRootInput = get().sampleRootInput.trim()

      if (!sampleRootInput) {
        set({ errorMessage: 'Sample root cannot be empty.' })
        return
      }

      try {
        const config = await setSampleRoot(sampleRootInput)
        set({
          config,
          sampleRootInput: config.sampleRoot ?? '',
          errorMessage: null,
          saveStatus: 'dirty',
          lastAction: `Sample root selected: ${config.sampleRoot}`,
        })
      } catch (error) {
        set({
          errorMessage: error instanceof Error ? error.message : 'Failed to set sample root',
          lastAction: 'Set sample root failed',
        })
      }
    },

    openFolderBrowser: async () => {
      set({ folderBrowserOpen: true, folderBrowserLoading: true, folderBrowserError: null })

      try {
        const rootsResponse = await getFilesystemRoots()
        const roots = rootsResponse.roots
        const state = get()
        const initialPath = state.config.sampleRoot ?? roots[0]?.absolutePath ?? null

        if (!initialPath) {
          set({
            filesystemRoots: roots,
            folderBrowserLoading: false,
            folderBrowserFolders: [],
            folderBrowserPath: null,
            folderBrowserParentPath: null,
            folderBrowserAudioFileCountDirect: 0,
            folderBrowserAudioFileCountRecursiveEstimate: null,
          })
          return
        }

        const listing = await getFilesystemFolderList(initialPath)

        set({
          filesystemRoots: roots,
          folderBrowserLoading: false,
          folderBrowserPath: listing.path,
          folderBrowserParentPath: listing.parentPath,
          folderBrowserFolders: listing.folders,
          folderBrowserAudioFileCountDirect: listing.audioFileCountDirect,
          folderBrowserAudioFileCountRecursiveEstimate: listing.audioFileCountRecursiveEstimate ?? null,
        })
      } catch (error) {
        set({
          folderBrowserLoading: false,
          folderBrowserError: error instanceof Error ? error.message : 'Failed to browse folders',
        })
      }
    },

    closeFolderBrowser: () => {
      set({ folderBrowserOpen: false, folderBrowserError: null })
    },

    navigateFolderBrowser: async (targetPath) => {
      set({ folderBrowserLoading: true, folderBrowserError: null })

      try {
        const listing = await getFilesystemFolderList(targetPath)
        set({
          folderBrowserLoading: false,
          folderBrowserPath: listing.path,
          folderBrowserParentPath: listing.parentPath,
          folderBrowserFolders: listing.folders,
          folderBrowserAudioFileCountDirect: listing.audioFileCountDirect,
          folderBrowserAudioFileCountRecursiveEstimate: listing.audioFileCountRecursiveEstimate ?? null,
        })
      } catch (error) {
        set({
          folderBrowserLoading: false,
          folderBrowserError: error instanceof Error ? error.message : 'Failed to list folder',
        })
      }
    },

    navigateFolderBrowserParent: async () => {
      const parentPath = get().folderBrowserParentPath
      if (!parentPath) {
        return
      }

      await get().navigateFolderBrowser(parentPath)
    },

    applyCurrentFolderAsSampleRoot: async () => {
      const selectedPath = get().folderBrowserPath

      if (!selectedPath) {
        set({ folderBrowserError: 'No folder selected.' })
        return
      }

      try {
        const config = await setSampleRoot(selectedPath)
        set({
          config,
          sampleRootInput: config.sampleRoot ?? '',
          folderBrowserOpen: false,
          folderBrowserError: null,
          errorMessage: null,
          saveStatus: 'dirty',
          lastAction: `Sample root selected: ${config.sampleRoot}`,
        })
      } catch (error) {
        set({
          folderBrowserError: error instanceof Error ? error.message : 'Failed to set sample root',
          lastAction: 'Set sample root failed',
        })
      }
    },

    scanSampleLibrary: async () => {
      set({ isScanning: true, errorMessage: null })

      try {
        const [result, overrideResponse] = await Promise.all([
          scanSamples(),
          apiGetSampleOverrides().catch(() => ({ overrides: {} })),
        ])
        set((state) => ({
          config: {
            ...state.config,
            sampleRoot: result.sampleRoot,
            lastScanAt: result.scannedAt,
          },
          ...applyScanSnapshotToState(result),
          sampleOverrides: overrideResponse.overrides ?? state.sampleOverrides,
          clips: state.clips.map((clip) => (clip.filled ? { ...clip, launchState: 'stopped' } : clip)),
          isScanning: false,
          lastAction: `Library scanned: ${result.sampleCount} samples`,
        }))
      } catch (error) {
        set({
          isScanning: false,
          errorMessage: error instanceof Error ? error.message : 'Scan failed',
          lastAction: 'Scan failed',
        })
      }
    },

    setTransportPlay: () => {
      const state = get()
      if (state.transport.isPlaying) {
        return
      }

      ensureAudioTransportSubscription()
      configureAudioTransport()
      void audioTransport.startTransport().catch((error) => {
        set({
          errorMessage: error instanceof Error ? error.message : 'Failed to start audio transport',
          lastAction: 'Transport start failed',
        })
      })

      set((current) => ({
        transport: { ...current.transport, isPlaying: true },
        playbackEngineStatus: 'Browser playback engine',
        transportDiagnostics: buildTransportDiagnosticsState(current.clips, current.lastScheduleError),
        lastAction: 'Transport running',
      }))
    },

    setTransportStop: () => {
      stopTransportClock()

      set((state) => {
        const nextClips: ClipSlot[] = state.clips.map((clip) => ({
          ...clip,
          playing: false,
          launchState: (clip.filled ? 'stopped' : 'empty') as ClipSlot['launchState'],
        }))

        return {
          transport: {
            ...state.transport,
            isPlaying: false,
            isRecording: false,
          },
          clips: nextClips,
          tracks: state.tracks.map((track) => ({
            ...track,
            playingClipId: null,
            queuedClipId: null,
          })),
          queuedSceneLabel: null,
          transportDiagnostics: buildTransportDiagnosticsState(nextClips, state.lastScheduleError),
          lastAction: 'Transport stopped: all clips',
        }
      })
    },

    stopAllClipPlayback: () => {
      const state = get()
      if (state.transport.quantize === 'None' || !state.transport.isPlaying) {
        stopAllClipsNow()
        return
      }

      clearAllPendingTrackLaunches()
      const boundaryTime = audioTransport.getNextBoundaryTime()
      for (const track of state.tracks) {
        audioTransport.cancelQueuedTrackActions(track.index)
      }
      for (const clip of state.clips) {
        if (!clip.playing && clip.launchState !== 'stopping') {
          continue
        }

        void audioTransport.queueClipStop(
          {
            clipId: clip.id,
            trackIndex: clip.trackIndex,
            filename: clip.clipName,
          },
          boundaryTime,
        )
      }

      set((current) => ({
        tracks: current.tracks.map((track) => ({
          ...track,
          queuedClipId: null,
        })),
        clips: current.clips.map((clip) => {
          if (clip.launchState === 'queued') {
            return {
              ...clip,
              launchState: clip.playing ? 'playing' : clip.filled ? 'stopped' : 'empty',
            }
          }

          if (clip.playing || clip.launchState === 'stopping') {
            return {
              ...clip,
              launchState: 'stopping',
            }
          }

          return clip
        }),
        queuedSceneLabel: null,
        lastAction: 'Stop all queued',
      }))
    },

    toggleRecord: () =>
      set({
        lastAction: 'Record / capture is coming soon for live input tracks',
      }),

    setTempo: (tempo) => {
      set((state) => ({
        transport: { ...state.transport, tempo },
        saveStatus: 'dirty',
        lastAction: `Tempo set to ${tempo} BPM`,
      }))
      configureAudioTransport()
    },

    setTimeSignature: (timeSignature) => {
      set((state) => ({
        transport: { ...state.transport, timeSignature },
        clockBeatsPerBar: getBeatsPerBar(timeSignature),
        saveStatus: 'dirty',
        lastAction: `Time signature set to ${timeSignature}`,
      }))
      configureAudioTransport()
    },

    setQuantize: (quantize) => {
      set((state) => {
        const beatsPerBar = getBeatsPerBar(state.transport.timeSignature)
        const quantizeBeats = getQuantizeBeats(quantize, beatsPerBar)

        return {
          transport: { ...state.transport, quantize },
          clockQuantizeBeats: Math.max(1, quantizeBeats || beatsPerBar),
          saveStatus: 'dirty',
          lastAction: `Quantize set to ${quantize}`,
        }
      })
      configureAudioTransport()
    },

    setKey: (key) =>
      set((state) => ({
        transport: { ...state.transport, key },
        saveStatus: 'dirty',
        lastAction: `Project key set to ${key}`,
      })),

    setScale: (scale) =>
      set((state) => ({
        transport: { ...state.transport, scale },
        saveStatus: 'dirty',
        lastAction: `Scale set to ${scale}`,
      })),

    setBrowserQuery: (query) => set({ browserQuery: query }),

    setActivePack: (pack) =>
      set((state) => ({
        activePack: pack,
        autoFillSettings: {
          ...state.autoFillSettings,
          sourceScope: pack ? 'selectedPack' : state.autoFillSettings.sourceScope,
        },
        autoFillResolvedSource: pack ? `Selected Bank: ${pack}` : state.autoFillResolvedSource,
        autoFillResolvedSourceReason: pack
          ? 'Using the selected pack as the current source context.'
          : state.autoFillResolvedSourceReason,
        saveStatus: 'dirty',
        lastAction: pack ? `Selected pack: ${pack}` : 'Pack filter cleared',
      })),

    setActiveCategoryFilter: (category) =>
      set({
        activeCategoryFilter: category,
        lastAction: category ? `Category filter: ${category}` : 'Category filter cleared',
      }),

    setActiveBpmFilter: (bpm) =>
      set({
        activeBpmFilter: bpm,
        lastAction: bpm !== null ? `BPM filter: ${bpm}` : 'BPM filter cleared',
      }),

    setActiveKeyFilter: (key) =>
      set({
        activeKeyFilter: key ? normalizeKey(key) ?? key : null,
        lastAction: key ? `Key filter: ${key}` : 'Key filter cleared',
      }),

    setActiveTypeFilter: (type) =>
      set({
        activeTypeFilter: type,
        lastAction: type ? `Type filter: ${type}` : 'Type filter cleared',
      }),

    clearLibraryFilters: () =>
      set({
        activePack: null,
        activeCategoryFilter: null,
        activeBpmFilter: null,
        activeKeyFilter: null,
        activeTypeFilter: null,
        browserQuery: '',
        saveStatus: 'dirty',
        lastAction: 'Library filters cleared',
      }),

    toggleExplorerGroup: (group) =>
      set((state) => ({
        explorerGroupsOpen: {
          ...state.explorerGroupsOpen,
          [group]: !state.explorerGroupsOpen[group],
        },
      })),

    selectBrowserFile: (sampleId) => {
      const state = get()
      set({ selectedSampleId: sampleId })

      if (state.previewingSampleId === sampleId) {
        stopPreviewInternal()
        set({
          previewingSampleId: null,
          previewingFilename: null,
          lastAction: 'Sample preview stopped',
        })
        return
      }

      void startPreviewInternal(sampleId)
    },

    analyzeKeyForSample: async (sampleId) => {
      const sample = get().samples.find((item) => item.id === sampleId)
      if (!sample) {
        set({ lastAction: 'Analyze key skipped: sample not found' })
        return
      }

      try {
        const response = await apiAnalyzeSampleKey(sampleId)
        if (!response.available) {
          set({
            lastAction: response.message,
          })
          return
        }

        set({
          lastAction: `Key analysis result: ${response.normalizedKey ?? 'Unknown'}`,
        })
      } catch (error) {
        set({
          errorMessage: error instanceof Error ? error.message : 'Analyze key failed',
          lastAction: 'Analyze key failed',
        })
      }
    },

    setSampleManualKey: async (sampleId, manualKey) => {
      const state = get()
      const sample = state.samples.find((item) => item.id === sampleId)
      if (!sample) {
        set({ lastAction: 'Set key skipped: sample not found' })
        return
      }

      const isKnownMusicalKey =
        manualKey === null ||
        manualKey === 'UNKNOWN' ||
        ALL_MUSICAL_KEYS.includes(manualKey as (typeof ALL_MUSICAL_KEYS)[number])

      if (!isKnownMusicalKey) {
        set({ lastAction: 'Invalid key value for manual override' })
        return
      }

      const overrideKey = normalizeOverridePath(sample.relativePath)
      const existingOverride = state.sampleOverrides[overrideKey] ?? {
        manualKey: null,
        manualBpm: null,
        excluded: sample.excluded,
        notes: '',
      }

      const normalizedManualKey =
        manualKey && manualKey !== 'UNKNOWN' ? normalizeKey(manualKey) : null
      const parsedManualKey = normalizedManualKey ? parseKey(normalizedManualKey) : null

      try {
        const result = await apiUpsertSampleOverride({
          relativePath: sample.relativePath,
          manualKey: manualKey,
          manualBpm: existingOverride.manualBpm,
          excluded: existingOverride.excluded,
          notes: existingOverride.notes,
        })

        set((current) => {
          const nextOverrides = { ...current.sampleOverrides }
          if (result.override) {
            nextOverrides[overrideKey] = result.override
          } else {
            delete nextOverrides[overrideKey]
          }

          const patch: Partial<SampleRecord> = parsedManualKey
            ? {
                key: parsedManualKey.normalizedKey,
                parsedKey: parsedManualKey.normalizedKey,
                normalizedKey: parsedManualKey.normalizedKey,
                keySource: 'manual',
                keyConfidence: 'high',
              }
            : {
                key: null,
                parsedKey: null,
                normalizedKey: null,
                keySource: 'manual',
                keyConfidence: 'high',
              }

          const next = applySamplePatchAcrossState(current, sampleId, patch)

          return {
            ...next,
            sampleOverrides: nextOverrides,
            saveStatus: 'dirty',
            lastAction: parsedManualKey
              ? `Manual key set: ${sample.filename} -> ${parsedManualKey.normalizedKey}`
              : `Manual key set: ${sample.filename} -> Unknown`,
          }
        })
      } catch (error) {
        set({
          errorMessage: error instanceof Error ? error.message : 'Set manual key failed',
          lastAction: 'Set manual key failed',
        })
      }
    },

    markSampleKeyUnknown: async (sampleId) => {
      await get().setSampleManualKey(sampleId, 'UNKNOWN')
    },

    setSampleAsProjectKey: (sampleId) => {
      const sample = get().samples.find((item) => item.id === sampleId)
      if (!sample) {
        return
      }

      const parsed = parseKey(sample.normalizedKey ?? sample.key)
      if (!parsed) {
        set({ lastAction: 'Cannot use unknown key as project key' })
        return
      }

      set((state) => ({
        transport: {
          ...state.transport,
          key: parsed.canonicalTonic,
          scale: parsed.mode,
        },
        saveStatus: 'dirty',
        lastAction: `Project key set from sample: ${parsed.normalizedKey}`,
      }))
    },

    toggleSampleExcludedInAutoFill: async (sampleId, excluded) => {
      const state = get()
      const sample = state.samples.find((item) => item.id === sampleId)
      if (!sample) {
        return
      }

      const overrideKey = normalizeOverridePath(sample.relativePath)
      const existingOverride = state.sampleOverrides[overrideKey] ?? {
        manualKey: sample.keySource === 'manual' ? sample.normalizedKey : null,
        manualBpm: sample.bpmSource === 'manual' ? sample.bpm : null,
        excluded: sample.excluded,
        notes: '',
      }

      try {
        const result = await apiUpsertSampleOverride({
          relativePath: sample.relativePath,
          manualKey: existingOverride.manualKey,
          manualBpm: existingOverride.manualBpm,
          excluded,
          notes: existingOverride.notes,
        })

        set((current) => {
          const nextOverrides = { ...current.sampleOverrides }
          if (result.override) {
            nextOverrides[overrideKey] = result.override
          } else {
            delete nextOverrides[overrideKey]
          }

          const next = applySamplePatchAcrossState(current, sampleId, { excluded })

          return {
            ...next,
            sampleOverrides: nextOverrides,
            saveStatus: 'dirty',
            lastAction: excluded
              ? `Excluded from Auto Fill: ${sample.filename}`
              : `Included in Auto Fill: ${sample.filename}`,
          }
        })
      } catch (error) {
        set({
          errorMessage: error instanceof Error ? error.message : 'Update exclusion failed',
          lastAction: 'Update exclusion failed',
        })
      }
    },

    showSampleMetadata: (sampleId) => {
      const sample = get().samples.find((item) => item.id === sampleId)
      if (!sample) {
        return
      }

      const keyLabel = sample.normalizedKey ?? 'Unknown'
      const bpmLabel = sample.bpm ?? '--'
      set({
        lastAction: `Metadata: ${sample.filename} | ${bpmLabel} BPM | ${keyLabel} | ${sample.type}`,
      })
    },

    toggleSelectedSamplePreview: async () => {
      const { selectedSampleId, previewingSampleId } = get()
      if (!selectedSampleId) {
        set({ lastAction: 'No sample selected for preview.' })
        return
      }

      if (previewingSampleId === selectedSampleId) {
        stopPreviewInternal()
        set({
          previewingSampleId: null,
          previewingFilename: null,
          lastAction: 'Sample preview stopped',
        })
        return
      }

      await startPreviewInternal(selectedSampleId)
    },

    stopSamplePreview: () => {
      stopPreviewInternal()
      set({
        previewingSampleId: null,
        previewingFilename: null,
        lastAction: 'Sample preview stopped',
      })
    },

    assignSampleToClip: async (clipId, sampleId) => {
      await assignPreparedSampleToClipInternal(clipId, sampleId)
    },

    loadSelectedFileToSelectedClip: async () => {
      const state = get()
      const selectedSampleId = state.selectedSampleId
      const selectedClipId = state.selectedClipId

      if (!selectedSampleId || !selectedClipId) {
        set({ lastAction: 'Load skipped: select both a clip and a sample' })
        return
      }

      await assignPreparedSampleToClipInternal(selectedClipId, selectedSampleId)
    },

    loadSampleToSelectedClip: async (sampleId) => {
      set({ selectedSampleId: sampleId })
      await get().loadSelectedFileToSelectedClip()
    },

    setAutoFillSettings: (partial) =>
      set((state) => ({
        autoFillSettings: (() => {
          const merged = {
            ...state.autoFillSettings,
            ...partial,
            bpmTolerance: Math.max(0, Number(partial.bpmTolerance ?? state.autoFillSettings.bpmTolerance)),
          }

          if (partial.keyStrictness === 'strict' && partial.allowUnknownKeySamples === undefined) {
            merged.allowUnknownKeySamples = false
          }

          if (partial.keyStrictness === 'compatible' && partial.allowUnknownKeySamples === undefined) {
            merged.allowUnknownKeySamples = true
          }

          return merged
        })(),
        saveStatus: 'dirty',
      })),

    toggleAutoFillOptions: () =>
      set((state) => ({
        autoFillOptionsOpen: !state.autoFillOptionsOpen,
      })),

    applyLayoutPreset: (presetName) => {
      const roleOrder = TRACK_LAYOUT_PRESET_ORDER[presetName]
      clearAllPendingTrackLaunches()
      audioTransport.stopAll()
      const nextTracks = buildTracksFromRoleOrderWithState(get().tracks, roleOrder).map((track) => ({
        ...track,
        playingClipId: null,
        queuedClipId: null,
      }))
      syncTrackMixState(nextTracks)
      set((state) => {
        const applied = applyTrackRoleOrderToState(
          { ...state, tracks: nextTracks } as LaunchBrainState,
          roleOrder,
          presetName,
        )
        return {
          ...applied,
          clipPreparationStatus: buildClipPreparationStatus(applied.clips),
          transportDiagnostics: buildTransportDiagnosticsState(applied.clips, state.lastScheduleError),
          queuedSceneLabel: null,
          saveStatus: 'dirty',
          lastAction: `Layout preset applied: ${presetName}`,
        }
      })
    },

    moveTrackColumnLeft: (trackIndex) => {
      if (trackIndex <= 0) {
        return
      }

      clearAllPendingTrackLaunches()
      audioTransport.stopAll()
      set((state) => {
        const roleOrder = getRoleOrderFromTracks(state.tracks)
        const nextRoleOrder = moveArrayItem(roleOrder, trackIndex, trackIndex - 1)
        const nextTracks = buildTracksFromRoleOrderWithState(state.tracks, nextRoleOrder).map((track) => ({
          ...track,
          playingClipId: null,
          queuedClipId: null,
        }))
        syncTrackMixState(nextTracks)
        const applied = applyTrackRoleOrderToState({ ...state, tracks: nextTracks } as LaunchBrainState, nextRoleOrder)
        return {
          ...applied,
          clipPreparationStatus: buildClipPreparationStatus(applied.clips),
          transportDiagnostics: buildTransportDiagnosticsState(applied.clips, state.lastScheduleError),
          queuedSceneLabel: null,
          saveStatus: 'dirty',
          lastAction: `Moved column left: ${getTrackLabel(state.tracks, trackIndex)}`,
        }
      })
    },

    moveTrackColumnRight: (trackIndex) => {
      const maxIndex = get().tracks.length - 1
      if (trackIndex >= maxIndex) {
        return
      }

      clearAllPendingTrackLaunches()
      audioTransport.stopAll()
      set((state) => {
        const roleOrder = getRoleOrderFromTracks(state.tracks)
        const nextRoleOrder = moveArrayItem(roleOrder, trackIndex, trackIndex + 1)
        const nextTracks = buildTracksFromRoleOrderWithState(state.tracks, nextRoleOrder).map((track) => ({
          ...track,
          playingClipId: null,
          queuedClipId: null,
        }))
        syncTrackMixState(nextTracks)
        const applied = applyTrackRoleOrderToState({ ...state, tracks: nextTracks } as LaunchBrainState, nextRoleOrder)
        return {
          ...applied,
          clipPreparationStatus: buildClipPreparationStatus(applied.clips),
          transportDiagnostics: buildTransportDiagnosticsState(applied.clips, state.lastScheduleError),
          queuedSceneLabel: null,
          saveStatus: 'dirty',
          lastAction: `Moved column right: ${getTrackLabel(state.tracks, trackIndex)}`,
        }
      })
    },

    resetTrackOrder: () => {
      clearAllPendingTrackLaunches()
      audioTransport.stopAll()
      set((state) => {
        const nextTracks = buildTracksFromRoleOrderWithState(state.tracks, [...DEFAULT_ROLE_ORDER]).map((track) => ({
          ...track,
          playingClipId: null,
          queuedClipId: null,
        }))
        syncTrackMixState(nextTracks)
        const applied = applyTrackRoleOrderToState(
          { ...state, tracks: nextTracks } as LaunchBrainState,
          [...DEFAULT_ROLE_ORDER],
          DEFAULT_LAYOUT_PRESET,
        )
        return {
          ...applied,
          clipPreparationStatus: buildClipPreparationStatus(applied.clips),
          transportDiagnostics: buildTransportDiagnosticsState(applied.clips, state.lastScheduleError),
          queuedSceneLabel: null,
          saveStatus: 'dirty',
          lastAction: 'Column order reset to Classic',
        }
      })
    },

    autoFillGrid: async () => {
      const state = get()
      if (state.samples.length === 0) {
        set({ lastAction: 'Auto Fill Grid skipped: no scanned samples' })
        return
      }

      clearAllPendingTrackLaunches()
      audioTransport.stopAll()
      clipPreloadQueue = []
      clipPreloadQueuedKeys.clear()

      const settings = state.autoFillSettings
      const source = resolveAutoFillSource(state.samples, state.tracks, state.activePack, settings.sourceScope)
      const sourceSamples = source.sourceSamples.length > 0 ? source.sourceSamples : state.samples
      const chosenPack = source.chosenPack
      const coverageLabel = getCoverageLabel(sourceSamples, state.tracks)
      const inferredBpm = settings.targetBpm ?? inferMostCommonBpm(sourceSamples)
      const inferredKey = resolveActiveHarmonicTargetKey(
        settings.targetKey,
        state.activeKeyFilter,
        state.transport,
        sourceSamples,
      )

      const usedRelativePaths = new Set<string>()
      const usedSampleFamilies = new Set<string>()
      const nextClips: ClipSlot[] = []

      for (const clip of state.clips) {
        const track = state.tracks[clip.trackIndex]
        if (!track) {
          nextClips.push(emptyClip(clip))
          continue
        }

        let candidates = sourceSamples.filter((sample) => !sample.excluded && isRoleCategoryMatch(sample, track))

        if (settings.allowOneShotsInFXOnly && track.role !== 'fx') {
          candidates = candidates.filter((sample) => sample.type !== 'one-shot')
        }

        if (!track.allowOneShots) {
          candidates = candidates.filter((sample) => sample.type !== 'one-shot')
        }

        if (settings.preferLoops) {
          const loopCandidates = candidates.filter((sample) => isLoopLike(sample.type))
          if (loopCandidates.length > 0) {
            candidates = loopCandidates
          }
        }

        const ranked = candidates
          .map((sample) => ({
            sample,
            score: scoreSampleCandidate(
              sample,
              track,
              chosenPack,
              inferredBpm,
              inferredKey,
              settings,
              usedRelativePaths,
              usedSampleFamilies,
            ),
          }))
          .filter((entry) => Number.isFinite(entry.score))
          .sort((left, right) => right.score - left.score)

        const selectedEntry =
          settings.allowDuplicates && ranked.length > 0
            ? ranked[clip.sceneIndex % ranked.length]
            : ranked[0]

        const selected = selectedEntry?.sample
        if (!selected) {
          nextClips.push(emptyClip(clip))
          continue
        }

        if (!settings.allowDuplicates) {
          usedRelativePaths.add(selected.relativePath)
          usedSampleFamilies.add(getSampleFamilyKey(selected))
        }

        const effectiveBpm = getSampleEffectiveBpm(selected, inferredBpm ?? null)
        const enrichedSample: SampleRecord = {
          ...selected,
          bpm: selected.bpm ?? effectiveBpm.bpm,
          detectedBpm: selected.detectedBpm ?? effectiveBpm.bpm,
          bpmSource:
            selected.detectedBpm !== null || selected.bpm !== null
              ? selected.bpmSource
              : effectiveBpm.source,
          syncStatus:
            selected.detectedBpm !== null || selected.bpm !== null
              ? selected.syncStatus
              : effectiveBpm.bpm !== null
                ? 'length_uncertain'
                : 'bpm_missing',
        }

        const trackColor = state.tracks[clip.trackIndex]?.color ?? '#64748b'
        nextClips.push({
          ...applySampleToClip(clip, enrichedSample, trackColor),
          preparationState: 'unloaded',
          preparationError: null,
        })
      }

      const rolesWithoutMatches = state.tracks
        .filter((track) => !nextClips.some((clip) => clip.trackIndex === track.index && clip.filled))
        .map((track) => track.label)

      const packBpmCounts = new Map<number, number>()
      for (const sample of sourceSamples) {
        const bpmValue = sample.detectedBpm ?? sample.bpm
        if (bpmValue !== null) {
          packBpmCounts.set(bpmValue, (packBpmCounts.get(bpmValue) ?? 0) + 1)
        }
      }
      const commonBpm =
        [...packBpmCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? inferredBpm
      const coveredRoles = state.tracks.filter((track) =>
        sourceSamples.some((sample) => isRoleCategoryMatch(sample, track)),
      ).length
      const usableLoopCount = sourceSamples.filter(
        (sample) => isLoopLike(sample.type) && isMediumOrHighCategory(sample),
      ).length
      const resolvedReason =
        settings.sourceScope === 'autoBestPack' && chosenPack
          ? `Auto-selected because it has ${coveredRoles}/${state.tracks.length} roles covered, common BPM ${commonBpm ?? '--'}${inferredKey ? `, key match ${inferredKey}` : ''}, usable loops ${usableLoopCount}.`
          : source.sourceReason

      set({
        clips: nextClips,
        missingFilesCount: 0,
        queuedSceneLabel: null,
        autoFillResolvedSource: source.sourceLabel,
        autoFillResolvedSourceReason: resolvedReason,
        autoFillResolvedKey: inferredKey,
        autoFillCoverageLabel: coverageLabel,
        clipPreparationStatus: settings.preloadGridClips ? buildClipPreparationStatus(nextClips) : null,
        transportDiagnostics: buildTransportDiagnosticsState(nextClips, state.lastScheduleError),
        saveStatus: 'dirty',
        lastAction:
          rolesWithoutMatches.length > 0
            ? `Auto Fill complete. No suitable loops found for: ${rolesWithoutMatches.join(', ')}.`
            : `Auto Fill complete (${source.sourceLabel})${inferredBpm ? ` @ ${inferredBpm} BPM` : ''}${inferredKey ? `, ${inferredKey}` : ''}`,
        playbackEngineStatus: 'Browser playback engine',
      })

      if (settings.preloadGridClips) {
        enqueuePreparationForFilledClips(nextClips)
      }
    },

    selectClip: (clipId) =>
      set((state) => {
        const selected = state.clips.find((clip) => clip.id === clipId)
        if (!selected) {
          return state
        }

        return {
          selectedClipId: clipId,
          selectedSampleId: selected.sampleId ?? state.selectedSampleId,
          tracks: state.tracks.map((track) => ({
            ...track,
            selected: track.index === selected.trackIndex,
          })),
          lastAction: `Selected clip ${selected.sceneIndex + 1}.${selected.trackIndex + 1}`,
        }
      }),

    toggleClipPlayback: async (clipId) => {
      const state = get()
      const clip = state.clips.find((item) => item.id === clipId)
      if (!clip || !clip.filled || !clip.sampleId) {
        set({ lastAction: 'Playback unavailable on empty clip.' })
        return
      }

      const quantizeNone = state.transport.quantize === 'None'
      if (quantizeNone) {
        if (clip.playing) {
          stopClipNow(clip, `Stopped: ${truncateStatusLabel(clip.clipName ?? clip.id)}`)
          return
        }

        await startClipNow(clip.id)
        return
      }

      await ensureTransportForQueuedLaunch()
      const boundaryTime = audioTransport.getNextBoundaryTime()

      if (clip.launchState === 'queued') {
        audioTransport.cancelQueuedTrackActions(clip.trackIndex)
        clearPendingTrackLaunch(clip.trackIndex, clip.id)
        set((current) => ({
          clips: current.clips.map((item) =>
            item.trackIndex === clip.trackIndex
              ? {
                  ...item,
                  launchState: item.playing ? 'playing' : item.filled ? 'stopped' : 'empty',
                }
              : item,
          ),
          lastAction: `Clip queue canceled: ${clip.clipName ?? clip.id}`,
        }))
        return
      }

      if (clip.playing || clip.launchState === 'stopping') {
        await audioTransport.queueClipStop(
          {
            clipId: clip.id,
            trackIndex: clip.trackIndex,
            filename: clip.clipName,
          },
          boundaryTime,
        )

        set((current) => ({
          clips: current.clips.map((item) =>
            item.id === clip.id
              ? {
                  ...item,
                  launchState: 'stopping',
                }
              : item,
          ),
          lastAction: `Clip queued to stop: ${clip.clipName ?? clip.id}`,
        }))
        return
      }

      queueTrackSwitch(clip.trackIndex, clip.id, boundaryTime)
    },

    launchScene: async (sceneIndex) => {
      const state = get()
      const scene = state.scenes.find((item) => item.index === sceneIndex)
      const sceneClips = state.clips.filter((clip) => clip.sceneIndex === sceneIndex && clip.filled)
      if (sceneClips.length === 0) {
        set({ lastAction: `Scene ${scene?.label ?? sceneIndex + 1} has no filled clips` })
        return
      }

      const readySceneClips = sceneClips.filter((clip) => clip.preparationState === 'ready')
      const unreadySceneClips = sceneClips.filter((clip) => clip.preparationState !== 'ready')
      for (const clip of unreadySceneClips) {
        if (clip.sampleId && clip.preparationState === 'unloaded') {
          enqueueClipPreparation(clip.id, clip.sampleId, true)
        }
        setPendingTrackLaunch(clip.trackIndex, clip.id, scene?.label ?? `Scene ${sceneIndex + 1}`)
      }

      if (state.transport.quantize === 'None') {
        if (readySceneClips.length === 0) {
          set({ lastAction: `Scene ${scene?.label ?? sceneIndex + 1} is still loading` })
          return
        }

        await ensureTransportForQueuedLaunch()

        for (const sceneClip of readySceneClips) {
          await startClipNow(sceneClip.id)
        }

        set({
          queuedSceneLabel: null,
          lastAction:
            unreadySceneClips.length > 0
              ? `Scene launched: ${scene?.label ?? sceneIndex + 1} (${unreadySceneClips.length} clips still loading)`
              : `Scene launched: ${scene?.label ?? sceneIndex + 1}`,
        })
        return
      }

      await ensureTransportForQueuedLaunch()
      const boundaryTime = audioTransport.getNextBoundaryTime()

      const sceneClipIds = new Set(sceneClips.map((clip) => clip.id))
      const readySceneTrackIds = new Set(readySceneClips.map((clip) => clip.trackIndex))
      for (const clip of readySceneClips) {
        setPendingTrackLaunch(clip.trackIndex, clip.id, scene?.label ?? `Scene ${sceneIndex + 1}`)
      }
      set((current) => ({
        clips: current.clips.map((clip) => {
          const sceneClip = sceneClipIds.has(clip.id)
          if (!sceneClip && clip.sceneIndex === sceneIndex && !clip.filled) {
            return clip
          }

          if (sceneClip) {
            return {
              ...clip,
              launchState: 'queued',
            }
          }

          const sceneTrackClip = sceneClips.find((item) => item.trackIndex === clip.trackIndex)
          if (!sceneTrackClip) {
            return clip
          }

          if (!readySceneTrackIds.has(clip.trackIndex)) {
            return clip
          }

          if (clip.launchState === 'queued') {
            return {
              ...clip,
              launchState: clip.playing ? 'playing' : clip.filled ? 'stopped' : 'empty',
            }
          }

          return clip
        }),
        queuedSceneLabel: scene?.label ?? `Scene ${sceneIndex + 1}`,
        lastAction:
          unreadySceneClips.length > 0
            ? `Scene queued: ${scene?.label ?? sceneIndex + 1} (${unreadySceneClips.length} clips still loading)`
            : `Scene queued: ${scene?.label ?? sceneIndex + 1}`,
      }))

      for (const track of state.tracks) {
        const rowClip = readySceneClips.find((clip) => clip.trackIndex === track.index)
        if (!rowClip) {
          continue
        }

        audioTransport.cancelQueuedTrackActions(track.index)

        const currentPlaying = state.clips.filter(
          (clip) => clip.trackIndex === track.index && clip.playing && clip.id !== rowClip.id,
        )

        for (const playingClip of currentPlaying) {
          await audioTransport.queueClipStop(
            {
              clipId: playingClip.id,
              trackIndex: playingClip.trackIndex,
              filename: playingClip.clipName,
            },
            boundaryTime,
          )
        }

        const request = buildTransportClipRequest(rowClip)
        if (request) {
          await audioTransport.queueClipStart(request, boundaryTime)
        }
      }
    },

    selectTrack: (trackId) =>
      set((state) => {
        const selectedTrack = state.tracks.find((track) => track.id === trackId)
        return {
          tracks: state.tracks.map((track) => ({
            ...track,
            selected: track.id === trackId,
          })),
          lastAction: `Selected track: ${selectedTrack?.label ?? trackId}`,
        }
      }),

    toggleTrackArm: (trackId) =>
      set((state) => {
        const target = state.tracks.find((track) => track.id === trackId)
        const willArm = !target?.armed
        return {
          tracks: state.tracks.map((track) => ({
            ...track,
            armed: track.id === trackId ? willArm : false,
            selected: track.id === trackId,
          })),
          lastAction: willArm
            ? target?.liveInput
              ? `Armed ${target.label} for future ${target.inputType === 'audio' ? 'audio capture' : 'live input'}`
              : `Armed ${target?.label ?? trackId} for future capture`
            : `Disarmed ${target?.label ?? trackId}`,
        }
      }),

    toggleTrackMute: (trackId) =>
      set((state) => {
        const nextTracks = state.tracks.map((track) =>
          track.id === trackId ? { ...track, muted: !track.muted } : track,
        )
        syncTrackMixState(nextTracks)
        const track = nextTracks.find((entry) => entry.id === trackId)
        return {
          tracks: nextTracks,
          lastAction: track?.muted ? `Muted: ${track.label}` : `Unmuted: ${track?.label ?? trackId}`,
        }
      }),

    toggleTrackSolo: (trackId) =>
      set((state) => {
        const nextTracks = state.tracks.map((track) =>
          track.id === trackId ? { ...track, solo: !track.solo } : track,
        )
        syncTrackMixState(nextTracks)
        const activeSoloCount = nextTracks.filter((track) => track.solo).length
        const track = nextTracks.find((entry) => entry.id === trackId)
        return {
          tracks: nextTracks,
          lastAction:
            track?.solo
              ? `Solo: ${track.label}${activeSoloCount > 1 ? ` (${activeSoloCount} tracks soloed)` : ''}`
              : activeSoloCount > 0
                ? `Solo updated: ${activeSoloCount} tracks soloed`
                : 'Solo cleared',
        }
      }),

    stopTrack: (trackId) => {
      const state = get()
      const track = state.tracks.find((entry) => entry.id === trackId)
      if (!track) {
        return
      }
      const trackIndex = track.index
      const trackLabel = getTrackLabel(state.tracks, trackIndex)
      clearPendingTrackLaunch(trackIndex)

      if (state.transport.quantize === 'None' || !state.transport.isPlaying) {
        stopTrackNow(trackIndex)
        return
      }

      const boundaryTime = audioTransport.getNextBoundaryTime()
      for (const clip of state.clips) {
        if (clip.trackIndex !== trackIndex) {
          continue
        }

        if (clip.launchState === 'queued') {
          audioTransport.cancelQueuedTrackActions(trackIndex)
        }

        if (!clip.playing && clip.launchState !== 'stopping') {
          continue
        }

        void audioTransport.queueClipStop(
          {
            clipId: clip.id,
            trackIndex: clip.trackIndex,
            filename: clip.clipName,
          },
          boundaryTime,
        )
      }

      set((current) => ({
        tracks: current.tracks.map((entry) =>
          entry.index === trackIndex ? { ...entry, queuedClipId: null } : entry,
        ),
        clips: current.clips.map((clip) => {
          if (clip.trackIndex !== trackIndex) {
            return clip
          }

          if (clip.launchState === 'queued') {
            return {
              ...clip,
              launchState: clip.playing ? 'playing' : clip.filled ? 'stopped' : 'empty',
            }
          }

          if (clip.playing || clip.launchState === 'stopping') {
            return {
              ...clip,
              launchState: 'stopping',
            }
          }

          return clip
        }),
        lastAction: `Clip queued to stop: ${trackLabel}`,
      }))
    },

    setInspectorTab: (tab) =>
      set({
        inspectorTab: tab,
      }),

    openInspectorTab: (tab) =>
      set({
        inspectorTab: tab,
        inspectorOpen: true,
      }),

    toggleInspector: () =>
      set((state) => ({
        inspectorOpen: !state.inspectorOpen,
      })),

    clearClip: (clipId) => {
      const clip = get().clips.find((item) => item.id === clipId)
      if (!clip) {
        return
      }

      const clipName = clip.clipName ?? `Clip ${clip.sceneIndex + 1}.${clip.trackIndex + 1}`
      clearClipByIdInternal(clipId)
      set({ lastAction: `Cleared clip: ${clipName}` })
    },

    clearSelectedClip: () => {
      const selectedClipId = get().selectedClipId
      get().clearClip(selectedClipId)
    },

    clearRow: (sceneIndex) => {
      const state = get()
      const snapshot = createClearSnapshot(state, 'Undo clear row')
      const rowLabel = state.scenes.find((scene) => scene.index === sceneIndex)?.label ?? `Row ${sceneIndex + 1}`
      const rowClips = state.clips.filter((clip) => clip.sceneIndex === sceneIndex)
      for (const clip of rowClips) {
        clearPendingTrackLaunch(clip.trackIndex, clip.id)
        if (!clip.playing) {
          continue
        }
        void audioTransport.queueClipStop(
          {
            clipId: clip.id,
            trackIndex: clip.trackIndex,
            filename: clip.clipName,
          },
          audioTransport.getNextBoundaryTime('None'),
        )
      }

      const nextClips = state.clips.map((clip) => (clip.sceneIndex === sceneIndex ? emptyClip(clip) : clip))
      set({
        clips: nextClips,
        clipPreparationStatus: buildClipPreparationStatus(nextClips),
        transportDiagnostics: buildTransportDiagnosticsState(nextClips, state.lastScheduleError),
        missingFilesCount: nextClips.filter((clip) => clip.filled && clip.missingFile).length,
        lastClearSnapshot: snapshot,
        canUndoClear: true,
        saveStatus: 'dirty',
        lastAction: `Cleared row: ${rowLabel}`,
      })
    },

    clearColumn: (trackIndex) => {
      const state = get()
      const snapshot = createClearSnapshot(state, 'Undo clear column')
      const columnLabel = getTrackLabel(state.tracks, trackIndex)
      const columnClips = state.clips.filter((clip) => clip.trackIndex === trackIndex)
      clearPendingTrackLaunch(trackIndex)
      for (const clip of columnClips) {
        if (!clip.playing) {
          continue
        }
        void audioTransport.queueClipStop(
          {
            clipId: clip.id,
            trackIndex: clip.trackIndex,
            filename: clip.clipName,
          },
          audioTransport.getNextBoundaryTime('None'),
        )
      }

      const nextClips = state.clips.map((clip) => (clip.trackIndex === trackIndex ? emptyClip(clip) : clip))
      set({
        clips: nextClips,
        clipPreparationStatus: buildClipPreparationStatus(nextClips),
        transportDiagnostics: buildTransportDiagnosticsState(nextClips, state.lastScheduleError),
        missingFilesCount: nextClips.filter((clip) => clip.filled && clip.missingFile).length,
        lastClearSnapshot: snapshot,
        canUndoClear: true,
        saveStatus: 'dirty',
        lastAction: `Cleared column: ${columnLabel}`,
      })
    },

    clearAllGrid: () => {
      const state = get()
      const snapshot = createClearSnapshot(state, 'Undo clear all')
      clearAllPendingTrackLaunches()
      audioTransport.stopAll()

      const nextClips = state.clips.map((clip) => emptyClip(clip))
      set({
        clips: nextClips,
        clipPreparationStatus: null,
        transportDiagnostics: buildTransportDiagnosticsState(nextClips, state.lastScheduleError),
        missingFilesCount: 0,
        lastClearSnapshot: snapshot,
        canUndoClear: true,
        saveStatus: 'dirty',
        lastAction: 'Cleared all clips',
      })
    },

    removeMissingClips: () => {
      const state = get()
      const missingIds = state.clips.filter((clip) => clip.filled && clip.missingFile).map((clip) => clip.id)
      if (missingIds.length === 0) {
        set({ lastAction: 'No missing clips to remove' })
        return
      }

      const snapshot = createClearSnapshot(state, 'Undo remove missing clips')
      for (const clipId of missingIds) {
        const clip = state.clips.find((item) => item.id === clipId)
        if (!clip || !clip.playing) {
          continue
        }

        void audioTransport.queueClipStop(
          {
            clipId: clip.id,
            trackIndex: clip.trackIndex,
            filename: clip.clipName,
          },
          audioTransport.getNextBoundaryTime('None'),
        )
      }

      const missingSet = new Set(missingIds)
      const nextClips = state.clips.map((clip) => (missingSet.has(clip.id) ? emptyClip(clip) : clip))
      set({
        clips: nextClips,
        clipPreparationStatus: buildClipPreparationStatus(nextClips),
        transportDiagnostics: buildTransportDiagnosticsState(nextClips, state.lastScheduleError),
        missingFilesCount: 0,
        lastClearSnapshot: snapshot,
        canUndoClear: true,
        saveStatus: 'dirty',
        lastAction: `Removed missing clips: ${missingIds.length}`,
      })
    },

    undoLastClear: () => {
      const snapshot = get().lastClearSnapshot
      if (!snapshot) {
        set({ lastAction: 'Nothing to undo' })
        return
      }

      for (const clip of get().clips) {
        if (!clip.playing) {
          continue
        }
        void audioTransport.queueClipStop(
          {
            clipId: clip.id,
            trackIndex: clip.trackIndex,
            filename: clip.clipName,
          },
          audioTransport.getNextBoundaryTime('None'),
        )
      }

      set({
        clips: snapshot.clips.map((clip) => ({ ...clip })),
        clipPreparationStatus: buildClipPreparationStatus(snapshot.clips),
        transportDiagnostics: buildTransportDiagnosticsState(snapshot.clips, get().lastScheduleError),
        missingFilesCount: snapshot.missingFilesCount,
        lastClearSnapshot: null,
        canUndoClear: false,
        saveStatus: 'dirty',
        lastAction: 'Undo clear applied',
      })
      enqueuePreparationForFilledClips(snapshot.clips)
    },

    setAssistantInput: (value) => set({ assistantInput: value }),

    submitAssistantPrompt: () => {
      const { assistantInput, assistantMessages } = get()
      const prompt = assistantInput.trim()

      if (!prompt) {
        return
      }

      set({
        assistantMessages: [
          ...assistantMessages,
          { id: `msg-${Date.now()}-user`, role: 'user', content: prompt },
          {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content:
              'AI actions are coming soon. Local helper actions are available right now.',
          },
        ],
        assistantInput: '',
        lastAction: 'Assistant prompt submitted in local preview mode',
      })
    },

    runAssistantQuickAction: (action) => {
      if (action === 'Auto Group' || action === 'Suggest Layout' || action === 'Build Scene') {
        void get().autoFillGrid()
      }

      const { assistantMessages } = get()
      set({
        assistantMessages: [
          ...assistantMessages,
          {
            id: `msg-${Date.now()}-assistant`,
            role: 'assistant',
            content: `Executed "${action}" in local mode.`,
          },
        ],
        lastAction: `Assistant quick action: ${action}`,
      })
    },
  }
})
