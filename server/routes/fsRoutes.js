import { Router } from 'express'
import path from 'node:path'
import { listFilesystemRoots, listFoldersForPath } from '../services/fsBrowser.js'

export const fsRouter = Router()

fsRouter.get('/fs/roots', async (_req, res, next) => {
  try {
    const roots = await listFilesystemRoots()
    res.json({ roots })
  } catch (error) {
    next(error)
  }
})

fsRouter.get('/fs/list', async (req, res, next) => {
  try {
    const inputPath = typeof req.query.path === 'string' ? req.query.path.trim() : ''

    if (!inputPath) {
      return res.status(400).json({ error: 'Query parameter "path" is required.' })
    }

    if (!path.isAbsolute(inputPath)) {
      return res.status(400).json({ error: 'Path must be absolute.' })
    }

    const folderListing = await listFoldersForPath(inputPath)
    return res.json(folderListing)
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message })
    }

    return next(error)
  }
})
