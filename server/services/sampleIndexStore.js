import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const INDEX_DIR = path.resolve(process.cwd(), '.launchbrain')
const INDEX_PATH = path.join(INDEX_DIR, 'sample-index.json')

let latestScan = null
let samplesById = new Map()

function normalizeScan(scanData) {
  if (!scanData || !Array.isArray(scanData.samples)) {
    return null
  }

  return {
    sampleRoot: scanData.sampleRoot ?? null,
    scannedAt: scanData.scannedAt ?? null,
    sampleCount: scanData.sampleCount ?? scanData.samples.length,
    categories: Array.isArray(scanData.categories) ? scanData.categories : [],
    importedFolders: Array.isArray(scanData.importedFolders) ? scanData.importedFolders : [],
    samples: scanData.samples,
  }
}

function rebuildSampleMap(scanData) {
  samplesById = new Map()

  for (const sample of scanData?.samples ?? []) {
    if (sample?.id) {
      samplesById.set(sample.id, sample)
    }
  }
}

export async function initializeSampleIndex() {
  await mkdir(INDEX_DIR, { recursive: true })

  if (!existsSync(INDEX_PATH)) {
    latestScan = null
    samplesById = new Map()
    return null
  }

  try {
    const content = await readFile(INDEX_PATH, 'utf8')
    const parsed = JSON.parse(content)
    const normalized = normalizeScan(parsed)

    latestScan = normalized
    rebuildSampleMap(normalized)
    return latestScan
  } catch {
    latestScan = null
    samplesById = new Map()
    return null
  }
}

export async function persistSampleIndex(scanResult) {
  const normalized = normalizeScan(scanResult)

  if (!normalized) {
    return null
  }

  latestScan = normalized
  rebuildSampleMap(normalized)

  await mkdir(INDEX_DIR, { recursive: true })
  await writeFile(INDEX_PATH, JSON.stringify(normalized, null, 2), 'utf8')

  return latestScan
}

export async function replaceLatestSampleIndex(scanResult) {
  return persistSampleIndex(scanResult)
}

export function getSampleById(sampleId) {
  return samplesById.get(sampleId) ?? null
}

export function getLatestSampleIndex() {
  return latestScan
}

export function getSampleIndexPath() {
  return INDEX_PATH
}
