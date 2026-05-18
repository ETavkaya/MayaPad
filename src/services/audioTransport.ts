import type { ClipSyncStatus, SampleType, TransportState } from '../types'
import { getSampleStreamUrl } from './api'

const LOOKAHEAD_SECONDS = 0.18
const MIN_START_DELAY_SECONDS = 0.02
const COMMON_BEAT_LENGTHS = [1, 2, 4, 8, 16, 32, 64]

export interface TransportClipRequest {
  clipId: string
  trackIndex: number
  sampleId: string
  filename: string | null
  type: SampleType
  bpm: number | null
  detectedBpm: number | null
  bpmSource: 'filename' | 'estimated' | 'unknown'
  beatsLength: number | null
  estimatedBeats: number | null
}

export interface ClipSyncSnapshot {
  durationSeconds: number | null
  detectedBpm: number | null
  bpmSource: 'filename' | 'estimated' | 'unknown'
  estimatedBeats: number | null
  beatsLength: number | null
  syncStatus: ClipSyncStatus
  playbackRate: number
}

export interface ClockSnapshot {
  isPlaying: boolean
  progress: number
  beatInBar: number
  beatInCycle: number
  beatsPerBar: number
  quantizeBeats: number
  currentBeat: number
  currentBar: number
  currentTime: number
}

export type TransportEvent =
  | {
      type: 'clip-started'
      clipId: string
      trackIndex: number
      filename: string | null
      atTime: number
      sync: ClipSyncSnapshot
    }
  | {
      type: 'clip-stopped'
      clipId: string
      trackIndex: number
      filename: string | null
      atTime: number
    }
  | {
      type: 'clip-error'
      clipId: string
      trackIndex: number
      filename: string | null
      message: string
    }
  | {
      type: 'clock'
      snapshot: ClockSnapshot
    }

interface PreparedClip {
  clip: TransportClipRequest
  buffer: AudioBuffer
  sync: ClipSyncSnapshot
  cycleDurationSeconds: number
}

interface ScheduledSegment {
  source: AudioBufferSourceNode
  gain: GainNode
  startTime: number
  endTime: number
}

interface ActiveLoopVoice {
  kind: 'loop'
  clipId: string
  trackIndex: number
  filename: string | null
  prepared: PreparedClip
  nextSegmentTime: number
  stopAtTime: number | null
  segments: ScheduledSegment[]
}

interface ActiveOneShotVoice {
  kind: 'one-shot'
  clipId: string
  trackIndex: number
  filename: string | null
  source: AudioBufferSourceNode
  startedAtTime: number
  stopAtTime: number
}

type ActiveVoice = ActiveLoopVoice | ActiveOneShotVoice

interface QueueStartEvent {
  id: string
  type: 'start'
  clipId: string
  trackIndex: number
  boundaryTime: number
  filename: string | null
  preparedPromise: Promise<PreparedClip>
  dispatched: boolean
}

interface QueueStopEvent {
  id: string
  type: 'stop'
  clipId: string
  trackIndex: number
  boundaryTime: number
  filename: string | null
  dispatched: boolean
}

type QueueEvent = QueueStartEvent | QueueStopEvent

interface PendingStateEvent {
  type: 'clip-started' | 'clip-stopped'
  clipId: string
  trackIndex: number
  filename: string | null
  atTime: number
  sync?: ClipSyncSnapshot
  dispatched: boolean
}

function quantizeToBeats(
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

function getBeatsPerBar(timeSignature: TransportState['timeSignature']) {
  const top = Number(timeSignature.split('/')[0])
  if (!Number.isFinite(top) || top <= 0) {
    return 4
  }

  return top
}

function closestBeatsLength(value: number | null) {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return null
  }

  let best: number | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const beats of COMMON_BEAT_LENGTHS) {
    const distance = Math.abs(beats - value)
    if (distance < bestDistance) {
      best = beats
      bestDistance = distance
    }
  }

  return best
}

function normalizePlaybackRate(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1
  }

  return Math.max(0.25, Math.min(4, value))
}

class AudioTransport {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private transportSettings: Pick<TransportState, 'tempo' | 'timeSignature' | 'quantize'> = {
    tempo: 120,
    timeSignature: '4/4',
    quantize: '1 Bar',
  }
  private transportStartedAt = 0
  private isPlaying = false
  private rafId: number | null = null
  private listeners = new Set<(event: TransportEvent) => void>()
  private decodeCache = new Map<string, Promise<AudioBuffer>>()
  private activeVoices = new Map<string, ActiveVoice>()
  private activeClipByTrack = new Map<number, string>()
  private queueEvents: QueueEvent[] = []
  private pendingStateEvents: PendingStateEvent[] = []

  subscribe(listener: (event: TransportEvent) => void) {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  configure(settings: Partial<Pick<TransportState, 'tempo' | 'timeSignature' | 'quantize'>>) {
    const nextTempo = settings.tempo ?? this.transportSettings.tempo
    const nextTimeSignature = settings.timeSignature ?? this.transportSettings.timeSignature
    const nextQuantize = settings.quantize ?? this.transportSettings.quantize

    if (this.audioContext && this.isPlaying && nextTempo !== this.transportSettings.tempo) {
      const now = this.audioContext.currentTime
      const currentBeats = this.getCurrentBeatRaw(now)
      this.transportStartedAt = now - (currentBeats * 60) / nextTempo
    }

    this.transportSettings = {
      tempo: nextTempo,
      timeSignature: nextTimeSignature,
      quantize: nextQuantize,
    }
  }

  async startTransport() {
    const context = await this.ensureAudioContext()
    await context.resume()

    if (!this.isPlaying) {
      this.transportStartedAt = context.currentTime
      this.isPlaying = true
    }

    this.startLoop()
  }

  stopTransport() {
    this.queueEvents = []
    this.pendingStateEvents = []
    this.isPlaying = false
    this.stopAllVoicesNow()
    this.cancelLoop()
    this.publishClock()
  }

  stopAll() {
    this.queueEvents = []
    this.pendingStateEvents = []
    this.stopAllVoicesNow()
  }

  getClockSnapshot(): ClockSnapshot {
    const context = this.audioContext
    const now = context ? context.currentTime : 0
    const beatsPerBar = getBeatsPerBar(this.transportSettings.timeSignature)
    const quantizeBeats = Math.max(1, quantizeToBeats(this.transportSettings.quantize, beatsPerBar) || beatsPerBar)
    const currentBeatRaw = this.getCurrentBeatRaw(now)
    const beatInBar = (Math.floor(currentBeatRaw) % beatsPerBar) + 1
    const beatInCycle = (Math.floor(currentBeatRaw) % quantizeBeats) + 1
    const progress = quantizeBeats > 0 ? (currentBeatRaw % quantizeBeats) / quantizeBeats : 0
    const currentBar = Math.floor(currentBeatRaw / beatsPerBar) + 1

    return {
      isPlaying: this.isPlaying,
      progress,
      beatInBar,
      beatInCycle,
      beatsPerBar,
      quantizeBeats,
      currentBeat: currentBeatRaw,
      currentBar,
      currentTime: now,
    }
  }

  getCurrentBeat() {
    const now = this.audioContext?.currentTime ?? 0
    return this.getCurrentBeatRaw(now)
  }

  getCurrentBar() {
    const beatsPerBar = getBeatsPerBar(this.transportSettings.timeSignature)
    return Math.floor(this.getCurrentBeat() / beatsPerBar) + 1
  }

  getNextBoundaryTime(quantizeOverride?: TransportState['quantize']) {
    const context = this.audioContext
    if (!context) {
      return 0
    }

    const now = context.currentTime
    const quantize = quantizeOverride ?? this.transportSettings.quantize
    const beatsPerBar = getBeatsPerBar(this.transportSettings.timeSignature)
    const boundaryBeats = quantizeToBeats(quantize, beatsPerBar)

    if (quantize === 'None' || boundaryBeats <= 0 || !this.isPlaying) {
      return now + MIN_START_DELAY_SECONDS
    }

    const currentBeat = this.getCurrentBeatRaw(now)
    const epsilon = 0.000001
    const nextBoundaryBeat = Math.ceil((currentBeat + epsilon) / boundaryBeats) * boundaryBeats

    return this.transportStartedAt + (nextBoundaryBeat * 60) / this.transportSettings.tempo
  }

  async queueClipStart(clip: TransportClipRequest, boundaryTime?: number) {
    const context = await this.ensureAudioContext()
    await context.resume()

    if (!this.isPlaying) {
      this.transportStartedAt = context.currentTime
      this.isPlaying = true
    }

    const targetTime = boundaryTime ?? this.getNextBoundaryTime()

    this.queueEvents = this.queueEvents.filter((event) => {
      if (event.trackIndex !== clip.trackIndex) {
        return true
      }

      return event.type !== 'start'
    })

    const event: QueueStartEvent = {
      id: `${clip.clipId}-${Date.now()}-${Math.random()}`,
      type: 'start',
      clipId: clip.clipId,
      trackIndex: clip.trackIndex,
      boundaryTime: targetTime,
      filename: clip.filename,
      preparedPromise: this.prepareClip(clip),
      dispatched: false,
    }

    this.queueEvents.push(event)
    this.startLoop()

    return targetTime
  }

  async queueClipStop(
    input: {
      clipId: string
      trackIndex: number
      filename: string | null
    },
    boundaryTime?: number,
  ) {
    const context = await this.ensureAudioContext()
    await context.resume()

    const targetTime = boundaryTime ?? this.getNextBoundaryTime()

    const event: QueueStopEvent = {
      id: `${input.clipId}-stop-${Date.now()}-${Math.random()}`,
      type: 'stop',
      clipId: input.clipId,
      trackIndex: input.trackIndex,
      boundaryTime: targetTime,
      filename: input.filename,
      dispatched: false,
    }

    this.queueEvents.push(event)
    this.startLoop()

    return targetTime
  }

  cancelQueuedClipStart(clipId: string) {
    this.queueEvents = this.queueEvents.filter((event) => {
      if (event.type !== 'start') {
        return true
      }

      return event.clipId !== clipId
    })
  }

  cancelQueuedTrackActions(trackIndex: number) {
    this.queueEvents = this.queueEvents.filter((event) => event.trackIndex !== trackIndex)
  }

  private async ensureAudioContext() {
    if (!this.audioContext) {
      const AudioContextCtor =
        window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextCtor) {
        throw new Error('AudioContext is not supported in this browser.')
      }

      this.audioContext = new AudioContextCtor()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = 0.95
      this.masterGain.connect(this.audioContext.destination)
    }

    return this.audioContext
  }

  private getCurrentBeatRaw(nowSeconds: number) {
    if (!this.isPlaying || !this.audioContext) {
      return 0
    }

    const elapsed = Math.max(0, nowSeconds - this.transportStartedAt)
    return (elapsed * this.transportSettings.tempo) / 60
  }

  private startLoop() {
    if (this.rafId !== null) {
      return
    }

    const tick = () => {
      this.rafId = requestAnimationFrame(tick)
      this.processAudioTimeline()
      this.publishClock()

      if (!this.isPlaying && this.activeVoices.size === 0 && this.queueEvents.length === 0 && this.pendingStateEvents.length === 0) {
        this.cancelLoop()
      }
    }

    this.rafId = requestAnimationFrame(tick)
  }

  private cancelLoop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private processAudioTimeline() {
    const context = this.audioContext
    if (!context) {
      return
    }

    const now = context.currentTime
    const horizon = now + LOOKAHEAD_SECONDS

    const due = this.queueEvents
      .filter((event) => !event.dispatched && event.boundaryTime <= horizon)
      .sort((left, right) => left.boundaryTime - right.boundaryTime)

    for (const event of due) {
      event.dispatched = true
      if (event.type === 'stop') {
        this.processStopEvent(event)
        continue
      }

      void this.processStartEvent(event)
    }

    this.queueEvents = this.queueEvents.filter((event) => !event.dispatched)

    for (const voice of this.activeVoices.values()) {
      if (voice.kind !== 'loop') {
        continue
      }

      this.scheduleLoopSegments(voice, horizon)
    }

    this.flushStateEvents(now)
  }

  private processStopEvent(event: QueueStopEvent) {
    const voice = this.activeVoices.get(event.clipId)
    if (!voice) {
      this.pendingStateEvents.push({
        type: 'clip-stopped',
        clipId: event.clipId,
        trackIndex: event.trackIndex,
        filename: event.filename,
        atTime: event.boundaryTime,
        dispatched: false,
      })
      return
    }

    if (voice.kind === 'loop') {
      voice.stopAtTime = event.boundaryTime
      for (const segment of voice.segments) {
        if (segment.endTime <= event.boundaryTime + 0.0001) {
          continue
        }

        const stopTime = Math.max(event.boundaryTime, segment.startTime + 0.01)
        segment.gain.gain.cancelScheduledValues(stopTime - 0.005)
        segment.gain.gain.setValueAtTime(segment.gain.gain.value, stopTime - 0.005)
        segment.gain.gain.linearRampToValueAtTime(0, stopTime)
        segment.source.stop(stopTime + 0.001)
      }
    } else {
      const stopTime = Math.max(event.boundaryTime, this.audioContext?.currentTime ?? event.boundaryTime)
      voice.source.stop(stopTime)
      this.activeVoices.delete(event.clipId)
    }

    this.pendingStateEvents.push({
      type: 'clip-stopped',
      clipId: event.clipId,
      trackIndex: event.trackIndex,
      filename: event.filename,
      atTime: event.boundaryTime,
      dispatched: false,
    })
  }

  private async processStartEvent(event: QueueStartEvent) {
    const context = this.audioContext
    if (!context) {
      return
    }

    const existingClipId = this.activeClipByTrack.get(event.trackIndex)
    if (existingClipId && existingClipId !== event.clipId) {
      this.processStopEvent({
        id: `${existingClipId}-auto-stop`,
        type: 'stop',
        clipId: existingClipId,
        trackIndex: event.trackIndex,
        boundaryTime: event.boundaryTime,
        filename: null,
        dispatched: true,
      })
    }

    try {
      const prepared = await event.preparedPromise
      const boundaryTime = Math.max(event.boundaryTime, context.currentTime + MIN_START_DELAY_SECONDS)

      if (prepared.clip.type === 'one-shot') {
        const source = context.createBufferSource()
        source.buffer = prepared.buffer
        source.playbackRate.value = prepared.sync.playbackRate

        const gain = context.createGain()
        gain.gain.setValueAtTime(1, boundaryTime)

        source.connect(gain).connect(this.masterGain ?? context.destination)

        const duration = prepared.buffer.duration / prepared.sync.playbackRate
        const stopTime = boundaryTime + duration

        source.start(boundaryTime)
        source.stop(stopTime + 0.001)

        source.onended = () => {
          const active = this.activeVoices.get(event.clipId)
          if (!active || active.kind !== 'one-shot' || active.source !== source) {
            return
          }

          this.activeVoices.delete(event.clipId)
          this.activeClipByTrack.delete(event.trackIndex)
          this.emit({
            type: 'clip-stopped',
            clipId: event.clipId,
            trackIndex: event.trackIndex,
            filename: event.filename,
            atTime: context.currentTime,
          })
        }

        this.activeVoices.set(event.clipId, {
          kind: 'one-shot',
          clipId: event.clipId,
          trackIndex: event.trackIndex,
          filename: event.filename,
          source,
          startedAtTime: boundaryTime,
          stopAtTime: stopTime,
        })
      } else {
        const voice: ActiveLoopVoice = {
          kind: 'loop',
          clipId: event.clipId,
          trackIndex: event.trackIndex,
          filename: event.filename,
          prepared,
          nextSegmentTime: boundaryTime,
          stopAtTime: null,
          segments: [],
        }

        this.activeVoices.set(event.clipId, voice)
        this.scheduleLoopSegments(voice, boundaryTime + LOOKAHEAD_SECONDS)
      }

      this.activeClipByTrack.set(event.trackIndex, event.clipId)

      this.pendingStateEvents.push({
        type: 'clip-started',
        clipId: event.clipId,
        trackIndex: event.trackIndex,
        filename: event.filename,
        atTime: boundaryTime,
        sync: prepared.sync,
        dispatched: false,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to schedule clip'
      this.emit({
        type: 'clip-error',
        clipId: event.clipId,
        trackIndex: event.trackIndex,
        filename: event.filename,
        message,
      })
    }
  }

  private scheduleLoopSegments(voice: ActiveLoopVoice, horizon: number) {
    const context = this.audioContext
    if (!context) {
      return
    }

    while (voice.nextSegmentTime <= horizon) {
      if (voice.stopAtTime !== null && voice.nextSegmentTime >= voice.stopAtTime - 0.0001) {
        this.activeVoices.delete(voice.clipId)
        this.activeClipByTrack.delete(voice.trackIndex)
        return
      }

      const segmentStart = voice.nextSegmentTime
      const nominalEnd = segmentStart + voice.prepared.cycleDurationSeconds
      const segmentEnd =
        voice.stopAtTime !== null ? Math.min(nominalEnd, voice.stopAtTime) : nominalEnd

      if (segmentEnd <= segmentStart + 0.003) {
        voice.nextSegmentTime += voice.prepared.cycleDurationSeconds
        continue
      }

      const source = context.createBufferSource()
      source.buffer = voice.prepared.buffer
      source.playbackRate.value = voice.prepared.sync.playbackRate

      const gain = context.createGain()
      const fade = Math.min(0.006, (segmentEnd - segmentStart) * 0.18)
      gain.gain.setValueAtTime(0, segmentStart)
      gain.gain.linearRampToValueAtTime(1, segmentStart + fade)
      gain.gain.setValueAtTime(1, Math.max(segmentStart + fade, segmentEnd - fade))
      gain.gain.linearRampToValueAtTime(0, segmentEnd)

      source.connect(gain).connect(this.masterGain ?? context.destination)
      source.start(segmentStart)
      source.stop(segmentEnd + 0.001)

      const segment: ScheduledSegment = {
        source,
        gain,
        startTime: segmentStart,
        endTime: segmentEnd,
      }

      voice.segments.push(segment)

      source.onended = () => {
        voice.segments = voice.segments.filter((entry) => entry !== segment)

        if (voice.stopAtTime !== null && voice.segments.length === 0 && voice.nextSegmentTime >= voice.stopAtTime) {
          this.activeVoices.delete(voice.clipId)
          this.activeClipByTrack.delete(voice.trackIndex)
        }
      }

      voice.nextSegmentTime += voice.prepared.cycleDurationSeconds
    }
  }

  private flushStateEvents(now: number) {
    for (const event of this.pendingStateEvents) {
      if (event.dispatched) {
        continue
      }

      if (now + 0.003 < event.atTime) {
        continue
      }

      event.dispatched = true

      if (event.type === 'clip-started') {
        this.emit({
          type: 'clip-started',
          clipId: event.clipId,
          trackIndex: event.trackIndex,
          filename: event.filename,
          atTime: event.atTime,
          sync: event.sync ?? {
            durationSeconds: null,
            detectedBpm: null,
            bpmSource: 'unknown',
            estimatedBeats: null,
            beatsLength: null,
            syncStatus: 'unsupported',
            playbackRate: 1,
          },
        })
      } else {
        this.emit({
          type: 'clip-stopped',
          clipId: event.clipId,
          trackIndex: event.trackIndex,
          filename: event.filename,
          atTime: event.atTime,
        })
      }
    }

    this.pendingStateEvents = this.pendingStateEvents.filter((event) => !event.dispatched)
  }

  private async prepareClip(clip: TransportClipRequest): Promise<PreparedClip> {
    const context = await this.ensureAudioContext()
    const buffer = await this.decodeSampleBuffer(context, clip.sampleId)

    const durationSeconds = buffer.duration
    const detectedBpm = clip.detectedBpm ?? clip.bpm ?? null
    const bpmSource = detectedBpm !== null ? clip.bpmSource : 'unknown'

    const estimatedBeatsRaw =
      detectedBpm !== null ? Math.round((durationSeconds * detectedBpm) / 60) : clip.estimatedBeats
    const estimatedBeats = estimatedBeatsRaw && estimatedBeatsRaw > 0 ? estimatedBeatsRaw : null

    let beatsLength = clip.beatsLength ?? closestBeatsLength(estimatedBeats)
    let syncStatus: ClipSyncStatus = 'ready'
    let playbackRate = 1
    let targetDurationSeconds = durationSeconds

    if (clip.type === 'one-shot') {
      beatsLength = 1
      syncStatus = 'unsupported'
    } else if (detectedBpm === null) {
      beatsLength = beatsLength ?? closestBeatsLength((durationSeconds * this.transportSettings.tempo) / 60)
      syncStatus = 'bpm_missing'
    } else if (!beatsLength) {
      beatsLength = closestBeatsLength(estimatedBeats)
      syncStatus = 'length_uncertain'
    }

    if (!beatsLength) {
      beatsLength = 4
      syncStatus = 'length_uncertain'
    }

    if (clip.type !== 'one-shot') {
      targetDurationSeconds = (beatsLength * 60) / this.transportSettings.tempo
      playbackRate = normalizePlaybackRate(durationSeconds / targetDurationSeconds)
    }

    const sync: ClipSyncSnapshot = {
      durationSeconds,
      detectedBpm,
      bpmSource,
      estimatedBeats,
      beatsLength,
      syncStatus,
      playbackRate,
    }

    return {
      clip,
      buffer,
      sync,
      cycleDurationSeconds: targetDurationSeconds,
    }
  }

  private decodeSampleBuffer(context: AudioContext, sampleId: string) {
    const cached = this.decodeCache.get(sampleId)
    if (cached) {
      return cached
    }

    const promise = fetch(getSampleStreamUrl(sampleId))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load sample (${response.status})`)
        }

        return response.arrayBuffer()
      })
      .then((arrayBuffer) => context.decodeAudioData(arrayBuffer.slice(0)))

    this.decodeCache.set(sampleId, promise)

    return promise
  }

  private stopAllVoicesNow() {
    for (const voice of this.activeVoices.values()) {
      if (voice.kind === 'one-shot') {
        voice.source.stop()
        continue
      }

      for (const segment of voice.segments) {
        segment.source.stop()
      }
    }

    this.activeVoices.clear()
    this.activeClipByTrack.clear()
  }

  private publishClock() {
    this.emit({
      type: 'clock',
      snapshot: this.getClockSnapshot(),
    })
  }

  private emit(event: TransportEvent) {
    for (const listener of this.listeners) {
      listener(event)
    }
  }
}

export const audioTransport = new AudioTransport()
