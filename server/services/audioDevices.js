export async function getAudioDevices(config) {
  return {
    available: [],
    selected: config?.audioDevicePreference ?? null,
    status: 'not_connected',
  }
}
