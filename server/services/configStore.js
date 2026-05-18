import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const CONFIG_DIR = path.resolve(process.cwd(), '.launchbrain')
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json')

const DEFAULT_CONFIG = {
  sampleRoot: null,
  lastScanAt: null,
  audioDevicePreference: null,
  midiDevicePreference: null,
}

function normalizeConfig(config) {
  return {
    sampleRoot: config?.sampleRoot ?? null,
    lastScanAt: config?.lastScanAt ?? null,
    audioDevicePreference: config?.audioDevicePreference ?? null,
    midiDevicePreference: config?.midiDevicePreference ?? null,
  }
}

export async function ensureConfigFile() {
  await mkdir(CONFIG_DIR, { recursive: true })

  if (!existsSync(CONFIG_PATH)) {
    await writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8')
    return { ...DEFAULT_CONFIG }
  }

  try {
    const content = await readFile(CONFIG_PATH, 'utf8')
    const parsed = JSON.parse(content)
    const normalized = normalizeConfig(parsed)

    await writeFile(CONFIG_PATH, JSON.stringify(normalized, null, 2), 'utf8')
    return normalized
  } catch {
    await writeFile(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8')
    return { ...DEFAULT_CONFIG }
  }
}

export async function readConfig() {
  if (!existsSync(CONFIG_PATH)) {
    return ensureConfigFile()
  }

  try {
    const content = await readFile(CONFIG_PATH, 'utf8')
    return normalizeConfig(JSON.parse(content))
  } catch {
    return ensureConfigFile()
  }
}

export async function writeConfig(config) {
  const normalized = normalizeConfig(config)
  await mkdir(CONFIG_DIR, { recursive: true })
  await writeFile(CONFIG_PATH, JSON.stringify(normalized, null, 2), 'utf8')
  return normalized
}

export async function updateConfig(partialConfig) {
  const current = await readConfig()
  const merged = {
    ...current,
    ...partialConfig,
  }

  return writeConfig(merged)
}

export async function setSampleRoot(sampleRoot) {
  return updateConfig({ sampleRoot })
}

export function getConfigPath() {
  return CONFIG_PATH
}
