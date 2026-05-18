import { ChevronDown, ChevronRight, Folder, FolderOpen, Play, Search, Square } from 'lucide-react'
import { useMemo } from 'react'
import type { SampleType } from '../../types'
import { Panel } from '../../components/ui/Panel'
import { cn } from '../../components/ui/cn'
import { useLaunchBrainStore } from '../../store/useLaunchBrainStore'

function samplePackName(relativePath: string) {
  const [pack] = relativePath.split(/[\\/]/)
  return pack && pack.length > 0 ? pack : 'Root'
}

function countBy<T extends string | number>(values: T[]) {
  const map = new Map<T, number>()

  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1)
  }

  return map
}

function FilterGroup({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <section className="rounded-md border border-slate-800 bg-slate-900/45">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between border-b border-slate-800 px-2 py-1.5 text-left text-[11px] uppercase tracking-wide text-slate-300"
      >
        <span>{title}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
        )}
      </button>
      {open && <div className="max-h-36 overflow-y-auto p-1.5">{children}</div>}
    </section>
  )
}

function FilterItem({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition',
        active ? 'bg-sky-500/15 text-sky-100' : 'text-slate-300 hover:bg-slate-800/80',
      )}
    >
      <span className="truncate">{label}</span>
      <span className="rounded-sm border border-slate-700 px-1 py-0 text-[10px] text-slate-400">{count}</span>
    </button>
  )
}

export function BrowserSidebar() {
  const categories = useLaunchBrainStore((state) => state.categories)
  const samples = useLaunchBrainStore((state) => state.samples)
  const selectedSampleId = useLaunchBrainStore((state) => state.selectedSampleId)
  const browserQuery = useLaunchBrainStore((state) => state.browserQuery)
  const previewingSampleId = useLaunchBrainStore((state) => state.previewingSampleId)
  const activePack = useLaunchBrainStore((state) => state.activePack)
  const activeCategoryFilter = useLaunchBrainStore((state) => state.activeCategoryFilter)
  const activeBpmFilter = useLaunchBrainStore((state) => state.activeBpmFilter)
  const activeKeyFilter = useLaunchBrainStore((state) => state.activeKeyFilter)
  const activeTypeFilter = useLaunchBrainStore((state) => state.activeTypeFilter)
  const explorerGroupsOpen = useLaunchBrainStore((state) => state.explorerGroupsOpen)
  const autoFillSettings = useLaunchBrainStore((state) => state.autoFillSettings)
  const folderBrowserOpen = useLaunchBrainStore((state) => state.folderBrowserOpen)
  const folderBrowserLoading = useLaunchBrainStore((state) => state.folderBrowserLoading)
  const folderBrowserError = useLaunchBrainStore((state) => state.folderBrowserError)
  const filesystemRoots = useLaunchBrainStore((state) => state.filesystemRoots)
  const folderBrowserPath = useLaunchBrainStore((state) => state.folderBrowserPath)
  const folderBrowserParentPath = useLaunchBrainStore((state) => state.folderBrowserParentPath)
  const folderBrowserFolders = useLaunchBrainStore((state) => state.folderBrowserFolders)
  const folderBrowserAudioFileCountDirect = useLaunchBrainStore(
    (state) => state.folderBrowserAudioFileCountDirect,
  )
  const folderBrowserAudioFileCountRecursiveEstimate = useLaunchBrainStore(
    (state) => state.folderBrowserAudioFileCountRecursiveEstimate,
  )

  const setBrowserQuery = useLaunchBrainStore((state) => state.setBrowserQuery)
  const selectBrowserFile = useLaunchBrainStore((state) => state.selectBrowserFile)
  const loadSelectedFileToSelectedClip = useLaunchBrainStore((state) => state.loadSelectedFileToSelectedClip)
  const loadSampleToSelectedClip = useLaunchBrainStore((state) => state.loadSampleToSelectedClip)
  const closeFolderBrowser = useLaunchBrainStore((state) => state.closeFolderBrowser)
  const navigateFolderBrowser = useLaunchBrainStore((state) => state.navigateFolderBrowser)
  const navigateFolderBrowserParent = useLaunchBrainStore((state) => state.navigateFolderBrowserParent)
  const applyCurrentFolderAsSampleRoot = useLaunchBrainStore(
    (state) => state.applyCurrentFolderAsSampleRoot,
  )
  const setActivePack = useLaunchBrainStore((state) => state.setActivePack)
  const setActiveCategoryFilter = useLaunchBrainStore((state) => state.setActiveCategoryFilter)
  const setActiveBpmFilter = useLaunchBrainStore((state) => state.setActiveBpmFilter)
  const setActiveKeyFilter = useLaunchBrainStore((state) => state.setActiveKeyFilter)
  const setActiveTypeFilter = useLaunchBrainStore((state) => state.setActiveTypeFilter)
  const clearLibraryFilters = useLaunchBrainStore((state) => state.clearLibraryFilters)
  const toggleExplorerGroup = useLaunchBrainStore((state) => state.toggleExplorerGroup)

  const packCounts = useMemo(() => {
    return countBy(samples.map((sample) => samplePackName(sample.relativePath)))
  }, [samples])

  const sortedPackEntries = useMemo(() => {
    return [...packCounts.entries()].sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0]),
    )
  }, [packCounts])

  const categoryCounts = useMemo(() => {
    return countBy(samples.map((sample) => sample.category))
  }, [samples])

  const sortedCategoryEntries = useMemo(() => {
    const preferredOrder = categories.map((category) => category.name)
    const rest = [...categoryCounts.keys()].filter((entry) => !preferredOrder.includes(entry))
    const combined = [...preferredOrder, ...rest]

    return combined
      .filter((entry) => categoryCounts.has(entry))
      .map((entry) => [entry, categoryCounts.get(entry) ?? 0] as const)
  }, [categories, categoryCounts])

  const bpmCounts = useMemo(() => {
    const values = samples.map((sample) => sample.bpm).filter((bpm): bpm is number => bpm !== null)
    return countBy(values)
  }, [samples])

  const keyCounts = useMemo(() => {
    const values = samples.map((sample) => sample.key).filter((key): key is string => Boolean(key))
    return countBy(values)
  }, [samples])

  const typeCounts = useMemo(() => {
    return countBy(samples.map((sample) => sample.type))
  }, [samples])

  const filteredSamples = useMemo(() => {
    return samples.filter((sample) => {
      const pack = samplePackName(sample.relativePath)
      const matchesPack = !activePack || pack === activePack
      const matchesCategory = !activeCategoryFilter || sample.category === activeCategoryFilter
      const matchesBpm = activeBpmFilter === null || sample.bpm === activeBpmFilter
      const matchesKey = !activeKeyFilter || sample.key === activeKeyFilter
      const matchesType = !activeTypeFilter || sample.type === activeTypeFilter
      const query = browserQuery.trim().toLowerCase()
      const matchesQuery =
        query.length === 0 ||
        sample.filename.toLowerCase().includes(query) ||
        sample.relativePath.toLowerCase().includes(query) ||
        sample.tags.some((tag) => tag.toLowerCase().includes(query))

      return matchesPack && matchesCategory && matchesBpm && matchesKey && matchesType && matchesQuery
    })
  }, [
    samples,
    activePack,
    activeCategoryFilter,
    activeBpmFilter,
    activeKeyFilter,
    activeTypeFilter,
    browserQuery,
  ])

  const selectedTypeLabel = activeTypeFilter ?? 'Any'
  const selectedSourceLabel =
    autoFillSettings.sourceScope === 'selectedPack'
      ? 'selected pack'
      : autoFillSettings.sourceScope === 'autoBestPack'
        ? 'auto best pack'
        : 'entire library'

  return (
    <>
      <Panel className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 space-y-3 overflow-y-auto p-3">
          <section className="space-y-2">
            <h3 className="panel-label">Library Explorer</h3>

            <FilterGroup
              title="Packs / Top-level Folders"
              open={explorerGroupsOpen.packs}
              onToggle={() => toggleExplorerGroup('packs')}
            >
              {sortedPackEntries.length === 0 && <p className="px-2 py-1 text-xs text-slate-500">No packs yet.</p>}
              {sortedPackEntries.map(([pack, count]) => (
                <FilterItem
                  key={pack}
                  active={activePack === pack}
                  label={pack}
                  count={count}
                  onClick={() => setActivePack(activePack === pack ? null : pack)}
                />
              ))}
            </FilterGroup>

            <FilterGroup
              title="Categories"
              open={explorerGroupsOpen.categories}
              onToggle={() => toggleExplorerGroup('categories')}
            >
              {sortedCategoryEntries.length === 0 && (
                <p className="px-2 py-1 text-xs text-slate-500">No categories yet.</p>
              )}
              {sortedCategoryEntries.map(([category, count]) => (
                <FilterItem
                  key={category}
                  active={activeCategoryFilter === category}
                  label={category}
                  count={count}
                  onClick={() => setActiveCategoryFilter(activeCategoryFilter === category ? null : category)}
                />
              ))}
            </FilterGroup>

            <FilterGroup
              title="BPM Groups"
              open={explorerGroupsOpen.bpm}
              onToggle={() => toggleExplorerGroup('bpm')}
            >
              {[...bpmCounts.entries()]
                .sort((left, right) => left[0] - right[0])
                .map(([bpm, count]) => (
                  <FilterItem
                    key={bpm}
                    active={activeBpmFilter === bpm}
                    label={`${bpm} BPM`}
                    count={count}
                    onClick={() => setActiveBpmFilter(activeBpmFilter === bpm ? null : bpm)}
                  />
                ))}
            </FilterGroup>

            <FilterGroup
              title="Key Groups"
              open={explorerGroupsOpen.key}
              onToggle={() => toggleExplorerGroup('key')}
            >
              {[...keyCounts.entries()]
                .sort((left, right) => left[0].localeCompare(right[0]))
                .map(([key, count]) => (
                  <FilterItem
                    key={key}
                    active={activeKeyFilter === key}
                    label={key}
                    count={count}
                    onClick={() => setActiveKeyFilter(activeKeyFilter === key ? null : key)}
                  />
                ))}
            </FilterGroup>

            <FilterGroup
              title="Type Groups"
              open={explorerGroupsOpen.type}
              onToggle={() => toggleExplorerGroup('type')}
            >
              {(['loop', 'one-shot', 'unknown'] as SampleType[]).map((sampleType) => (
                <FilterItem
                  key={sampleType}
                  active={activeTypeFilter === sampleType}
                  label={sampleType}
                  count={typeCounts.get(sampleType) ?? 0}
                  onClick={() => setActiveTypeFilter(activeTypeFilter === sampleType ? null : sampleType)}
                />
              ))}
            </FilterGroup>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="panel-label">Results</h3>
              <button
                type="button"
                onClick={clearLibraryFilters}
                className="rounded border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300 transition hover:border-slate-500"
              >
                Clear Filters
              </button>
            </div>

            <div className="rounded-md border border-slate-800 bg-slate-900/45 px-2 py-1.5 text-[11px] text-slate-300">
              <p className="truncate">Selected pack: {activePack ?? 'Any'}</p>
              <p className="truncate">
                Target BPM: {autoFillSettings.targetBpm ?? 'Auto'} | Key: {autoFillSettings.targetKey ?? 'Auto'}
              </p>
              <p className="truncate">
                Source: {selectedSourceLabel} | Type: {selectedTypeLabel} | Results: {filteredSamples.length}
              </p>
            </div>

            <label className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-400 focus-within:border-sky-500">
              <Search className="h-3.5 w-3.5" />
              <input
                type="search"
                value={browserQuery}
                onChange={(event) => setBrowserQuery(event.target.value)}
                placeholder="Search filtered files..."
                className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
              />
            </label>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={loadSelectedFileToSelectedClip}
                className="flex-1 rounded border border-sky-500/40 bg-sky-500/15 px-2 py-1.5 text-xs text-sky-200 transition hover:bg-sky-500/25"
              >
                Load To Clip
              </button>
            </div>

            <ul className="space-y-1.5">
              {filteredSamples.length === 0 && (
                <li className="rounded-md border border-slate-800 bg-slate-900/40 px-2 py-2 text-xs text-slate-500">
                  No samples match current filters.
                </li>
              )}
              {filteredSamples.map((sample) => {
                const pack = samplePackName(sample.relativePath)
                return (
                  <li key={sample.id}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/launchbrain-sample-id', sample.id)
                        event.dataTransfer.setData('text/plain', sample.filename)
                        event.dataTransfer.effectAllowed = 'copyMove'
                      }}
                      onClick={() => selectBrowserFile(sample.id)}
                      onDoubleClick={() => loadSampleToSelectedClip(sample.id)}
                      className={cn(
                        'w-full rounded-md border px-2 py-1.5 text-left transition',
                        selectedSampleId === sample.id
                          ? 'border-sky-500/40 bg-sky-500/10'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700',
                      )}
                    >
                      <p className="flex items-center justify-between gap-2 truncate text-xs font-medium text-slate-100">
                        <span className="truncate">{sample.filename}</span>
                        {previewingSampleId === sample.id ? (
                          <span className="inline-flex items-center gap-1 text-emerald-300">
                            <Play className="h-3 w-3 fill-current" />
                            <Square className="h-3 w-3" />
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-slate-400">
                        {sample.bpm ?? '--'} BPM - {sample.key ?? '--'} - {sample.type}
                      </p>
                      <p className="truncate text-[10px] text-slate-500">{pack}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </Panel>

      {folderBrowserOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-sm">
          <div className="grid h-[72vh] w-full max-w-3xl grid-rows-[auto_minmax(0,1fr)_auto] rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-100">Select Sample Root Folder</h3>
              <button
                type="button"
                onClick={closeFolderBrowser}
                className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-slate-500"
              >
                Close
              </button>
            </header>

            <div className="grid min-h-0 grid-cols-[190px_minmax(0,1fr)] gap-3 p-3">
              <div className="min-h-0 rounded-md border border-slate-800 bg-slate-900/50 p-2">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Roots</p>
                <div className="space-y-1 overflow-y-auto">
                  {filesystemRoots.map((root) => (
                    <button
                      key={root.absolutePath}
                      type="button"
                      onClick={() => {
                        void navigateFolderBrowser(root.absolutePath)
                      }}
                      className={cn(
                        'flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs transition',
                        folderBrowserPath?.toLowerCase() === root.absolutePath.toLowerCase()
                          ? 'bg-sky-500/15 text-sky-100'
                          : 'text-slate-300 hover:bg-slate-800',
                      )}
                    >
                      <Folder className="h-3.5 w-3.5" />
                      {root.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-2 rounded-md border border-slate-800 bg-slate-900/50 p-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void navigateFolderBrowserParent()
                      }}
                      className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-slate-500 disabled:opacity-40"
                      disabled={!folderBrowserParentPath}
                    >
                      Parent
                    </button>
                    <p className="truncate text-xs text-slate-300">{folderBrowserPath ?? 'No path selected'}</p>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Direct audio files: {folderBrowserAudioFileCountDirect} | Recursive estimate:{' '}
                    {folderBrowserAudioFileCountRecursiveEstimate ?? '--'}
                  </p>
                  {folderBrowserError && <p className="text-[11px] text-rose-300">{folderBrowserError}</p>}
                </div>

                <div className="min-h-0 overflow-y-auto rounded-md border border-slate-800 bg-slate-950/70 p-1.5">
                  {folderBrowserLoading && <p className="px-2 py-1 text-xs text-slate-400">Loading folders...</p>}
                  {!folderBrowserLoading && folderBrowserFolders.length === 0 && (
                    <p className="px-2 py-1 text-xs text-slate-500">No folders in this path.</p>
                  )}
                  {!folderBrowserLoading &&
                    folderBrowserFolders.map((folder) => (
                      <button
                        key={folder.absolutePath}
                        type="button"
                        onClick={() => {
                          void navigateFolderBrowser(folder.absolutePath)
                        }}
                        className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left text-xs text-slate-300 transition hover:bg-slate-800"
                      >
                        <FolderOpen className="h-3.5 w-3.5 text-slate-500" />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <footer className="flex items-center justify-end border-t border-slate-800 px-4 py-3">
              <button
                type="button"
                onClick={() => {
                  void applyCurrentFolderAsSampleRoot()
                }}
                className="rounded border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs text-sky-200 transition hover:bg-sky-500/25"
              >
                Use This Folder
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  )
}
