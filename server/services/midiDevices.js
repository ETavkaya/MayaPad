export async function getMidiDevices(config) {
  return {
    inputs: [],
    outputs: [],
    launchpadDetected: false,
    launchkeyDetected: false,
    selected: config?.midiDevicePreference ?? null,
    status: 'not_connected',
  }
}
