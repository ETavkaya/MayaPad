import { useEffect } from 'react'
import { Settings } from 'lucide-react'
import { AssistantPanel } from '../features/assistant/AssistantPanel'
import { BrowserSidebar } from '../features/browser/BrowserSidebar'
import { InspectorPanel } from '../features/inspector/InspectorPanel'
import { SessionWorkspace } from '../features/session/SessionWorkspace'
import { TransportBar } from '../features/transport/TransportBar'
import { useLaunchBrainStore } from '../store/useLaunchBrainStore'

export function LaunchBrainPage() {
  const lastAction = useLaunchBrainStore((state) => state.lastAction)
  const playbackEngineStatus = useLaunchBrainStore((state) => state.playbackEngineStatus)
  const isBootstrapping = useLaunchBrainStore((state) => state.isBootstrapping)
  const config = useLaunchBrainStore((state) => state.config)
  const activePack = useLaunchBrainStore((state) => state.activePack)
  const previewingFilename = useLaunchBrainStore((state) => state.previewingFilename)
  const errorMessage = useLaunchBrainStore((state) => state.errorMessage)
  const initializeApp = useLaunchBrainStore((state) => state.initializeApp)
  const openInspectorTab = useLaunchBrainStore((state) => state.openInspectorTab)

  const rootLabel = config.sampleRoot
    ? config.sampleRoot.split(/[\\/]/).filter(Boolean).at(-1) ?? config.sampleRoot
    : 'No Root'

  useEffect(() => {
    void initializeApp()
  }, [initializeApp])

  return (
    <main className="mx-auto grid h-screen max-h-screen w-full max-w-[1800px] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-2 overflow-hidden p-3 text-slate-100">
      <TransportBar />

      <div className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300">
        <div className="min-w-0">
          <span className="text-slate-500">Status:</span>{' '}
          {isBootstrapping ? 'Loading config and device status...' : errorMessage ?? lastAction}
          <span className="ml-3 text-slate-500">{playbackEngineStatus}</span>
          {previewingFilename ? (
            <span className="ml-3 inline-block max-w-[22rem] truncate text-emerald-300">
              Previewing: {previewingFilename}
            </span>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded border border-slate-800 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-300">
          <span className="truncate">Root: {rootLabel}</span>
          <span className="truncate text-slate-500">| Active Bank: {activePack ?? 'None'}</span>
          <button
            type="button"
            onClick={() => openInspectorTab('Session')}
            className="rounded border border-slate-700 p-1 text-slate-300 transition hover:border-slate-500"
            aria-label="Open session settings"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <section className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)_300px] 2xl:grid-cols-[290px_minmax(0,1fr)_320px]">
        <BrowserSidebar />
        <SessionWorkspace />
        <div className="min-h-0 lg:col-span-2 xl:col-span-1">
          <AssistantPanel />
        </div>
      </section>

      <InspectorPanel />
    </main>
  )
}
