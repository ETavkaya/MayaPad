import { Router } from 'express'
import {
  deleteSampleOverride,
  getSampleOverrides,
  normalizeOverrideKey,
  upsertSampleOverride,
} from '../services/overridesStore.js'

export const overridesRouter = Router()

overridesRouter.get('/overrides', async (_req, res, next) => {
  try {
    const overrides = await getSampleOverrides()
    res.json({ overrides })
  } catch (error) {
    next(error)
  }
})

overridesRouter.post('/overrides/sample', async (req, res, next) => {
  try {
    const relativePath = normalizeOverrideKey(req.body?.relativePath)
    if (!relativePath) {
      return res.status(400).json({ error: 'relativePath is required.' })
    }

    const result = await upsertSampleOverride(relativePath, {
      manualKey: req.body?.manualKey ?? null,
      manualBpm: req.body?.manualBpm ?? null,
      excluded: req.body?.excluded ?? false,
      notes: req.body?.notes ?? '',
    })

    return res.json(result)
  } catch (error) {
    next(error)
  }
})

overridesRouter.delete('/overrides/sample', async (req, res, next) => {
  try {
    const relativePath = normalizeOverrideKey(req.body?.relativePath ?? req.query?.relativePath)
    if (!relativePath) {
      return res.status(400).json({ error: 'relativePath is required.' })
    }

    const result = await deleteSampleOverride(relativePath)
    return res.json(result)
  } catch (error) {
    next(error)
  }
})
