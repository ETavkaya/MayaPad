import { create } from 'zustand'
import {
  createDefaultScenes,
  createDefaultTracks,
  createEmptyClips,
  DEFAULT_ASSISTANT_MESSAGES,
  DEFAULT_DEVICES,
  DEFAULT_TRANSPORT,
  TRACK_LABELS,
} from '../data/uiDefaults'
import {
  getConfig,
  getDevices,
  getFilesystemFolderList,
  getFilesystemRoots,
  loadSession as apiLoadSession,
  listSessions as apiListSessions,
  getSampleIndex,
  getSampleStreamUrl,
  scanSamples,
  saveSession as apiSaveSession,
  setSampleRoot,
} from '../services/api'
import { audioTransport, type TransportClipRequest } from '../services/audioTransport'
import type {
  AppConfig,
  AssistantMessage,
  AutoFillSettings,
  BrowserCategory,
  ClipSlot,
  DeviceSnapshot,
  FsFolderEntry,
  FsRootEntry,
  InspectorTab,
  SavedSessionSummary,
  SampleRecord,
  SampleType,
  Scene,
  SessionManifest,
  Track,
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
  autoFillResolvedSource: string
  clockProgress: number
  clockBeatInBar: number
  clockBeatInCycle: number
  clockBeatsPerBar: number
  clockQuantizeBeats: number
  queuedSceneLabel: string | null
  autoFillCoverageLabel: string
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
  toggleSelectedSamplePreview: () => Promise<void>
  stopSamplePreview: () => void
  assignSampleToClip: (clipId: string, sampleId: string) => void
  loadSelectedFileToSelectedClip: () => void
  loadSampleToSelectedClip: (sampleId: string) => void
  setAutoFillSettings: (partial: Partial<AutoFillSettings>) => void
  toggleAutoFillOptions: () => void
  autoFillGrid: () => void
  selectClip: (clipId: string) => void
  toggleClipPlayback: (clipId: string) => Promise<void>
  launchScene: (sceneIndex: number) => Promise<void>
  selectTrack: (trackId: string) => void
  toggleTrackArm: (trackId: string) => void
  toggleTrackMute: (trackId: string) => void
  toggleTrackSolo: (trackId: string) => void
  stopTrack: (trackIndex: number) => void
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

const TRACK_CATEGORY_MAP = [
  'Drums',
  'Hats / Perc',
  'Bass',
  'Instrument / Chord',
  'Melody',
  'Guitar / Texture',
  'Vocal',
  'FX',
] as const

const LOOP_CONFIDENCE_WEIGHT = {
  high: 3,
  medium: 2,
  low: 1,
}

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'B#': 0,
  'C#': 1,
  DB: 1,
  D: 2,
  'D#': 3,
  EB: 3,
  E: 4,
  FB: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  GB: 6,
  G: 7,
  'G#': 8,
  AB: 8,
  A: 9,
  'A#': 10,
  BB: 10,
  B: 11,
  CB: 11,
}

const DEFAULT_AUTO_FILL_SETTINGS: AutoFillSettings = {
  sourceScope: 'autoBestPack',
  targetBpm: null,
  bpmTolerance: 3,
  targetKey: null,
  keyStrictness: 'compatible',
  preferLoops: true,
  allowOneShotsInFXOnly: true,
  preferSameFolder: true,
}

const IMMEDIATE_STOP_MESSAGE = 'Clip stopped: all clips'

let previewAudio: HTMLAudioElement | null = null
let previewSampleId: string | null = null
let unsubscribeAudioTransport: (() => void) | null = null

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

function normalizeNote(note: string) {
  return note.trim().toUpperCase()
}

function parseKey(input: string | null) {
  if (!input) {
    return null
  }

  const noteMatch = input.match(/\b([A-G](?:#|b)?)\b/i)
  if (!noteMatch) {
    return null
  }

  const note = normalizeNote(noteMatch[1]).replace('B', 'B')
  const modeMatch = input.match(/\b(major|minor|maj|min)\b/i)
  const mode = modeMatch
    ? modeMatch[1].toLowerCase().startsWith('min')
      ? 'Minor'
      : 'Major'
    : null

  return { note, mode }
}

function semitoneDistance(left: string, right: string) {
  const leftSemitone = NOTE_TO_SEMITONE[left]
  const rightSemitone = NOTE_TO_SEMITONE[right]

  if (leftSemitone === undefined || rightSemitone === undefined) {
    return null
  }

  const diff = Math.abs(leftSemitone - rightSemitone)
  return Math.min(diff, 12 - diff)
}

function getKeyCompatibility(sampleKey: string | null, targetKey: string | null) {
  const parsedSample = parseKey(sampleKey)
  const parsedTarget = parseKey(targetKey)

  if (!parsedSample || !parsedTarget) {
    return 0
  }

  if (parsedSample.note === parsedTarget.note) {
    if (parsedSample.mode && parsedTarget.mode && parsedSample.mode === parsedTarget.mode) {
      return 1
    }

    return 0.8
  }

  const distance = semitoneDistance(parsedSample.note, parsedTarget.note)
  if (distance === null) {
    return 0
  }

  if (distance === 5 || distance === 7) {
    return 0.55
  }

  if (distance === 3 || distance === 4 || distance === 8 || distance === 9) {
    return 0.45
  }

  return 0
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
    if (!sample.key) {
      continue
    }

    counts.set(sample.key, (counts.get(sample.key) ?? 0) + 1)
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
    type: sample.type,
    bpm: sample.bpm,
    detectedBpm: sample.detectedBpm ?? sample.bpm,
    bpmSource: sample.bpmSource ?? (sample.bpm !== null ? 'filename' : 'unknown'),
    key: sample.key,
    absolutePath: sample.absolutePath,
    relativePath: sample.relativePath,
    durationSeconds: sample.durationSeconds ?? null,
    estimatedBeats: sample.estimatedBeats ?? null,
    beatsLength: sample.beatsLength ?? null,
    syncStatus: sample.syncStatus ?? 'unsupported',
    playbackRate: sample.playbackRate ?? null,
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

function getCategoryTargets(trackIndex: number): string[] {
  return [TRACK_CATEGORY_MAP[trackIndex]]
}

function computePackCoverage(samples: SampleRecord[]) {
  const coverageByPack = new Map<string, Set<string>>()

  for (const sample of samples) {
    const pack = getSamplePack(sample)
    if (!coverageByPack.has(pack)) {
      coverageByPack.set(pack, new Set())
    }

    const set = coverageByPack.get(pack)
    if (!set) {
      continue
    }

    for (const target of TRACK_CATEGORY_MAP) {
      if (sample.category === target) {
        set.add(target)
      }
    }

    if (sample.category === 'Drums') {
      set.add('Hats / Perc')
    }
  }

  let bestPack: string | null = null
  let bestScore = -1

  for (const [pack, categories] of coverageByPack.entries()) {
    const score = categories.size
    if (score > bestScore) {
      bestPack = pack
      bestScore = score
    }
  }

  return bestPack
}

function scoreSampleCandidate(
  sample: SampleRecord,
  trackIndex: number,
  preferredPack: string | null,
  targetBpm: number | null,
  targetKey: string | null,
  settings: AutoFillSettings,
) {
  let score = 0
  const categoryTargets = getCategoryTargets(trackIndex)
  const samplePack = getSamplePack(sample)
  const isFxTrack = trackIndex === 7

  if (categoryTargets.includes(sample.category)) {
    score += 36
  } else if (sample.category === 'Uncategorized') {
    score += 4
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
    score -= 10
  }

  const keyCompatibility = getKeyCompatibility(sample.key, targetKey)

  if (targetKey && sample.key) {
    if (keyCompatibility >= 1) {
      score += 14
    } else if (keyCompatibility >= 0.55) {
      score += 8
    } else if (settings.keyStrictness === 'strict') {
      score -= 40
    } else if (settings.keyStrictness === 'compatible') {
      score -= 8
    }
  }

  if (settings.preferLoops) {
    if (isLoopLike(sample.type)) {
      score += 12
    } else {
      score -= isFxTrack ? 3 : 20
    }
  }

  if (settings.allowOneShotsInFXOnly && !isFxTrack && sample.type === 'one-shot') {
    score -= 35
  }

  score += (LOOP_CONFIDENCE_WEIGHT[sample.loopConfidence] ?? 0) * 2

  return score
}

function getCoverageLabel(samples: SampleRecord[]) {
  const categories = new Set(samples.map((sample) => sample.category))
  const nonRhythmCategories = ['Bass', 'Instrument / Chord', 'Melody', 'Guitar / Texture', 'Vocal']
  const nonRhythmHits = nonRhythmCategories.filter((category) => categories.has(category)).length

  const hasDrums = categories.has('Drums')
  const hasPerc = categories.has('Hats / Perc')

  if ((hasDrums || hasPerc) && nonRhythmHits === 0) {
    return 'Drums only'
  }

  const trackCoverage = TRACK_CATEGORY_MAP.filter((category) => categories.has(category)).length
  if (trackCoverage >= 6) {
    return 'Full pack'
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
      type: clip.type,
      bpm: clip.bpm,
      key: clip.key,
      detectedBpm: clip.detectedBpm,
      bpmSource: clip.bpmSource,
      durationSeconds: clip.durationSeconds,
      estimatedBeats: clip.estimatedBeats,
      beatsLength: clip.beatsLength,
      syncStatus: clip.syncStatus,
      playbackRate: clip.playbackRate,
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
      type: saved.type ?? null,
      bpm: saved.bpm ?? null,
      key: saved.key ?? null,
      detectedBpm: saved.detectedBpm ?? saved.bpm ?? null,
      bpmSource: saved.bpmSource ?? (saved.bpm !== null ? 'filename' : 'unknown'),
      durationSeconds: saved.durationSeconds ?? null,
      estimatedBeats: saved.estimatedBeats ?? null,
      beatsLength: saved.beatsLength ?? null,
      syncStatus: saved.syncStatus ?? 'unsupported',
      playbackRate: saved.playbackRate ?? null,
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
        playbackEngineStatus: 'Playback engine: browser prototype',
        lastAction: `Previewing sample: ${sample.filename}`,
      })
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : 'Failed to preview sample',
        lastAction: 'Sample preview failed',
      })
    }
  }

  const ensureAudioTransportSubscription = () => {
    if (unsubscribeAudioTransport) {
      return
    }

    unsubscribeAudioTransport = audioTransport.subscribe((event) => {
      if (event.type === 'clock') {
        set({
          clockProgress: event.snapshot.progress,
          clockBeatInBar: event.snapshot.beatInBar,
          clockBeatInCycle: event.snapshot.beatInCycle,
          clockBeatsPerBar: event.snapshot.beatsPerBar,
          clockQuantizeBeats: event.snapshot.quantizeBeats,
        })
        return
      }

      if (event.type === 'clip-error') {
        set({
          errorMessage: event.message,
          lastAction: `Failed to load sample: ${event.message}`,
        })
        return
      }

      if (event.type === 'clip-started') {
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
          queuedSceneLabel: null,
          playbackEngineStatus: 'Playback engine: browser prototype',
          lastAction: state.queuedSceneLabel
            ? `Scene launched: ${state.queuedSceneLabel}`
            : `Clip started: ${event.filename ?? event.clipId}`,
        }))
        return
      }

      if (event.type === 'clip-stopped') {
        set((state) => ({
          clips: state.clips.map((clip) =>
            clip.id === event.clipId
              ? {
                  ...clip,
                  playing: false,
                  launchState: clip.filled ? 'stopped' : 'empty',
                }
              : clip,
          ),
          lastAction: event.filename ? `Clip stopped: ${event.filename}` : state.lastAction,
        }))
      }
    })
  }

  const stopTransportClock = () => {
    audioTransport.stopTransport()
    const beatsPerBar = getBeatsPerBar(get().transport.timeSignature)
    set({
      clockProgress: 0,
      clockBeatInBar: 1,
      clockBeatInCycle: 1,
      clockBeatsPerBar: beatsPerBar,
      clockQuantizeBeats: Math.max(1, getQuantizeBeats(get().transport.quantize, beatsPerBar) || beatsPerBar),
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

  const buildTransportClipRequest = (clip: ClipSlot): TransportClipRequest | null => {
    if (!clip.filled || !clip.sampleId) {
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
        playbackEngineStatus: 'Playback engine: browser prototype',
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
    const targetClips = state.clips.filter((clip) => clip.trackIndex === trackIndex && clip.playing)
    for (const clip of targetClips) {
      void audioTransport.queueClipStop(
        { clipId: clip.id, trackIndex: clip.trackIndex, filename: clip.clipName },
        audioTransport.getNextBoundaryTime('None'),
      )
    }
    set({ lastAction: `Clip stopped: ${TRACK_LABELS[trackIndex] ?? `Track ${trackIndex + 1}`}` })
  }

  const stopAllClipsNow = () => {
    audioTransport.stopAll()
    set((state) => ({
      clips: state.clips.map((clip) => ({
        ...clip,
        playing: false,
        launchState: clip.filled ? 'stopped' : 'empty',
      })),
      queuedSceneLabel: null,
      lastAction: IMMEDIATE_STOP_MESSAGE,
    }))
  }

  const queueTrackSwitch = (trackIndex: number, startClipId: string, boundaryOverride?: number) => {
    const trackLabel = TRACK_LABELS[trackIndex] ?? `Track ${trackIndex + 1}`
    const state = get()
    const hasOtherPlaying = state.clips.some(
      (clip) => clip.trackIndex === trackIndex && clip.playing && clip.id !== startClipId,
    )
    const startClip = state.clips.find((clip) => clip.id === startClipId)
    const stoppingClips = state.clips.filter((clip) => clip.trackIndex === trackIndex && clip.playing && clip.id !== startClipId)

    set((current) => ({
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

        if (clip.playing) {
          return {
            ...clip,
            launchState: 'stopping',
          }
        }

        return clip
      }),
      lastAction: hasOtherPlaying
        ? `Column switched: ${trackLabel}`
        : `Clip queued: ${startClip?.clipName ?? startClipId}`,
    }))

    const request = startClip ? buildTransportClipRequest(startClip) : null
    if (!request) {
      return
    }

    void (async () => {
      await ensureTransportForQueuedLaunch()
      const boundaryTime = boundaryOverride ?? audioTransport.getNextBoundaryTime()

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
    activePack: string | null,
    sourceScope: AutoFillSettings['sourceScope'],
  ) => {
    if (sourceScope === 'entireLibrary') {
      return {
        sourceSamples: samples,
        chosenPack: null as string | null,
        sourceLabel: 'Entire library',
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
          }
        }
      }

      const bestPack = computePackCoverage(samples)
      if (bestPack) {
        return {
          sourceSamples: samples.filter((sample) => getSamplePack(sample) === bestPack),
          chosenPack: bestPack,
          sourceLabel: `Auto-selected pack: ${bestPack}`,
        }
      }

      return {
        sourceSamples: samples,
        chosenPack: null,
        sourceLabel: 'Entire library (fallback)',
      }
    }

    const bestPack = computePackCoverage(samples)
    if (bestPack) {
      return {
        sourceSamples: samples.filter((sample) => getSamplePack(sample) === bestPack),
        chosenPack: bestPack,
        sourceLabel: `Auto-selected pack: ${bestPack}`,
      }
    }

    return {
      sourceSamples: samples,
      chosenPack: null,
      sourceLabel: 'Entire library (fallback)',
    }
  }

  const createClearSnapshot = (state: LaunchBrainState, message: string) => {
    return {
      clips: state.clips.map((clip) => ({ ...clip })),
      missingFilesCount: state.missingFilesCount,
      message,
    }
  }

  const clearClipByIdInternal = (clipId: string) => {
    const clip = get().clips.find((item) => item.id === clipId)
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
    tracks: createDefaultTracks(),
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
    playbackEngineStatus: 'Playback engine: browser prototype',
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
    autoFillResolvedSource: 'Auto-selected pack: pending',
    clockProgress: 0,
    clockBeatInBar: 1,
    clockBeatInCycle: 1,
    clockBeatsPerBar: 4,
    clockQuantizeBeats: 4,
    queuedSceneLabel: null,
    currentSessionId: null,
    currentSessionName: 'Untitled Set',
    lastSavedAt: null,
    saveStatus: 'idle',
    missingFilesCount: 0,
    lastClearSnapshot: null,
    recentSessions: [],
    selectedRecentSessionId: null,
    autoFillCoverageLabel: 'Partial pack',
    canUndoClear: false,

    initializeApp: async () => {
      set({ isBootstrapping: true, errorMessage: null })
      ensureAudioTransportSubscription()

      try {
        const [config, devices, sampleIndex, sessionList] = await Promise.all([
          getConfig(),
          getDevices(),
          getSampleIndex(),
          apiListSessions().catch(() => ({ sessions: [] })),
        ])

        set({
          config,
          devices,
          sampleRootInput: config.sampleRoot ?? '',
          ...(sampleIndex ? applyScanSnapshotToState(sampleIndex) : {}),
          recentSessions: sessionList.sessions,
          selectedRecentSessionId: sessionList.sessions[0]?.id ?? null,
          isBootstrapping: false,
          lastAction: sampleIndex
            ? `Library scanned (cached): ${sampleIndex.sampleCount} samples`
            : 'Loaded config and device status',
          playbackEngineStatus: 'Playback engine: browser prototype',
        })
        configureAudioTransport()
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

        audioTransport.stopAll()

        const state = get()
        const applied = applyLoadedSessionToClipGrid(state.clips, loaded, state.tracks)

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
          autoFillSettings: loaded.autoFillSettings ?? current.autoFillSettings,
          autoFillResolvedSource: loaded.selectedPack
            ? `Selected pack: ${loaded.selectedPack}`
            : current.autoFillResolvedSource,
          clips: applied.nextClips,
          currentSessionId: loaded.id,
          currentSessionName: loaded.name,
          lastSavedAt: loaded.updatedAt,
          saveStatus: 'saved',
          selectedRecentSessionId: loaded.id,
          missingFilesCount: applied.missingFilesCount,
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
        const result = await scanSamples()
        set((state) => ({
          config: {
            ...state.config,
            sampleRoot: result.sampleRoot,
            lastScanAt: result.scannedAt,
          },
          ...applyScanSnapshotToState(result),
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
        playbackEngineStatus: 'Playback engine: browser prototype',
        lastAction: 'Transport running',
      }))
    },

    setTransportStop: () => {
      stopTransportClock()

      set((state) => ({
        transport: {
          ...state.transport,
          isPlaying: false,
          isRecording: false,
        },
        clips: state.clips.map((clip) => ({
          ...clip,
          playing: false,
          launchState: clip.filled ? 'stopped' : 'empty',
        })),
        queuedSceneLabel: null,
        lastAction: 'Transport stopped: all clips',
      }))
    },

    stopAllClipPlayback: () => {
      const state = get()
      if (state.transport.quantize === 'None' || !state.transport.isPlaying) {
        stopAllClipsNow()
        return
      }

      const boundaryTime = audioTransport.getNextBoundaryTime()
      for (const clip of state.clips) {
        audioTransport.cancelQueuedClipStart(clip.id)

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
        lastAction: 'Stop All queued',
      }))
    },

    toggleRecord: () =>
      set({
        lastAction: 'Record is disabled in this prototype',
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
        activeKeyFilter: key,
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

    assignSampleToClip: (clipId, sampleId) =>
      set((state) => {
        const selectedSample = state.samples.find((sample) => sample.id === sampleId)
        const selectedClip = state.clips.find((clip) => clip.id === clipId)
        if (!selectedSample || !selectedClip) {
          return { lastAction: 'Assign skipped: invalid sample or clip' }
        }

        const track = state.tracks.find((item) => item.index === selectedClip.trackIndex)
        const nextClips = state.clips.map((clip) =>
          clip.id === selectedClip.id
            ? applySampleToClip(clip, selectedSample, track?.color ?? '#64748b')
            : clip,
        )

        return {
          clips: nextClips,
          selectedClipId: selectedClip.id,
          selectedSampleId: selectedSample.id,
          missingFilesCount: nextClips.filter((clip) => clip.filled && clip.missingFile).length,
          saveStatus: 'dirty',
          lastAction: `Loaded ${selectedSample.filename} to clip ${selectedClip.sceneIndex + 1}.${selectedClip.trackIndex + 1}`,
        }
      }),

    loadSelectedFileToSelectedClip: () =>
      set((state) => {
        const selectedSample = state.samples.find((sample) => sample.id === state.selectedSampleId)
        const selectedClip = state.clips.find((clip) => clip.id === state.selectedClipId)

        if (!selectedSample || !selectedClip) {
          return { lastAction: 'Load skipped: select both a clip and a sample' }
        }

        const track = state.tracks.find((item) => item.index === selectedClip.trackIndex)
        const nextClips = state.clips.map((clip) =>
          clip.id === selectedClip.id
            ? applySampleToClip(clip, selectedSample, track?.color ?? '#64748b')
            : clip,
        )
        const missingFilesCount = nextClips.filter((clip) => clip.filled && clip.missingFile).length

        return {
          clips: nextClips,
          missingFilesCount,
          saveStatus: 'dirty',
          lastAction: `Loaded ${selectedSample.filename} to clip ${selectedClip.sceneIndex + 1}.${selectedClip.trackIndex + 1}`,
        }
      }),

    loadSampleToSelectedClip: (sampleId) => {
      set({ selectedSampleId: sampleId })
      get().loadSelectedFileToSelectedClip()
    },

    setAutoFillSettings: (partial) =>
      set((state) => ({
        autoFillSettings: {
          ...state.autoFillSettings,
          ...partial,
          bpmTolerance: Math.max(0, Number(partial.bpmTolerance ?? state.autoFillSettings.bpmTolerance)),
        },
        saveStatus: 'dirty',
      })),

    toggleAutoFillOptions: () =>
      set((state) => ({
        autoFillOptionsOpen: !state.autoFillOptionsOpen,
      })),

    autoFillGrid: () =>
      set((state) => {
        if (state.samples.length === 0) {
          return { lastAction: 'Auto Fill Grid skipped: no scanned samples' }
        }

        audioTransport.stopAll()

        const settings = state.autoFillSettings
        const source = resolveAutoFillSource(state.samples, state.activePack, settings.sourceScope)
        const sourceSamples = source.sourceSamples.length > 0 ? source.sourceSamples : state.samples
        const chosenPack = source.chosenPack
        const coverageLabel = getCoverageLabel(sourceSamples)
        const siblingSamples =
          chosenPack !== null
            ? state.samples.filter((sample) => getSamplePack(sample) !== chosenPack)
            : []
        const shouldUseSiblingFallback =
          settings.sourceScope === 'selectedPack' &&
          coverageLabel !== 'Full pack' &&
          chosenPack !== null &&
          !settings.preferSameFolder

        const inferredBpm = settings.targetBpm ?? inferMostCommonBpm(sourceSamples)
        const inferredKey = settings.targetKey ?? inferMostCommonKey(sourceSamples)

        const nextClips = state.clips.map((clip) => {
          const categoryTargets = getCategoryTargets(clip.trackIndex)
          const isFxTrack = clip.trackIndex === 7

          let candidates = sourceSamples.filter((sample) => categoryTargets.includes(sample.category))
          if (candidates.length === 0 && shouldUseSiblingFallback) {
            candidates = siblingSamples.filter((sample) => categoryTargets.includes(sample.category))
          }

          if (settings.allowOneShotsInFXOnly && !isFxTrack) {
            const withoutOneShots = candidates.filter((sample) => sample.type !== 'one-shot')
            if (withoutOneShots.length > 0) {
              candidates = withoutOneShots
            }
          }

          if (settings.preferLoops) {
            const loopCandidates = candidates.filter((sample) => isLoopLike(sample.type))
            if (loopCandidates.length > 0) {
              candidates = loopCandidates
            }
          }

          if (candidates.length === 0) {
            return emptyClip(clip)
          }

          const ranked = candidates
            .map((sample) => ({
              sample,
              score: scoreSampleCandidate(
                sample,
                clip.trackIndex,
                chosenPack,
                inferredBpm,
                inferredKey,
                settings,
              ),
            }))
            .sort((left, right) => right.score - left.score)

          const selected = ranked[clip.sceneIndex % ranked.length]?.sample
          if (!selected) {
            return emptyClip(clip)
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
          return applySampleToClip(clip, enrichedSample, trackColor)
        })

        return {
          clips: nextClips,
          missingFilesCount: 0,
          queuedSceneLabel: null,
          autoFillResolvedSource: source.sourceLabel,
          autoFillCoverageLabel: coverageLabel,
          saveStatus: 'dirty',
          lastAction: `Auto Fill complete (${source.sourceLabel})${inferredBpm ? ` @ ${inferredBpm} BPM` : ''}${inferredKey ? `, ${inferredKey}` : ''}`,
          playbackEngineStatus: 'Playback engine: browser prototype',
        }
      }),

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
          stopClipNow(clip, `Clip stopped: ${clip.clipName ?? clip.id}`)
          return
        }

        await startClipNow(clip.id)
        return
      }

      await ensureTransportForQueuedLaunch()
      const boundaryTime = audioTransport.getNextBoundaryTime()

      if (clip.launchState === 'queued') {
        audioTransport.cancelQueuedClipStart(clip.id)
        set((current) => ({
          clips: current.clips.map((item) =>
            item.id === clip.id
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

      if (state.transport.quantize === 'None') {
        await ensureTransportForQueuedLaunch()

        for (const sceneClip of sceneClips) {
          await startClipNow(sceneClip.id)
        }

        set({
          queuedSceneLabel: null,
          lastAction: `Scene launched: ${scene?.label ?? sceneIndex + 1}`,
        })
        return
      }

      await ensureTransportForQueuedLaunch()
      const boundaryTime = audioTransport.getNextBoundaryTime()

      const sceneClipIds = new Set(sceneClips.map((clip) => clip.id))
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

          if (clip.launchState === 'queued') {
            return {
              ...clip,
              launchState: clip.playing ? 'playing' : clip.filled ? 'stopped' : 'empty',
            }
          }

          if (clip.playing) {
            return {
              ...clip,
              launchState: 'stopping',
            }
          }

          return clip
        }),
        queuedSceneLabel: scene?.label ?? `Scene ${sceneIndex + 1}`,
        lastAction: `Scene queued: ${scene?.label ?? sceneIndex + 1}`,
      }))

      for (const track of state.tracks) {
        const rowClip = sceneClips.find((clip) => clip.trackIndex === track.index)
        if (!rowClip) {
          continue
        }

        for (const clip of state.clips) {
          if (clip.trackIndex === track.index && clip.launchState === 'queued') {
            audioTransport.cancelQueuedClipStart(clip.id)
          }
        }

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
      set((state) => ({
        tracks: state.tracks.map((track) => ({
          ...track,
          selected: track.id === trackId,
        })),
        lastAction: `Selected track ${trackId}`,
      })),

    toggleTrackArm: (trackId) =>
      set((state) => ({
        tracks: state.tracks.map((track) =>
          track.id === trackId ? { ...track, armed: !track.armed } : track,
        ),
        lastAction: `Toggled arm on ${trackId}`,
      })),

    toggleTrackMute: (trackId) =>
      set((state) => ({
        tracks: state.tracks.map((track) =>
          track.id === trackId ? { ...track, muted: !track.muted } : track,
        ),
        lastAction: `Toggled mute on ${trackId}`,
      })),

    toggleTrackSolo: (trackId) =>
      set((state) => ({
        tracks: state.tracks.map((track) =>
          track.id === trackId ? { ...track, solo: !track.solo } : track,
        ),
        lastAction: `Toggled solo on ${trackId}`,
      })),

    stopTrack: (trackIndex) => {
      const state = get()
      const trackLabel = TRACK_LABELS[trackIndex] ?? `Track ${trackIndex + 1}`

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
          audioTransport.cancelQueuedClipStart(clip.id)
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
      const columnLabel = TRACK_LABELS[trackIndex] ?? `Track ${trackIndex + 1}`
      const columnClips = state.clips.filter((clip) => clip.trackIndex === trackIndex)
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
      audioTransport.stopAll()

      const nextClips = state.clips.map((clip) => emptyClip(clip))
      set({
        clips: nextClips,
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
        missingFilesCount: snapshot.missingFilesCount,
        lastClearSnapshot: null,
        canUndoClear: false,
        saveStatus: 'dirty',
        lastAction: 'Undo clear applied',
      })
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
              'Local mock response: this action is UI logic only. Backend AI orchestration is not wired yet.',
          },
        ],
        assistantInput: '',
        lastAction: 'Assistant prompt submitted (local mock)',
      })
    },

    runAssistantQuickAction: (action) => {
      if (action === 'Auto Group' || action === 'Suggest Layout' || action === 'Build Scene') {
        get().autoFillGrid()
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
