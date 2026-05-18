import type { TrackRoleId } from '../types'

export interface LaunchpadModePlan {
  mode: 'Session' | 'Note' | 'Chord' | 'Custom' | 'Sequencer'
  description: string
  planned: boolean
}

export interface LaunchpadControlMap {
  grid8x8: string
  sceneButtons: string
  arrows: string
  clear: string
  duplicate: string
  quantise: string
  fixedLength: string
  play: string
  record: string
  trackSelect: string
  trackControls: string
  noteMode: string
  chordMode: string
  customMode: string
  sequencer: string
}

export interface LaunchpadTrackLaneMapping {
  hardwareColumnIndex: number
  role: TrackRoleId
  description: string
}

export const LAUNCHPAD_PRO_MK3_CONTROL_MAP: LaunchpadControlMap = {
  grid8x8: 'Mapped to visible LaunchBrain clip grid (8 columns x 8 scenes).',
  sceneButtons: 'Launch scene rows.',
  arrows: 'Future bank/page navigation.',
  clear: 'Future clear selected clip (modifier clears row/column).',
  duplicate: 'Future duplicate clip.',
  quantise: 'Future quantize selected clip.',
  fixedLength: 'Future recording length selector.',
  play: 'Transport play.',
  record: 'Future record/capture.',
  trackSelect: 'Select active column.',
  trackControls: 'Arm, mute, solo, stop column, device/fx mode (planned).',
  noteMode: 'Future live instrument playing.',
  chordMode: 'Future harmony/chord input.',
  customMode: 'Future FX pad pages.',
  sequencer: 'Future pattern/step generator.',
}

export const LAUNCHPAD_MODE_PLAN: LaunchpadModePlan[] = [
  { mode: 'Session', description: 'Clip launcher', planned: true },
  { mode: 'Note', description: 'Live instrument input', planned: true },
  { mode: 'Chord', description: 'Harmony/chord input', planned: true },
  { mode: 'Custom', description: 'FX performance pads', planned: true },
  { mode: 'Sequencer', description: 'Pattern generator', planned: true },
]

export function createLaunchpadLaneMap(roleOrder: TrackRoleId[]): LaunchpadTrackLaneMapping[] {
  return roleOrder.map((role, hardwareColumnIndex) => ({
    role,
    hardwareColumnIndex,
    description: `Column ${hardwareColumnIndex + 1} -> ${role}`,
  }))
}

