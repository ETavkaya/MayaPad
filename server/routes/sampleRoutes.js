import { Router } from 'express'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { readConfig, updateConfig } from '../services/configStore.js'
import { persistSampleIndex, getLatestSampleIndex, getSampleById } from '../services/sampleIndexStore.js'
import { scanSampleLibrary } from '../services/sampleScanner.js'

export const sampleRouter = Router()

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase()

  switch (extension) {
    case '.wav':
      return 'audio/wav'
    case '.aiff':
    case '.aif':
      return 'audio/aiff'
    case '.mp3':
      return 'audio/mpeg'
    case '.flac':
      return 'audio/flac'
    case '.ogg':
      return 'audio/ogg'
    default:
      return 'application/octet-stream'
  }
}

sampleRouter.get('/samples/index', async (_req, res) => {
  const latestIndex = getLatestSampleIndex()
  res.json(latestIndex ?? null)
})

sampleRouter.get('/samples/scan', async (_req, res, next) => {
  try {
    const config = await readConfig()

    if (!config.sampleRoot) {
      return res.status(400).json({ error: 'No sample root configured. Set sample root first.' })
    }

    const rootStats = await stat(config.sampleRoot).catch(() => null)
    if (!rootStats || !rootStats.isDirectory()) {
      return res
        .status(400)
        .json({ error: 'Configured sample root is missing or inaccessible. Update sample root.' })
    }

    const scanResult = await scanSampleLibrary(config.sampleRoot)
    await updateConfig({ lastScanAt: scanResult.scannedAt })
    await persistSampleIndex(scanResult)

    return res.json(scanResult)
  } catch (error) {
    next(error)
  }
})

sampleRouter.get('/samples/:id/stream', async (req, res, next) => {
  try {
    const sample = getSampleById(req.params.id)

    if (!sample) {
      return res.status(404).json({ error: 'Sample not found in latest index.' })
    }

    const filePath = sample.absolutePath
    const fileStat = await stat(filePath).catch(() => null)

    if (!fileStat || !fileStat.isFile()) {
      return res.status(404).json({ error: 'Sample file is not accessible on disk.' })
    }

    const contentType = getContentType(filePath)
    const rangeHeader = req.headers.range

    if (rangeHeader) {
      const [startRaw, endRaw] = rangeHeader.replace(/bytes=/i, '').split('-')
      const fileSize = fileStat.size
      const start = Number(startRaw)
      const end = endRaw ? Number(endRaw) : fileSize - 1

      if (!Number.isFinite(start) || start < 0 || start >= fileSize) {
        res.setHeader('Content-Range', `bytes */${fileSize}`)
        return res.status(416).end()
      }

      const boundedEnd = Number.isFinite(end) ? Math.min(end, fileSize - 1) : fileSize - 1

      if (boundedEnd < start) {
        res.setHeader('Content-Range', `bytes */${fileSize}`)
        return res.status(416).end()
      }

      const chunkSize = boundedEnd - start + 1

      res.status(206)
      res.setHeader('Content-Range', `bytes ${start}-${boundedEnd}/${fileSize}`)
      res.setHeader('Accept-Ranges', 'bytes')
      res.setHeader('Content-Length', chunkSize)
      res.setHeader('Content-Type', contentType)

      const stream = createReadStream(filePath, { start, end: boundedEnd })
      stream.on('error', next)
      stream.pipe(res)
      return undefined
    }

    res.setHeader('Content-Length', fileStat.size)
    res.setHeader('Content-Type', contentType)
    res.setHeader('Accept-Ranges', 'bytes')

    const stream = createReadStream(filePath)
    stream.on('error', next)
    stream.pipe(res)

    return undefined
  } catch (error) {
    next(error)
  }
})
