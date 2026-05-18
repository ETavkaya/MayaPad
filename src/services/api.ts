import type {
  AppConfig,
  DeviceSnapshot,
  FsListResponse,
  FsRootResponse,
  SampleOverrideRecord,
  SessionManifest,
  SavedSessionSummary,
  ScanResult,
} from '../types'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null

  if (!response.ok) {
    const errorMessage = payload?.error ?? `Request failed: ${response.status}`
    throw new Error(errorMessage)
  }

  return payload as T
}

export function getConfig() {
  return request<AppConfig>('/api/config')
}

export function setSampleRoot(sampleRoot: string) {
  return request<AppConfig>('/api/config/sample-root', {
    method: 'POST',
    body: JSON.stringify({ sampleRoot }),
  })
}

export function scanSamples() {
  return request<ScanResult>('/api/samples/scan')
}

export function getSampleIndex() {
  return request<ScanResult | null>('/api/samples/index')
}

export function getDevices() {
  return request<DeviceSnapshot>('/api/devices')
}

export function getSampleStreamUrl(sampleId: string) {
  return `/api/samples/${encodeURIComponent(sampleId)}/stream`
}

export function getFilesystemRoots() {
  return request<FsRootResponse>('/api/fs/roots')
}

export function getFilesystemFolderList(folderPath: string) {
  const params = new URLSearchParams({ path: folderPath })
  return request<FsListResponse>(`/api/fs/list?${params.toString()}`)
}

export function listSessions() {
  return request<{ sessions: SavedSessionSummary[] }>('/api/sessions')
}

export function saveSession(payload: {
  id?: string | null
  name?: string | null
  saveAs?: boolean
  session: Omit<SessionManifest, 'id' | 'createdAt' | 'updatedAt' | 'missingFilesCount'> & {
    id?: string | null
    createdAt?: string | null
    updatedAt?: string | null
  }
}) {
  return request<{ session: SessionManifest }>('/api/sessions/save', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getSession(sessionId: string) {
  return request<{ session: SessionManifest }>(`/api/sessions/${encodeURIComponent(sessionId)}`)
}

export function loadSession(sessionId: string) {
  return request<{ session: SessionManifest }>(`/api/sessions/load/${encodeURIComponent(sessionId)}`, {
    method: 'POST',
  })
}

export function getSampleOverrides() {
  return request<{ overrides: Record<string, SampleOverrideRecord> }>('/api/overrides')
}

export function upsertSampleOverride(payload: {
  relativePath: string
  manualKey?: string | null
  manualBpm?: number | null
  excluded?: boolean
  notes?: string
}) {
  return request<{
    relativePath: string
    override: SampleOverrideRecord | null
  }>('/api/overrides/sample', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteSampleOverride(relativePath: string) {
  return request<{ relativePath: string }>('/api/overrides/sample', {
    method: 'DELETE',
    body: JSON.stringify({ relativePath }),
  })
}

export function analyzeSampleKey(sampleId: string) {
  return request<{
    sampleId: string
    available: boolean
    status: string
    message: string
    normalizedKey: string | null
  }>(`/api/samples/${encodeURIComponent(sampleId)}/analyze-key`)
}
