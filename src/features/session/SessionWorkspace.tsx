import {
  AlertTriangle,
  AudioWaveform,
  ChevronLeft,
  ChevronRight,
  Drum,
  Guitar,
  Mic,
  Music2,
  Piano,
  Play,
  Radio,
  Settings2,
  Sparkles,
  Square,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { Panel } from '../../components/ui/Panel'
import { cn } from '../../components/ui/cn'
import { useLaunchBrainStore } from '../../store/useLaunchBrainStore'
import { LAYOUT_PRESET_NAMES } from '../../data/trackRoles'
import { ALL_MUSICAL_KEYS } from '../../utils/musicTheory'
import type { LayoutPresetName, TrackIconName } from '../../types'

const TRACK_ICON_MAP: Record<TrackIconName, ComponentType<{ className?: string }>> = {
  drum: Drum,
  hats: Music2,
  bass: AudioWaveform,
  instrument: Piano,
  melody: Radio,
  guitar: Guitar,
  vocal: Mic,
  fx: Sparkles,
}

export function SessionWorkspace() {
  const [contextMenu, setContextMenu] = useState<
    | {
        clipId: string
        sceneIndex: number
        trackIndex: number
        x: number
        y: number
      }
    | null
  >(null)
  const [dragOverClipId, setDragOverClipId] = useState<string | null>(null)
  const [manualKeyModal, setManualKeyModal] = useState<{
    sampleId: string
    key: string
  } | null>(null)

  const scenes = useLaunchBrainStore((state) => state.scenes)
  const tracks = useLaunchBrainStore((state) => state.tracks)
  const clips = useLaunchBrainStore((state) => state.clips)
  const samples = useLaunchBrainStore((state) => state.samples)
  const activePack = useLaunchBrainStore((state) => state.activePack)
  const activeCategoryFilter = useLaunchBrainStore((state) => state.activeCategoryFilter)
  const activeBpmFilter = useLaunchBrainStore((state) => state.activeBpmFilter)
  const activeTypeFilter = useLaunchBrainStore((state) => state.activeTypeFilter)
  const browserQuery = useLaunchBrainStore((state) => state.browserQuery)
  const selectedClipId = useLaunchBrainStore((state) => state.selectedClipId)
  const selectedSampleId = useLaunchBrainStore((state) => state.selectedSampleId)
  const autoFillSettings = useLaunchBrainStore((state) => state.autoFillSettings)
  const autoFillOptionsOpen = useLaunchBrainStore((state) => state.autoFillOptionsOpen)
  const autoFillResolvedSource = useLaunchBrainStore((state) => state.autoFillResolvedSource)
  const autoFillResolvedSourceReason = useLaunchBrainStore((state) => state.autoFillResolvedSourceReason)
  const autoFillResolvedKey = useLaunchBrainStore((state) => state.autoFillResolvedKey)
  const autoFillCoverageLabel = useLaunchBrainStore((state) => state.autoFillCoverageLabel)
  const clipPreparationStatus = useLaunchBrainStore((state) => state.clipPreparationStatus)
  const layoutPresetName = useLaunchBrainStore((state) => state.layoutPresetName)
  const canUndoClear = useLaunchBrainStore((state) => state.canUndoClear)

  const selectClip = useLaunchBrainStore((state) => state.selectClip)
  const toggleClipPlayback = useLaunchBrainStore((state) => state.toggleClipPlayback)
  const launchScene = useLaunchBrainStore((state) => state.launchScene)
  const autoFillGrid = useLaunchBrainStore((state) => state.autoFillGrid)
  const stopAllClipPlayback = useLaunchBrainStore((state) => state.stopAllClipPlayback)
  const selectTrack = useLaunchBrainStore((state) => state.selectTrack)
  const toggleTrackArm = useLaunchBrainStore((state) => state.toggleTrackArm)
  const toggleTrackMute = useLaunchBrainStore((state) => state.toggleTrackMute)
  const toggleTrackSolo = useLaunchBrainStore((state) => state.toggleTrackSolo)
  const stopTrack = useLaunchBrainStore((state) => state.stopTrack)
  const setAutoFillSettings = useLaunchBrainStore((state) => state.setAutoFillSettings)
  const toggleAutoFillOptions = useLaunchBrainStore((state) => state.toggleAutoFillOptions)
  const applyLayoutPreset = useLaunchBrainStore((state) => state.applyLayoutPreset)
  const moveTrackColumnLeft = useLaunchBrainStore((state) => state.moveTrackColumnLeft)
  const moveTrackColumnRight = useLaunchBrainStore((state) => state.moveTrackColumnRight)
  const resetTrackOrder = useLaunchBrainStore((state) => state.resetTrackOrder)
  const assignSampleToClip = useLaunchBrainStore((state) => state.assignSampleToClip)
  const clearClip = useLaunchBrainStore((state) => state.clearClip)
  const clearRow = useLaunchBrainStore((state) => state.clearRow)
  const clearColumn = useLaunchBrainStore((state) => state.clearColumn)
  const clearAllGrid = useLaunchBrainStore((state) => state.clearAllGrid)
  const removeMissingClips = useLaunchBrainStore((state) => state.removeMissingClips)
  const undoLastClear = useLaunchBrainStore((state) => state.undoLastClear)
  const clearSelectedClip = useLaunchBrainStore((state) => state.clearSelectedClip)
  const analyzeKeyForSample = useLaunchBrainStore((state) => state.analyzeKeyForSample)
  const setSampleManualKey = useLaunchBrainStore((state) => state.setSampleManualKey)
  const markSampleKeyUnknown = useLaunchBrainStore((state) => state.markSampleKeyUnknown)
  const setSampleAsProjectKey = useLaunchBrainStore((state) => state.setSampleAsProjectKey)
  const toggleSampleExcludedInAutoFill = useLaunchBrainStore(
    (state) => state.toggleSampleExcludedInAutoFill,
  )
  const showSampleMetadata = useLaunchBrainStore((state) => state.showSampleMetadata)

  const sampleById = useMemo(() => {
    return new Map(samples.map((sample) => [sample.id, sample]))
  }, [samples])
  const anySoloActive = useMemo(() => tracks.some((track) => track.solo), [tracks])

  const getClipDisplayName = (value: string | null) => {
    if (!value) {
      return 'Unnamed Clip'
    }

    const withoutExtension = value.replace(/\.[^.]+$/, '')
    return withoutExtension.length > 0 ? withoutExtension : value
  }
  const keyScopeSamples = useMemo(() => {
    const query = browserQuery.trim().toLowerCase()

    return samples.filter((sample) => {
      const samplePack = sample.relativePath.split(/[\\/]/)[0] || 'Root'
      const matchesPack = !activePack || samplePack === activePack
      const matchesCategory = !activeCategoryFilter || sample.category === activeCategoryFilter
      const matchesBpm =
        activeBpmFilter === null || (sample.detectedBpm ?? sample.bpm) === activeBpmFilter
      const matchesType = !activeTypeFilter || sample.type === activeTypeFilter
      const matchesQuery =
        query.length === 0 ||
        sample.filename.toLowerCase().includes(query) ||
        sample.relativePath.toLowerCase().includes(query) ||
        sample.tags.some((tag) => tag.toLowerCase().includes(query))

      return matchesPack && matchesCategory && matchesBpm && matchesType && matchesQuery
    })
  }, [activeBpmFilter, activeCategoryFilter, activePack, activeTypeFilter, browserQuery, samples])
  const detectedKeyEntries = useMemo(() => {
    const counts = new Map<string, number>()

    for (const sample of keyScopeSamples) {
      const value = sample.normalizedKey ?? sample.key
      if (!value) {
        continue
      }

      counts.set(value, (counts.get(value) ?? 0) + 1)
    }

    return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
  }, [keyScopeSamples])
  const detectedKeyValues = useMemo(() => new Set(detectedKeyEntries.map(([key]) => key)), [detectedKeyEntries])
  const fallbackKeyOptions = useMemo(
    () => ALL_MUSICAL_KEYS.filter((key) => !detectedKeyValues.has(key)),
    [detectedKeyValues],
  )
  const contextClip = contextMenu ? clips.find((clip) => clip.id === contextMenu.clipId) ?? null : null
  const contextSample =
    contextClip?.sampleId ? sampleById.get(contextClip.sampleId) ?? null : null

  useEffect(() => {
    const closeMenu = () => setContextMenu(null)
    const handleDelete = (event: KeyboardEvent) => {
      if (event.key !== 'Delete') {
        return
      }

      event.preventDefault()

      if (event.shiftKey) {
        const selectedClip = clips.find((clip) => clip.id === selectedClipId)
        if (!selectedClip) {
          return
        }

        const confirmed = window.confirm('Shift+Delete: Clear selected row? (Cancel keeps current pattern)')
        if (confirmed) {
          clearRow(selectedClip.sceneIndex)
        }
        return
      }

      clearSelectedClip()
    }

    window.addEventListener('click', closeMenu)
    window.addEventListener('contextmenu', closeMenu)
    window.addEventListener('keydown', handleDelete)

    return () => {
      window.removeEventListener('click', closeMenu)
      window.removeEventListener('contextmenu', closeMenu)
      window.removeEventListener('keydown', handleDelete)
    }
  }, [clearRow, clearSelectedClip, clips, selectedClipId])

  return (
    <Panel
      className="flex h-full min-h-0 flex-col overflow-hidden"
      title="Session Grid"
      rightSlot={
        <div className="relative flex items-center gap-1.5">
          <button
            type="button"
            onClick={autoFillGrid}
            className="rounded-md border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-sky-200 transition hover:bg-sky-500/25"
          >
            Auto Fill Grid
          </button>
          <button
            type="button"
            onClick={toggleAutoFillOptions}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-300 transition hover:border-slate-500"
          >
            <span className="inline-flex items-center gap-1">
              <Settings2 className="h-3.5 w-3.5" />
              Options
            </span>
          </button>
          <button
            type="button"
            onClick={stopAllClipPlayback}
            className="rounded-md border border-rose-500/40 bg-rose-500/15 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-rose-200 transition hover:bg-rose-500/25"
          >
            Stop All
          </button>
          <button
            type="button"
            onClick={() => {
              if (!window.confirm('Clear all clips from grid?')) {
                return
              }
              clearAllGrid()
            }}
            className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-200 transition hover:bg-amber-500/25"
          >
            Clear All
          </button>
          <button
            type="button"
            onClick={removeMissingClips}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-300 transition hover:border-slate-500"
          >
            Remove Missing
          </button>
          <button
            type="button"
            onClick={undoLastClear}
            disabled={!canUndoClear}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-300 transition hover:border-slate-500 disabled:opacity-40"
          >
            Undo Clear
          </button>

          {autoFillOptionsOpen && (
            <div className="absolute right-0 top-8 z-30 w-72 space-y-2 rounded-lg border border-slate-700 bg-slate-950/95 p-2.5 text-xs shadow-2xl">
              <label className="space-y-1">
                <span className="panel-label">Source</span>
                <select
                  value={autoFillSettings.sourceScope}
                  onChange={(event) =>
                    setAutoFillSettings({
                      sourceScope: event.target.value as 'selectedPack' | 'entireLibrary' | 'autoBestPack',
                    })
                  }
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none"
                >
                  <option value="selectedPack">Selected pack</option>
                  <option value="autoBestPack">Auto best pack</option>
                  <option value="entireLibrary">Entire library</option>
                </select>
              </label>

              <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                <label className="space-y-1">
                  <span className="panel-label">Layout Preset</span>
                  <select
                    value={layoutPresetName}
                    onChange={(event) => applyLayoutPreset(event.target.value as LayoutPresetName)}
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none"
                  >
                    {LAYOUT_PRESET_NAMES.map((preset) => (
                      <option key={preset} value={preset}>
                        {preset}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={resetTrackOrder}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-slate-300 transition hover:border-slate-500"
                >
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="panel-label">Target BPM</span>
                  <input
                    type="number"
                    min={50}
                    max={220}
                    value={autoFillSettings.targetBpm ?? ''}
                    onChange={(event) =>
                      setAutoFillSettings({
                        targetBpm: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                    placeholder="Auto"
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none"
                  />
                </label>
                <label className="space-y-1">
                  <span className="panel-label">BPM Tol.</span>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={autoFillSettings.bpmTolerance}
                    onChange={(event) =>
                      setAutoFillSettings({
                        bpmTolerance: Number(event.target.value),
                      })
                    }
                    className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none"
                  />
                </label>
              </div>

              <label className="space-y-1">
                <span className="panel-label">Key</span>
                <select
                  value={autoFillSettings.targetKey ?? 'Auto'}
                  onChange={(event) =>
                    setAutoFillSettings({
                      targetKey: event.target.value === 'Auto' ? null : event.target.value,
                    })
                  }
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none"
                >
                  <option value="Auto">Auto</option>
                  {detectedKeyEntries.length > 0 && (
                    <optgroup
                      label={
                        activePack
                          ? `Detected in ${activePack}`
                          : 'Detected in current scope'
                      }
                    >
                      {detectedKeyEntries.map(([key, count]) => (
                        <option key={key} value={key}>
                          {key} ({count})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="All keys">
                    {fallbackKeyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>

              <label className="space-y-1">
                <span className="panel-label">Key Strictness</span>
                <select
                  value={autoFillSettings.keyStrictness}
                  onChange={(event) =>
                    setAutoFillSettings({
                      keyStrictness: event.target.value as 'off' | 'compatible' | 'strict',
                    })
                  }
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none"
                >
                  <option value="off">Off</option>
                  <option value="compatible">Compatible</option>
                  <option value="strict">Strict</option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={autoFillSettings.allowUnknownKeySamples}
                  onChange={(event) =>
                    setAutoFillSettings({ allowUnknownKeySamples: event.target.checked })
                  }
                />
                Allow unknown key samples
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={autoFillSettings.allowKeyNeutralStrict}
                  onChange={(event) =>
                    setAutoFillSettings({ allowKeyNeutralStrict: event.target.checked })
                  }
                />
                Allow key-neutral drums/FX in strict mode
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={autoFillSettings.preferSameFolder}
                  onChange={(event) => setAutoFillSettings({ preferSameFolder: event.target.checked })}
                />
                Prefer same folder
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={autoFillSettings.preferLoops}
                  onChange={(event) => setAutoFillSettings({ preferLoops: event.target.checked })}
                />
                Prefer loops
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={autoFillSettings.allowDuplicates}
                  onChange={(event) => setAutoFillSettings({ allowDuplicates: event.target.checked })}
                />
                Allow duplicates
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={autoFillSettings.preloadGridClips}
                  onChange={(event) => setAutoFillSettings({ preloadGridClips: event.target.checked })}
                />
                Preload grid clips
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={autoFillSettings.allowOneShotsInFXOnly}
                  onChange={(event) =>
                    setAutoFillSettings({ allowOneShotsInFXOnly: event.target.checked })
                  }
                />
                Allow FX one-shots only
              </label>
            </div>
          )}
        </div>
      }
    >
      <div className="border-b border-slate-800/70 px-3 py-1.5 text-[11px] text-slate-400">
        <span className="text-slate-500">Source:</span> {autoFillResolvedSource}
        <span className="ml-3 text-slate-500">Coverage:</span> {autoFillCoverageLabel}
        <span className="ml-3 text-slate-500">Target BPM:</span> {autoFillSettings.targetBpm ?? 'auto'}
        <span className="ml-3 text-slate-500">Target Key:</span> {autoFillResolvedKey ?? 'auto'}
        <span className="ml-3 text-slate-500">Key Mode:</span> {autoFillSettings.keyStrictness}
        <span className="ml-3 text-slate-500">Layout:</span> {layoutPresetName}
        {autoFillResolvedSourceReason ? (
          <span className="ml-3 text-slate-500">{autoFillResolvedSourceReason}</span>
        ) : null}
        {clipPreparationStatus ? (
          <span className="ml-3 text-slate-400">{clipPreparationStatus}</span>
        ) : null}
      </div>

      <div className="border-b border-slate-800/70 px-3 py-2">
        <div className="grid grid-cols-[68px_repeat(8,minmax(0,1fr))_56px] gap-1 text-[11px]">
          <div></div>
          {tracks.map((track, index) => {
            const Icon = TRACK_ICON_MAP[track.icon] ?? Music2
            const isTrackAudible = !track.muted && (!anySoloActive || track.solo)

            return (
              <div
                key={track.id}
                className={cn(
                  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-1 py-1 transition',
                  track.selected && 'border-slate-500 bg-slate-800',
                  !isTrackAudible && 'opacity-55',
                )}
              >
                <button
                  type="button"
                  onClick={() => selectTrack(track.id)}
                  className="flex min-w-0 items-center gap-1"
                >
                  <span style={{ color: track.color }}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-slate-200">{track.label}</span>
                  {track.liveInput && (
                    <span
                      className="inline-flex items-center rounded border border-emerald-500/40 bg-emerald-500/15 px-1 py-0 text-[9px] uppercase tracking-wide text-emerald-200"
                      title="Future live input track: recording/capture coming later"
                    >
                      LIVE
                    </span>
                  )}
                  {track.armed && <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.9)]" />}
                </button>
                <div className="inline-flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveTrackColumnLeft(index)}
                    disabled={index === 0}
                    className="rounded border border-slate-700 p-0.5 text-slate-300 transition hover:border-slate-500 disabled:opacity-35"
                    aria-label={`Move ${track.label} column left`}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTrackColumnRight(index)}
                    disabled={index === tracks.length - 1}
                    className="rounded border border-slate-700 p-0.5 text-slate-300 transition hover:border-slate-500 disabled:opacity-35"
                    aria-label={`Move ${track.label} column right`}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )
          })}
          <div className="flex items-center justify-center text-slate-400">Scenes</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-3 pb-2 pt-2">
        {samples.length === 0 && (
          <div className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200">
            Scan a sample library to populate clips.
          </div>
        )}

        <div className="grid h-full min-h-0 grid-rows-[repeat(8,minmax(0,1fr))] gap-1">
          {scenes.map((scene) => (
            <div key={scene.id} className="grid min-h-0 grid-cols-[68px_repeat(8,minmax(0,1fr))_56px] gap-1">
              <div className="flex items-center justify-center rounded-md border border-slate-800 bg-slate-900 px-1 text-center text-xs text-slate-300">
                <div>
                  <p className="font-semibold text-slate-100">{scene.index + 1}</p>
                  <p className="truncate text-[10px] text-slate-400">{scene.label}</p>
                </div>
              </div>

              {tracks.map((track) => {
                const slot = clips.find(
                  (clip) => clip.sceneIndex === scene.index && clip.trackIndex === track.index,
                )
                const isTrackAudible = !track.muted && (!anySoloActive || track.solo)

                if (!slot) {
                  return <div key={`${scene.id}-${track.id}`} />
                }

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => {
                      selectClip(slot.id)
                      if (slot.filled) {
                        void toggleClipPlayback(slot.id)
                      }
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      selectClip(slot.id)
                      setContextMenu({
                        clipId: slot.id,
                        sceneIndex: slot.sceneIndex,
                        trackIndex: slot.trackIndex,
                        x: event.clientX,
                        y: event.clientY,
                      })
                    }}
                    onDragOver={(event) => {
                      if (!event.dataTransfer.types.includes('text/launchbrain-sample-id')) {
                        return
                      }

                      event.preventDefault()
                      event.dataTransfer.dropEffect = 'copy'
                      setDragOverClipId(slot.id)
                    }}
                    onDragLeave={() => {
                      setDragOverClipId((current) => (current === slot.id ? null : current))
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      const sampleId = event.dataTransfer.getData('text/launchbrain-sample-id')
                      if (!sampleId) {
                        return
                      }

                      if (slot.filled) {
                        const nextSample = sampleById.get(sampleId)
                        const accepted = window.confirm(
                          `Replace ${slot.clipName ?? 'existing clip'} with ${nextSample?.filename ?? 'selected sample'}?`,
                        )
                        if (!accepted) {
                          setDragOverClipId(null)
                          return
                        }
                      }

                      void assignSampleToClip(slot.id, sampleId)
                      selectClip(slot.id)
                      setDragOverClipId(null)
                    }}
                    className={cn(
                      'clip-slot h-full min-h-0 rounded-md border text-left transition',
                      slot.filled
                        ? 'border-slate-700 bg-slate-900/90 hover:border-slate-500'
                        : 'border-slate-900 bg-slate-950/80 hover:border-slate-700',
                      selectedClipId === slot.id && 'ring-1 ring-sky-400/90',
                      slot.launchState === 'playing' && 'clip-playing',
                      slot.launchState === 'queued' && 'clip-queued',
                      slot.launchState === 'stopping' && 'clip-stopping',
                      slot.missingFile && 'border-amber-500/70 bg-amber-500/10',
                      dragOverClipId === slot.id && 'ring-1 ring-emerald-300',
                      !isTrackAudible && 'opacity-45 saturate-50',
                    )}
                    style={{
                      boxShadow:
                        slot.filled && slot.launchState === 'playing'
                          ? `inset 0 0 0 1px ${track.color}, 0 0 18px -7px ${track.color}`
                          : undefined,
                    }}
                  >
                    {slot.filled ? (
                      <div
                        className="grid h-full min-h-0 grid-rows-[minmax(0,1fr)_auto_auto] gap-1 rounded-md px-2 py-1.5"
                        style={{
                          backgroundColor: `${track.color}22`,
                        }}
                      >
                        <p
                          className="min-h-[1rem] truncate self-start leading-tight text-[11px] font-medium text-white/95"
                          title={slot.clipName ?? undefined}
                        >
                          {getClipDisplayName(slot.clipName)}
                        </p>
                        <div className="flex min-w-0 items-center gap-1">
                          <span className="rounded border border-white/20 px-1 py-0.5 text-[9px] uppercase tracking-wide text-white/80">
                            {slot.type}
                          </span>
                          {slot.preparationState === 'failed' && (
                            <span className="inline-flex items-center text-rose-300" title={slot.preparationError ?? 'Clip failed to load'}>
                              <AlertTriangle className="h-3 w-3" />
                            </span>
                          )}
                          {slot.launchState === 'queued' && (
                            <span className="text-[9px] uppercase tracking-wide text-sky-200">Queued</span>
                          )}
                          {slot.launchState === 'stopping' && (
                            <span className="text-[9px] uppercase tracking-wide text-amber-200">Stopping</span>
                          )}
                          {slot.launchState === 'playing' && (
                            <span className="text-[9px] uppercase tracking-wide text-emerald-200">Playing</span>
                          )}
                          {slot.missingFile && (
                            <span className="text-[9px] uppercase tracking-wide text-amber-200">Missing</span>
                          )}
                        </div>
                        <p className="truncate leading-tight text-[9px] text-slate-200">
                          {slot.bpm ?? '--'} BPM - {slot.normalizedKey ?? slot.key ?? '--'}
                        </p>
                      </div>
                    ) : (
                      <div className="h-full rounded-md bg-slate-950/70" />
                    )}
                  </button>
                )
              })}

              <button
                type="button"
                onClick={() => {
                  void launchScene(scene.index)
                }}
                className="flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-slate-500 hover:text-white"
                aria-label={`Launch ${scene.label} scene`}
              >
                <Play className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800/70 px-3 py-2">
        <div className="grid grid-cols-[68px_repeat(8,minmax(0,1fr))_56px] gap-1">
          <div className="text-center text-[11px] text-slate-400">Track Ctl</div>
          {tracks.map((track) => {
            const isTrackAudible = !track.muted && (!anySoloActive || track.solo)
            return (
            <div
              key={track.id}
              className={cn(
                'rounded-md border border-slate-800 bg-slate-900/90 px-1.5 py-1.5',
                !isTrackAudible && 'opacity-60',
                track.selected && 'border-slate-500',
              )}
            >
              <div className="mb-1 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => toggleTrackArm(track.id)}
                  className={cn(
                    'rounded border px-1 py-0.5 text-[10px] transition',
                    track.armed
                      ? 'border-rose-400/70 bg-rose-500/20 text-rose-200'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500',
                  )}
                >
                  Arm
                </button>
                <button
                  type="button"
                  onClick={() => stopTrack(track.id)}
                  className="rounded border border-slate-700 px-1 py-0.5 text-[10px] text-slate-300 transition hover:border-slate-500"
                >
                  <Square className="mx-auto h-3 w-3" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => toggleTrackSolo(track.id)}
                  className={cn(
                    'rounded border px-1 py-0.5 text-[10px] transition',
                    track.solo
                      ? 'border-sky-400/70 bg-sky-500/20 text-sky-200'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500',
                  )}
                >
                  S
                </button>
                <button
                  type="button"
                  onClick={() => toggleTrackMute(track.id)}
                  className={cn(
                    'rounded border px-1 py-0.5 text-[10px] transition',
                    track.muted
                      ? 'border-amber-400/70 bg-amber-500/20 text-amber-100'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500',
                  )}
                >
                  M
                </button>
              </div>
            </div>
          )})}
          <div className="rounded-md border border-slate-800 bg-slate-900"></div>
        </div>
      </div>

      {contextMenu && (
        <div
          className="fixed z-50 w-44 rounded-md border border-slate-700 bg-slate-950/95 p-1 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              const clip = clips.find((item) => item.id === contextMenu.clipId)
              if (clip?.filled) {
                void toggleClipPlayback(contextMenu.clipId)
              }
              setContextMenu(null)
            }}
            className="w-full rounded px-2 py-1 text-left text-xs text-slate-200 transition hover:bg-slate-800"
          >
            Play / Stop
          </button>

          <button
            type="button"
            disabled={!selectedSampleId}
            onClick={() => {
              if (!selectedSampleId) {
                return
              }
              const clip = clips.find((item) => item.id === contextMenu.clipId)
              if (clip?.filled) {
                const replacement = sampleById.get(selectedSampleId)
                const ok = window.confirm(
                  `Replace ${clip.clipName ?? 'clip'} with ${replacement?.filename ?? 'selected sample'}?`,
                )
                if (!ok) {
                  setContextMenu(null)
                  return
                }
              }
              void assignSampleToClip(contextMenu.clipId, selectedSampleId)
              setContextMenu(null)
            }}
            className="w-full rounded px-2 py-1 text-left text-xs text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
          >
            Replace from selected sample
          </button>

          <button
            type="button"
            onClick={() => {
              clearClip(contextMenu.clipId)
              setContextMenu(null)
            }}
            className="w-full rounded px-2 py-1 text-left text-xs text-slate-200 transition hover:bg-slate-800"
          >
            Clear Clip
          </button>

          <button
            type="button"
            onClick={() => {
              clearRow(contextMenu.sceneIndex)
              setContextMenu(null)
            }}
            className="w-full rounded px-2 py-1 text-left text-xs text-slate-200 transition hover:bg-slate-800"
          >
            Clear Row
          </button>

          <button
            type="button"
            onClick={() => {
              clearColumn(contextMenu.trackIndex)
              setContextMenu(null)
            }}
            className="w-full rounded px-2 py-1 text-left text-xs text-slate-200 transition hover:bg-slate-800"
          >
            Clear Column
          </button>

          <div className="my-1 border-t border-slate-800" />

          <button
            type="button"
            disabled={!contextSample}
            onClick={() => {
              if (!contextSample) {
                return
              }
              void analyzeKeyForSample(contextSample.id)
              setContextMenu(null)
            }}
            className="w-full rounded px-2 py-1 text-left text-xs text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
          >
            Analyze Key
          </button>

          <button
            type="button"
            disabled={!contextSample}
            onClick={() => {
              if (!contextSample) {
                return
              }
              setManualKeyModal({
                sampleId: contextSample.id,
                key: contextSample.normalizedKey ?? 'C Minor',
              })
              setContextMenu(null)
            }}
            className="w-full rounded px-2 py-1 text-left text-xs text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
          >
            Set Key Manually
          </button>

          <button
            type="button"
            disabled={!contextSample}
            onClick={() => {
              if (!contextSample) {
                return
              }
              void markSampleKeyUnknown(contextSample.id)
              setContextMenu(null)
            }}
            className="w-full rounded px-2 py-1 text-left text-xs text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
          >
            Mark Key Unknown
          </button>

          <button
            type="button"
            disabled={!contextSample?.normalizedKey}
            onClick={() => {
              if (!contextSample) {
                return
              }
              setSampleAsProjectKey(contextSample.id)
              setContextMenu(null)
            }}
            className="w-full rounded px-2 py-1 text-left text-xs text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
          >
            Use This Key as Project Key
          </button>

          <button
            type="button"
            disabled={!contextSample}
            onClick={() => {
              if (!contextSample) {
                return
              }
              void toggleSampleExcludedInAutoFill(contextSample.id, !contextSample.excluded)
              setContextMenu(null)
            }}
            className="w-full rounded px-2 py-1 text-left text-xs text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
          >
            {contextSample?.excluded ? 'Include In Current Auto Fill' : 'Exclude From Current Auto Fill'}
          </button>

          <button
            type="button"
            disabled={!contextSample}
            onClick={() => {
              if (!contextSample) {
                return
              }
              showSampleMetadata(contextSample.id)
              setContextMenu(null)
            }}
            className="w-full rounded px-2 py-1 text-left text-xs text-slate-200 transition hover:bg-slate-800 disabled:opacity-40"
          >
            Show Metadata
          </button>

          <button
            type="button"
            disabled
            title="Coming later: non-destructive pitch shifting / rendered tuned copy."
            className="w-full cursor-not-allowed rounded px-2 py-1 text-left text-xs text-slate-500"
          >
            Transpose / Change Key to Project Key
          </button>
        </div>
      )}

      {manualKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-950 p-3">
            <h4 className="text-sm font-semibold text-slate-100">Set Manual Key</h4>
            <p className="mt-1 text-xs text-slate-400">Metadata override only. Audio is not transposed.</p>
            <select
              value={manualKeyModal.key}
              onChange={(event) =>
                setManualKeyModal((current) =>
                  current
                    ? {
                        ...current,
                        key: event.target.value,
                      }
                    : current,
                )
              }
              className="mt-3 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none"
            >
              {ALL_MUSICAL_KEYS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setManualKeyModal(null)}
                className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void setSampleManualKey(manualKeyModal.sampleId, manualKeyModal.key)
                  setManualKeyModal(null)
                }}
                className="rounded border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-xs text-sky-200"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}
