import { ChevronDown, ChevronUp } from 'lucide-react'
import { useMemo } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { cn } from '../../components/ui/cn'
import { useLaunchBrainStore } from '../../store/useLaunchBrainStore'
import { areKeysCompatible, normalizeKey } from '../../utils/musicTheory'
import { LAYOUT_PRESET_NAMES } from '../../data/trackRoles'
import { LAUNCHPAD_MODE_PLAN } from '../../hardware/launchpadProMapping'
import type { InspectorTab, LayoutPresetName } from '../../types'

const TABS: InspectorTab[] = ['Clip', 'Track', 'Device', 'Record', 'Session', 'Routing']

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="space-y-1">
      <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function InputLike(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500',
        props.className,
      )}
    />
  )
}

function SelectLike(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-500',
        props.className,
      )}
    />
  )
}

function formatScanTime(value: string | null) {
  if (!value) {
    return 'Not scanned yet'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString()
}

export function InspectorPanel() {
  const inspectorOpen = useLaunchBrainStore((state) => state.inspectorOpen)
  const inspectorTab = useLaunchBrainStore((state) => state.inspectorTab)
  const toggleInspector = useLaunchBrainStore((state) => state.toggleInspector)
  const setInspectorTab = useLaunchBrainStore((state) => state.setInspectorTab)
  const clips = useLaunchBrainStore((state) => state.clips)
  const tracks = useLaunchBrainStore((state) => state.tracks)
  const samples = useLaunchBrainStore((state) => state.samples)
  const config = useLaunchBrainStore((state) => state.config)
  const transport = useLaunchBrainStore((state) => state.transport)
  const devices = useLaunchBrainStore((state) => state.devices)
  const sampleRootInput = useLaunchBrainStore((state) => state.sampleRootInput)
  const isScanning = useLaunchBrainStore((state) => state.isScanning)
  const playbackEngineStatus = useLaunchBrainStore((state) => state.playbackEngineStatus)
  const layoutPresetName = useLaunchBrainStore((state) => state.layoutPresetName)
  const currentSessionName = useLaunchBrainStore((state) => state.currentSessionName)
  const lastSavedAt = useLaunchBrainStore((state) => state.lastSavedAt)
  const saveStatus = useLaunchBrainStore((state) => state.saveStatus)
  const activePack = useLaunchBrainStore((state) => state.activePack)
  const missingFilesCount = useLaunchBrainStore((state) => state.missingFilesCount)
  const autoFillSettings = useLaunchBrainStore((state) => state.autoFillSettings)
  const autoFillResolvedSourceReason = useLaunchBrainStore((state) => state.autoFillResolvedSourceReason)
  const canUndoClear = useLaunchBrainStore((state) => state.canUndoClear)
  const transportDiagnostics = useLaunchBrainStore((state) => state.transportDiagnostics)
  const selectedSampleId = useLaunchBrainStore((state) => state.selectedSampleId)
  const selectedClipId = useLaunchBrainStore((state) => state.selectedClipId)
  const setSampleRootInput = useLaunchBrainStore((state) => state.setSampleRootInput)
  const saveSampleRoot = useLaunchBrainStore((state) => state.saveSampleRoot)
  const openFolderBrowser = useLaunchBrainStore((state) => state.openFolderBrowser)
  const scanSampleLibrary = useLaunchBrainStore((state) => state.scanSampleLibrary)
  const applyLayoutPreset = useLaunchBrainStore((state) => state.applyLayoutPreset)
  const resetTrackOrder = useLaunchBrainStore((state) => state.resetTrackOrder)
  const clearSelectedClip = useLaunchBrainStore((state) => state.clearSelectedClip)
  const clearRow = useLaunchBrainStore((state) => state.clearRow)
  const clearColumn = useLaunchBrainStore((state) => state.clearColumn)
  const clearAllGrid = useLaunchBrainStore((state) => state.clearAllGrid)
  const removeMissingClips = useLaunchBrainStore((state) => state.removeMissingClips)
  const undoLastClear = useLaunchBrainStore((state) => state.undoLastClear)

  const selectedClip = useMemo(() => clips.find((clip) => clip.id === selectedClipId), [clips, selectedClipId])
  const selectedTrack = useMemo(() => tracks.find((track) => track.selected) ?? tracks[0], [tracks])
  const selectedSample = useMemo(
    () => samples.find((sample) => sample.id === selectedSampleId) ?? null,
    [samples, selectedSampleId],
  )

  const activeSample = useMemo(
    () =>
      selectedClip?.filled
        ? {
            filename: selectedClip.clipName,
            category: selectedClip.category,
            type: selectedClip.type,
            bpm: selectedClip.bpm,
            detectedBpm: selectedClip.detectedBpm,
            bpmSource: selectedClip.bpmSource,
            key: selectedClip.key,
            parsedKey: selectedClip.parsedKey,
            normalizedKey: selectedClip.normalizedKey,
            keySource: selectedClip.keySource,
            keyConfidence: selectedClip.keyConfidence,
            excluded: selectedClip.excluded,
            relativePath: selectedClip.relativePath,
            absolutePath: selectedClip.absolutePath,
            durationSeconds: selectedClip.durationSeconds,
            estimatedBeats: selectedClip.estimatedBeats,
            beatsLength: selectedClip.beatsLength,
            syncStatus: selectedClip.syncStatus,
            playbackRate: selectedClip.playbackRate,
          }
        : selectedSample
          ? {
              filename: selectedSample.filename,
              category: selectedSample.category,
              type: selectedSample.type,
              bpm: selectedSample.bpm,
              detectedBpm: selectedSample.detectedBpm,
              bpmSource: selectedSample.bpmSource,
              key: selectedSample.key,
              parsedKey: selectedSample.parsedKey,
              normalizedKey: selectedSample.normalizedKey,
              keySource: selectedSample.keySource,
              keyConfidence: selectedSample.keyConfidence,
              excluded: selectedSample.excluded,
              relativePath: selectedSample.relativePath,
              absolutePath: selectedSample.absolutePath,
              durationSeconds: selectedSample.durationSeconds,
              estimatedBeats: selectedSample.estimatedBeats,
              beatsLength: selectedSample.beatsLength,
              syncStatus: selectedSample.syncStatus,
              playbackRate: selectedSample.playbackRate,
            }
          : null,
    [selectedClip, selectedSample],
  )

  const sourcePack = activeSample?.relativePath
    ? (() => {
        const [pack] = activeSample.relativePath.split(/[\\/]/)
        return pack && pack.length > 0 ? pack : 'Root'
      })()
    : null

  const projectKey = normalizeKey(`${transport.key} ${transport.scale}`) ?? normalizeKey(transport.key)
  const clipKey = activeSample ? activeSample.normalizedKey ?? normalizeKey(activeSample.key) : null

  const clipWarnings: string[] = []
  if (activeSample) {
    if (!clipKey) {
      clipWarnings.push('Key is unknown.')
    }

    if (activeSample.bpm === null && activeSample.detectedBpm === null) {
      clipWarnings.push('BPM is unknown.')
    }

    if (clipKey && projectKey && !areKeysCompatible(clipKey, projectKey, 'compatible')) {
      clipWarnings.push(`Key may be incompatible with project key (${projectKey}).`)
    }

    if (activeSample.keySource === 'manual') {
      clipWarnings.push('Manual metadata override is active for key.')
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/80">
      <header className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setInspectorTab(tab)}
              className={cn(
                'rounded-md border px-2 py-1 text-xs transition',
                inspectorTab === tab
                  ? 'border-sky-500/50 bg-sky-500/15 text-sky-200'
                  : 'border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-100',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={toggleInspector}
          className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-100"
          aria-label={inspectorOpen ? 'Collapse inspector panel' : 'Expand inspector panel'}
        >
          {inspectorOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          {inspectorOpen ? 'Collapse' : 'Expand'}
        </button>
      </header>

      {inspectorOpen && (
        <div className="max-h-[32vh] overflow-y-auto p-3">
          {inspectorTab === 'Clip' && (
            <>
              {!activeSample ? (
                <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-300">
                  No clip/sample selected. Click a browser sample or clip slot to inspect metadata.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
                    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
                    <div className="h-20 rounded-md border border-violet-500/30 bg-violet-500/15" />
                    <p className="text-xs text-slate-300">
                      {activeSample.bpm ?? '--'} BPM - {activeSample.normalizedKey ?? activeSample.key ?? '--'} -{' '}
                      {activeSample.type ?? '--'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {activeSample.keySource === 'manual' && (
                        <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-200">
                          Manual Key Override
                        </span>
                      )}
                      {activeSample.excluded && (
                        <span className="rounded border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.5 text-[10px] text-rose-200">
                          Excluded From Auto Fill
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Field label="Filename">
                      <InputLike value={activeSample.filename ?? ''} readOnly />
                    </Field>
                    <Field label="Category">
                      <InputLike value={activeSample.category ?? ''} readOnly />
                    </Field>
                    <Field label="Type">
                      <InputLike value={activeSample.type ?? ''} readOnly />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Field label="BPM">
                      <InputLike value={activeSample.bpm ?? ''} readOnly />
                    </Field>
                    <Field label="Detected BPM">
                      <InputLike
                        value={activeSample.detectedBpm ?? ''}
                        readOnly
                      />
                    </Field>
                    <Field label="Key">
                      <InputLike value={activeSample.normalizedKey ?? activeSample.key ?? ''} readOnly />
                    </Field>
                    <Field label="Parsed Key">
                      <InputLike value={activeSample.parsedKey ?? ''} readOnly />
                    </Field>
                    <Field label="Key Source">
                      <InputLike value={activeSample.keySource ?? 'unknown'} readOnly />
                    </Field>
                    <Field label="Key Confidence">
                      <InputLike value={activeSample.keyConfidence ?? 'low'} readOnly />
                    </Field>
                    <Field label="BPM Source">
                      <InputLike value={activeSample.bpmSource ?? 'unknown'} readOnly />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Field label="Duration (s)">
                      <InputLike
                        value={
                          activeSample.durationSeconds !== null && activeSample.durationSeconds !== undefined
                            ? activeSample.durationSeconds.toFixed(3)
                            : ''
                        }
                        readOnly
                      />
                    </Field>
                    <Field label="Estimated Beats">
                      <InputLike value={activeSample.estimatedBeats ?? ''} readOnly />
                    </Field>
                    <Field label="Beats Length">
                      <InputLike value={activeSample.beatsLength ?? ''} readOnly />
                    </Field>
                    <Field label="Sync Status">
                      <InputLike value={activeSample.syncStatus ?? 'unsupported'} readOnly />
                    </Field>
                    <Field label="Playback Rate">
                      <InputLike
                        value={
                          activeSample.playbackRate !== null && activeSample.playbackRate !== undefined
                            ? activeSample.playbackRate.toFixed(4)
                            : ''
                        }
                        readOnly
                      />
                    </Field>
                    <Field label="Relative Path">
                      <InputLike value={activeSample.relativePath ?? ''} readOnly />
                    </Field>
                    <Field label="Source Pack">
                      <InputLike value={sourcePack ?? ''} readOnly />
                    </Field>
                    <Field label="Absolute Path">
                      <InputLike value={activeSample.absolutePath ?? ''} readOnly />
                    </Field>
                      <Field label="Notes / Metadata">
                        <InputLike defaultValue="Metadata from scanned file index." />
                      </Field>
                    </div>
                  </div>
                  {clipWarnings.length > 0 && (
                    <div className="xl:col-span-4 space-y-1 rounded-md border border-amber-500/35 bg-amber-500/10 p-2">
                      {clipWarnings.map((warning) => (
                        <p key={warning} className="text-xs text-amber-200">
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5 rounded-md border border-slate-800 bg-slate-900/35 p-2">
                <button
                  type="button"
                  onClick={clearSelectedClip}
                  className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200 transition hover:border-slate-500"
                >
                  Clear Selected Clip
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedClip) {
                      return
                    }
                    clearRow(selectedClip.sceneIndex)
                  }}
                  disabled={!selectedClip}
                  className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200 transition hover:border-slate-500 disabled:opacity-40"
                >
                  Clear Selected Row
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedClip) {
                      return
                    }
                    clearColumn(selectedClip.trackIndex)
                  }}
                  disabled={!selectedClip}
                  className="rounded border border-slate-700 px-2 py-1 text-[11px] text-slate-200 transition hover:border-slate-500 disabled:opacity-40"
                >
                  Clear Selected Column
                </button>
              </div>
            </>
          )}

          {inspectorTab === 'Track' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Record Arm">
                <SelectLike value={selectedTrack.armed ? 'On' : 'Off'} onChange={() => undefined}>
                  <option>On</option>
                  <option>Off</option>
                </SelectLike>
              </Field>
              <Field label="Input Monitor">
                <SelectLike defaultValue="Auto">
                  <option>Auto</option>
                  <option>In</option>
                  <option>Off</option>
                </SelectLike>
              </Field>
              <Field label="Output">
                <SelectLike defaultValue="Master">
                  <option>Master</option>
                  <option>Bus A</option>
                  <option>Bus B</option>
                </SelectLike>
              </Field>
              <Field label="Track Color">
                <InputLike value={selectedTrack.color} readOnly />
              </Field>
              <Field label="Send Level">
                <InputLike defaultValue="12%" />
              </Field>
              <Field label="Selected Instrument">
                <InputLike defaultValue="Sampler Rack" />
              </Field>
            </div>
          )}

          {inspectorTab === 'Device' && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-300">
              Device chain placeholder: Sampler, EQ, Compressor, Saturation, Utility.
            </div>
          )}

          {inspectorTab === 'Record' && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Fixed Length">
                <SelectLike defaultValue="8 Bars">
                  <option>1 Bar</option>
                  <option>2 Bars</option>
                  <option>4 Bars</option>
                  <option>8 Bars</option>
                </SelectLike>
              </Field>
              <Field label="Input Source">
                <SelectLike defaultValue="MIDI + Mic">
                  <option>MIDI + Mic</option>
                  <option>MIDI Only</option>
                  <option>Mic Only</option>
                </SelectLike>
              </Field>
              <Field label="Mic Input">
                <SelectLike defaultValue="Input 1">
                  <option>Input 1</option>
                  <option>Input 2</option>
                </SelectLike>
              </Field>
              <Field label="Direct Monitor">
                <SelectLike defaultValue="On">
                  <option>On</option>
                  <option>Off</option>
                </SelectLike>
              </Field>
              <Field label="Vocal Tuning Target Key">
                <InputLike defaultValue="C Minor" />
              </Field>
              <Field label="Auto Trim">
                <SelectLike defaultValue="Enabled">
                  <option>Enabled</option>
                  <option>Disabled</option>
                </SelectLike>
              </Field>
              <Field label="Normalize">
                <SelectLike defaultValue="Enabled">
                  <option>Enabled</option>
                  <option>Disabled</option>
                </SelectLike>
              </Field>
            </div>
          )}

          {inspectorTab === 'Session' && (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_1fr]">
              <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/45 p-3">
                <h4 className="panel-label">Sample Root</h4>
                <div className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200">
                  {config.sampleRoot ?? 'No sample root selected'}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      void openFolderBrowser()
                    }}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 transition hover:border-slate-500"
                  >
                    Browse Folder
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void scanSampleLibrary()
                    }}
                    disabled={isScanning}
                    className="rounded border border-sky-500/40 bg-sky-500/15 px-2 py-1.5 text-xs text-sky-200 transition hover:bg-sky-500/25 disabled:opacity-60"
                  >
                    {isScanning ? 'Scanning...' : config.lastScanAt ? 'Rescan' : 'Scan'}
                  </button>
                </div>
                <details className="rounded-md border border-slate-800 bg-slate-950/60 p-2">
                  <summary className="cursor-pointer text-[11px] text-slate-400">Advanced manual path</summary>
                  <div className="mt-2 space-y-1.5">
                    <InputLike
                      value={sampleRootInput}
                      onChange={(event) => setSampleRootInput(event.target.value)}
                      placeholder="Paste absolute path"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void saveSampleRoot()
                      }}
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 transition hover:border-slate-500"
                    >
                      Set Sample Root
                    </button>
                  </div>
                </details>
                <p className="text-[11px] text-slate-400">Last scan: {formatScanTime(config.lastScanAt)}</p>
                <p className="text-[11px] text-slate-400">Sample count: {samples.length}</p>
              </div>

              <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900/45 p-3">
                <h4 className="panel-label">Session & Hardware</h4>
                <p className="text-xs text-slate-200">{playbackEngineStatus}</p>
                <div className="space-y-1 rounded-md border border-slate-800 bg-slate-950/60 p-2">
                  <p className="text-[11px] text-slate-300">Session: {currentSessionName}</p>
                  <p className="text-[11px] text-slate-400">Selected pack: {activePack ?? 'None'}</p>
                  <p className="text-[11px] text-slate-400">Save status: {saveStatus}</p>
                  <p className="text-[11px] text-slate-400">
                    Last saved: {lastSavedAt ? formatScanTime(lastSavedAt) : 'Never'}
                  </p>
                  <p className={cn('text-[11px]', missingFilesCount > 0 ? 'text-amber-300' : 'text-slate-400')}>
                    Missing files: {missingFilesCount}
                  </p>
                </div>
                <div className="space-y-1 rounded-md border border-slate-800 bg-slate-950/60 p-2">
                  <p className="text-[11px] text-slate-300">Track Layout</p>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-1.5">
                    <SelectLike
                      value={layoutPresetName}
                      onChange={(event) => applyLayoutPreset(event.target.value as LayoutPresetName)}
                    >
                      {LAYOUT_PRESET_NAMES.map((preset) => (
                        <option key={preset} value={preset}>
                          {preset}
                        </option>
                      ))}
                    </SelectLike>
                    <button
                      type="button"
                      onClick={resetTrackOrder}
                      className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 transition hover:border-slate-500"
                    >
                      Reset
                    </button>
                  </div>
                </div>
                <div className="space-y-1 rounded-md border border-slate-800 bg-slate-950/60 p-2">
                  <p className="text-[11px] text-slate-300">
                    Auto Fill source: {autoFillSettings.sourceScope}
                  </p>
                  {autoFillResolvedSourceReason ? (
                    <p className="text-[11px] text-slate-500">{autoFillResolvedSourceReason}</p>
                  ) : null}
                  <p className="text-[11px] text-slate-400">
                    Target BPM: {autoFillSettings.targetBpm ?? 'Auto'} (+/-{autoFillSettings.bpmTolerance})
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Key: {autoFillSettings.targetKey ?? 'Auto'} ({autoFillSettings.keyStrictness})
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Allow neutral strict: {autoFillSettings.allowKeyNeutralStrict ? 'Yes' : 'No'} | Allow unknown key:{' '}
                    {autoFillSettings.allowUnknownKeySamples ? 'Yes' : 'No'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Prefer loops: {autoFillSettings.preferLoops ? 'Yes' : 'No'} | FX one-shots only:{' '}
                    {autoFillSettings.allowOneShotsInFXOnly ? 'Yes' : 'No'}
                  </p>
                </div>
                <div className="space-y-1 rounded-md border border-slate-800 bg-slate-950/60 p-2">
                  <p className="text-[11px] text-slate-300">Hardware Plan</p>
                  <p className="text-[11px] text-slate-400">
                    Launchpad Pro MK3: {devices.midi.launchpadDetected ? 'Connected' : 'Not connected'}
                  </p>
                  {LAUNCHPAD_MODE_PLAN.map((mode) => (
                    <p key={mode.mode} className="text-[11px] text-slate-500">
                      {mode.mode}: {mode.description}
                    </p>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm('Clear all clips from grid?')) {
                        return
                      }
                      clearAllGrid()
                    }}
                    className="rounded border border-amber-500/40 bg-amber-500/15 px-2 py-1.5 text-xs text-amber-200 transition hover:bg-amber-500/25"
                  >
                    Clear All Grid
                  </button>
                  <button
                    type="button"
                    onClick={removeMissingClips}
                    className="rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 transition hover:border-slate-500"
                  >
                    Remove Missing
                  </button>
                  <button
                    type="button"
                    onClick={undoLastClear}
                    disabled={!canUndoClear}
                    className="col-span-2 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 transition hover:border-slate-500 disabled:opacity-40"
                  >
                    Undo Last Clear
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Quantized session launch is enabled via transport clock and launch queue.
                </p>
                {import.meta.env.DEV ? (
                  <details className="rounded-md border border-slate-800 bg-slate-950/60 p-2">
                    <summary className="cursor-pointer text-[11px] text-slate-300">Transport Diagnostics</summary>
                    <div className="mt-2 space-y-1 text-[11px] text-slate-400">
                      <p>AudioContext: {transportDiagnostics.audioContextState}</p>
                      <p>Transport running: {transportDiagnostics.transportRunning ? 'Yes' : 'No'}</p>
                      <p>
                        Start time: {transportDiagnostics.transportStartTime !== null
                          ? transportDiagnostics.transportStartTime.toFixed(3)
                          : '--'}
                      </p>
                      <p>
                        Current audio time: {transportDiagnostics.currentAudioTime !== null
                          ? transportDiagnostics.currentAudioTime.toFixed(3)
                          : '--'}
                      </p>
                      <p>Current beat: {transportDiagnostics.currentBeat.toFixed(2)}</p>
                      <p>
                        Next boundary: {transportDiagnostics.nextBoundaryTime !== null
                          ? transportDiagnostics.nextBoundaryTime.toFixed(3)
                          : '--'}
                      </p>
                      <p>Queued events: {transportDiagnostics.queuedEventsCount}</p>
                      <p>Playing clips: {transportDiagnostics.playingClipsCount}</p>
                    </div>
                  </details>
                ) : null}
              </div>
            </div>
          )}

          {inspectorTab === 'Routing' && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-300">
              Routing options placeholder: MIDI input mapping, output buses, send/return and external FX sends.
            </div>
          )}
        </div>
      )}
    </section>
  )
}
