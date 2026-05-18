import { Router } from 'express'
import {
  listSavedSessions,
  readSavedSession,
  resolveLoadedSession,
  saveSessionManifest,
} from '../services/sessionStore.js'

export const sessionRouter = Router()

sessionRouter.get('/sessions', async (_req, res, next) => {
  try {
    const sessions = await listSavedSessions()
    res.json({ sessions })
  } catch (error) {
    next(error)
  }
})

sessionRouter.post('/sessions/save', async (req, res, next) => {
  try {
    const id = typeof req.body?.id === 'string' ? req.body.id.trim() : null
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : null
    const saveAs = Boolean(req.body?.saveAs)
    const session = req.body?.session

    if (!session || typeof session !== 'object') {
      return res.status(400).json({ error: 'session payload is required.' })
    }

    const manifest = await saveSessionManifest({
      id,
      name,
      saveAs,
      session,
    })

    return res.json({ session: manifest })
  } catch (error) {
    next(error)
  }
})

sessionRouter.get('/sessions/:id', async (req, res, next) => {
  try {
    const session = await readSavedSession(req.params.id)
    res.json({ session })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Session not found.' })
    }
    next(error)
  }
})

sessionRouter.post('/sessions/load/:id', async (req, res, next) => {
  try {
    const session = await resolveLoadedSession(req.params.id)
    res.json({ session })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Session not found.' })
    }
    next(error)
  }
})
