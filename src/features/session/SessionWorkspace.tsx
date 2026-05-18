import {
  AudioWaveform,
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

const TRACK_ICONS: ComponentType<{ className?: string }>[] = [
  Drum,
  Music2,
  AudioWaveform,
  Piano,
  Radio,
  Guitar,
  Mic,
  Sparkles,
]

const TRACK_COLUMN_LABELS = [
  'Drum',
  'Drum 2 / Hats',
  'Bass',
  'Instrument / Chord',
  'Melody',
  'Guitar / Texture',
  'Vocal',
  'FX',
]

const AUTO_FILL_KEY_OPTIONS = [
  'Auto',
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
]

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

  const scenes = useLaunchBrainStore((state) => state.scenes)
  const tracks = useLaunchBrainStore((state) => state.tracks)
  const clips = useLaunchBrainStore((state) => state.clips)
  const samples = useLaunchBrainStore((state) => state.samples)
  const selectedClipId = useLaunchBrainStore((state) => state.selectedClipId)
  const selectedSampleId = useLaunchBrainStore((state) => state.selectedSampleId)
  const autoFillSettings = useLaunchBrainStore((state) => state.autoFillSettings)
  const autoFillOptionsOpen = useLaunchBrainStore((state) => state.autoFillOptionsOpen)
  const autoFillResolvedSource = useLaunchBrainStore((state) => state.autoFillResolvedSource)
  const autoFillCoverageLabel = useLaunchBrainStore((state) => state.autoFillCoverageLabel)
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
  const assignSampleToClip = useLaunchBrainStore((state) => state.assignSampleToClip)
  const clearClip = useLaunchBrainStore((state) => state.clearClip)
  const clearRow = useLaunchBrainStore((state) => state.clearRow)
  const clearColumn = useLaunchBrainStore((state) => state.clearColumn)
  const clearAllGrid = useLaunchBrainStore((state) => state.clearAllGrid)
  const removeMissingClips = useLaunchBrainStore((state) => state.removeMissingClips)
  const undoLastClear = useLaunchBrainStore((state) => state.undoLastClear)
  const clearSelectedClip = useLaunchBrainStore((state) => state.clearSelectedClip)

  const sampleById = useMemo(() => {
    return new Map(samples.map((sample) => [sample.id, sample]))
  }, [samples])

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
                  {AUTO_FILL_KEY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
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
        <span className="ml-3 text-slate-500">Key:</span> {autoFillSettings.targetKey ?? 'auto'}
        <span className="ml-3 text-slate-500">Mode:</span> {autoFillSettings.sourceScope}
      </div>

      <div className="border-b border-slate-800/70 px-3 py-2">
        <div className="grid grid-cols-[68px_repeat(8,minmax(0,1fr))_56px] gap-1 text-[11px]">
          <div></div>
          {tracks.map((track, index) => {
            const Icon = TRACK_ICONS[index]

            return (
              <button
                key={track.id}
                type="button"
                onClick={() => selectTrack(track.id)}
                className={cn(
                  'flex items-center justify-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-1 py-1.5 transition',
                  track.selected && 'border-slate-500 bg-slate-800',
                )}
              >
                <span style={{ color: track.color }}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-slate-200">{TRACK_COLUMN_LABELS[index]}</span>
              </button>
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

                      assignSampleToClip(slot.id, sampleId)
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
                        className="flex h-full min-h-0 flex-col justify-between rounded-md px-2 py-1.5"
                        style={{
                          backgroundColor: `${track.color}22`,
                        }}
                      >
                        <p className="truncate text-[10px] font-medium text-white">{slot.clipName}</p>
                        <div className="flex items-center gap-1">
                          <span className="rounded border border-white/20 px-1 py-0.5 text-[9px] uppercase tracking-wide text-white/80">
                            {slot.type}
                          </span>
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
                        <p className="truncate text-[10px] text-slate-200">
                          {slot.bpm ?? '--'} BPM - {slot.key ?? '--'}
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
          {tracks.map((track) => (
            <div key={track.id} className="rounded-md border border-slate-800 bg-slate-900/90 px-1.5 py-1.5">
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
                  onClick={() => stopTrack(track.index)}
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
                      ? 'border-amber-400/70 bg-amber-500/20 text-amber-200'
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
                      ? 'border-slate-400/70 bg-slate-600/40 text-slate-100'
                      : 'border-slate-700 text-slate-300 hover:border-slate-500',
                  )}
                >
                  M
                </button>
              </div>
            </div>
          ))}
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
              assignSampleToClip(contextMenu.clipId, selectedSampleId)
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
        </div>
      )}
    </Panel>
  )
}
