import { Router } from 'express'
import { readConfig } from '../services/configStore.js'
import { getAudioDevices } from '../services/audioDevices.js'
import { getMidiDevices } from '../services/midiDevices.js'

export const deviceRouter = Router()

deviceRouter.get('/devices', async (_req, res, next) => {
  try {
    const config = await readConfig()

    const [audio, midi] = await Promise.all([
      getAudioDevices(config),
      getMidiDevices(config),
    ])

    res.json({
      audio,
      midi,
    })
  } catch (error) {
    next(error)
  }
})
