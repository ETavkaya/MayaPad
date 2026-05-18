import { AudioLines, Circle, Cpu, Disc3, Play, Square, Usb } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { useLaunchBrainStore } from '../../store/useLaunchBrainStore'
import { cn } from '../../components/ui/cn'

const KEY_OPTIONS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const SCALE_OPTIONS = ['Minor', 'Major', 'Dorian', 'Mixolydian', 'Pentatonic']
const QUANTIZE_OPTIONS = ['None', '1/4', '1/2', '1 Bar', '2 Bars', '4 Bars', '8 Bars'] as const

function StatusBadge({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </div>
      <p className="text-xs text-slate-200">{value}</p>
    </div>
  )
}

function formatAudioLabel(status: { status: string; selected: string | null; available: string[] }) {
  if (status.status !== 'connected') {
    return 'Not connected'
  }

  return status.selected ?? status.available[0] ?? 'Connected'
}

function formatMidiLabel(status: {
  status: string
  launchpadDetected: boolean
  launchkeyDetected: boolean
  inputs: string[]
}) {
  if (status.status !== 'connected') {
    return 'Not connected'
  }

  if (status.launchpadDetected) {
    return 'Launchpad detected'
  }

  if (status.launchkeyDetected) {
    return 'Launchkey detected'
  }

  return status.inputs[0] ?? 'Connected'
}

function MetronomeRing({
  progress,
  beatInCycle,
  cycleBeats,
  isPlaying,
}: {
  progress: number
  beatInCycle: number
  cycleBeats: number
  isPlaying: boolean
}) {
  const segments = Math.max(1, Math.min(16, cycleBeats))
  const activeIndex = Math.min(segments, Math.max(1, beatInCycle))

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5">
      <div className="grid min-w-[64px] grid-cols-4 gap-1">
        {Array.from({ length: segments }).map((_, index) => {
          const segmentNumber = index + 1
          const isActive = segmentNumber <= activeIndex
          return (
            <span
              key={`seg-${segmentNumber}`}
              className={cn(
                'h-1.5 rounded-sm border border-slate-700/80',
                isActive ? 'bg-sky-400/80' : 'bg-slate-800',
                isPlaying && segmentNumber === activeIndex && 'animate-pulse',
              )}
            />
          )
        })}
      </div>
      <div className="min-w-[3.5rem]">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">Quantize</p>
        <p className="text-xs text-slate-100">
          Beat {Math.max(1, Math.min(cycleBeats, beatInCycle))} / {cycleBeats}
        </p>
        <p className="text-[10px] text-slate-500">{Math.round(progress * 100)}%</p>
      </div>
    </div>
  )
}

export function TransportBar() {
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false)
  const transport = useLaunchBrainStore((state) => state.transport)
  const devices = useLaunchBrainStore((state) => state.devices)
  const clockProgress = useLaunchBrainStore((state) => state.clockProgress)
  const clockBeatInCycle = useLaunchBrainStore((state) => state.clockBeatInCycle)
  const clockQuantizeBeats = useLaunchBrainStore((state) => state.clockQuantizeBeats)
  const currentSessionName = useLaunchBrainStore((state) => state.currentSessionName)
  const saveStatus = useLaunchBrainStore((state) => state.saveStatus)
  const recentSessions = useLaunchBrainStore((state) => state.recentSessions)
  const selectedRecentSessionId = useLaunchBrainStore((state) => state.selectedRecentSessionId)
  const setTransportPlay = useLaunchBrainStore((state) => state.setTransportPlay)
  const setTransportStop = useLaunchBrainStore((state) => state.setTransportStop)
  const toggleRecord = useLaunchBrainStore((state) => state.toggleRecord)
  const setTempo = useLaunchBrainStore((state) => state.setTempo)
  const setTimeSignature = useLaunchBrainStore((state) => state.setTimeSignature)
  const setQuantize = useLaunchBrainStore((state) => state.setQuantize)
  const setKey = useLaunchBrainStore((state) => state.setKey)
  const setScale = useLaunchBrainStore((state) => state.setScale)
  const refreshSavedSessions = useLaunchBrainStore((state) => state.refreshSavedSessions)
  const saveCurrentSession = useLaunchBrainStore((state) => state.saveCurrentSession)
  const loadSavedSession = useLaunchBrainStore((state) => state.loadSavedSession)
  const setSelectedRecentSessionId = useLaunchBrainStore((state) => state.setSelectedRecentSessionId)

  return (
    <header className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 shadow-[0_15px_40px_-25px_rgba(2,132,199,0.8)]">
      <div className="pr-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100">LaunchBrain</h1>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-1 py-1">
          <button
            type="button"
            onClick={setTransportPlay}
            className={cn(
              'rounded-md p-2 transition',
              transport.isPlaying
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
            )}
            aria-label="Play"
          >
            <Play className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={setTransportStop}
            className="rounded-md p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
            aria-label="Stop"
          >
            <Square className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleRecord}
            disabled
            className="cursor-not-allowed rounded-md p-2 text-slate-600"
            aria-label="Record disabled"
          >
            <Circle className="h-4 w-4" />
          </button>
        </div>

        <label className="transport-field">
          <span>Tempo</span>
          <input
            type="number"
            min={60}
            max={200}
            value={transport.tempo}
            onChange={(event) => setTempo(Number(event.target.value))}
          />
        </label>

        <label className="transport-field">
          <span>Time Sig</span>
          <select
            value={transport.timeSignature}
            onChange={(event) => setTimeSignature(event.target.value as '4/4' | '3/4' | '6/8')}
          >
            <option>4/4</option>
            <option>3/4</option>
            <option>6/8</option>
          </select>
        </label>

        <label className="transport-field">
          <span>Quantize</span>
          <select
            value={transport.quantize}
            onChange={(event) =>
              setQuantize(
                event.target.value as
                  | 'None'
                  | '1/4'
                  | '1/2'
                  | '1 Bar'
                  | '2 Bars'
                  | '4 Bars'
                  | '8 Bars',
              )
            }
          >
            {QUANTIZE_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>

        <MetronomeRing
          progress={clockProgress}
          beatInCycle={clockBeatInCycle}
          cycleBeats={clockQuantizeBeats}
          isPlaying={transport.isPlaying}
        />

        <label className="transport-field">
          <span>Key</span>
          <select value={transport.key} onChange={(event) => setKey(event.target.value)}>
            {KEY_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>

        <label className="transport-field">
          <span>Scale</span>
          <select value={transport.scale} onChange={(event) => setScale(event.target.value)}>
            {SCALE_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setSessionMenuOpen((value) => !value)
              void refreshSavedSessions()
            }}
            className="rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-xs text-slate-200 transition hover:border-slate-600"
          >
            Set: {currentSessionName} ({saveStatus})
          </button>

          {sessionMenuOpen && (
            <div className="absolute right-0 top-9 z-40 w-72 rounded-lg border border-slate-700 bg-slate-950/95 p-2 shadow-2xl">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    void saveCurrentSession(false)
                  }}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 transition hover:border-slate-500"
                >
                  Save Set
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const nextName = window.prompt('Save Set As name', currentSessionName)
                    if (!nextName) {
                      return
                    }

                    void saveCurrentSession(true, nextName)
                  }}
                  className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 transition hover:border-slate-500"
                >
                  Save Set As
                </button>
              </div>

              <div className="mt-2 rounded border border-slate-800 bg-slate-900/50 p-1.5">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Load Set</p>
                <select
                  value={selectedRecentSessionId ?? ''}
                  onChange={(event) => setSelectedRecentSessionId(event.target.value || null)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none"
                >
                  <option value="">Select saved set...</option>
                  {recentSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedRecentSessionId) {
                      return
                    }

                    void loadSavedSession(selectedRecentSessionId)
                    setSessionMenuOpen(false)
                  }}
                  className="mt-1.5 w-full rounded border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-xs text-sky-200 transition hover:bg-sky-500/25 disabled:opacity-50"
                  disabled={!selectedRecentSessionId}
                >
                  Load Selected
                </button>
              </div>

              {recentSessions.length > 0 && (
                <div className="mt-2 rounded border border-slate-800 bg-slate-900/50 p-1.5">
                  <p className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Recent Sets</p>
                  <div className="max-h-28 space-y-1 overflow-y-auto">
                    {recentSessions.slice(0, 6).map((session) => (
                      <button
                        type="button"
                        key={session.id}
                        onClick={() => {
                          setSelectedRecentSessionId(session.id)
                          void loadSavedSession(session.id)
                          setSessionMenuOpen(false)
                        }}
                        className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-left text-xs text-slate-200 transition hover:border-slate-600"
                      >
                        <p className="truncate">{session.name}</p>
                        <p className="truncate text-[10px] text-slate-500">
                          {session.updatedAt ? new Date(session.updatedAt).toLocaleString() : 'Unknown'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <StatusBadge
          label="Audio"
          value={formatAudioLabel(devices.audio)}
          icon={<AudioLines className="h-3 w-3" />}
        />
        <StatusBadge
          label="MIDI"
          value={formatMidiLabel(devices.midi)}
          icon={<Usb className="h-3 w-3" />}
        />
        <StatusBadge label="CPU (mock)" value="12%" icon={<Cpu className="h-3 w-3" />} />
        <Disc3 className="h-4 w-4 text-slate-500" />
      </div>
    </header>
  )
}
