import { Router } from 'express'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { readConfig, setSampleRoot } from '../services/configStore.js'

export const configRouter = Router()

configRouter.get('/config', async (_req, res, next) => {
  try {
    const config = await readConfig()
    res.json(config)
  } catch (error) {
    next(error)
  }
})

configRouter.post('/config/sample-root', async (req, res, next) => {
  try {
    const sampleRoot = typeof req.body?.sampleRoot === 'string' ? req.body.sampleRoot.trim() : ''

    if (!sampleRoot) {
      return res.status(400).json({ error: 'sampleRoot is required.' })
    }

    if (!path.isAbsolute(sampleRoot)) {
      return res.status(400).json({ error: 'sampleRoot must be an absolute path.' })
    }

    const rootStats = await stat(sampleRoot).catch(() => null)
    if (!rootStats || !rootStats.isDirectory()) {
      return res.status(400).json({ error: 'sampleRoot must point to an existing directory.' })
    }

    const config = await setSampleRoot(path.normalize(sampleRoot))
    return res.json(config)
  } catch (error) {
    next(error)
  }
})
