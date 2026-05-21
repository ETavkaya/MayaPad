import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ensureConfigFile } from './services/configStore.js'
import { ensureFolderTagsFile } from './services/folderTagsStore.js'
import { initializeSampleIndex } from './services/sampleIndexStore.js'
import { ensureOverrideFile } from './services/overridesStore.js'
import { pingDatabase } from './services/db.js'
import { ensureSemanticSchema } from './services/semanticSchema.js'
import { configRouter } from './routes/configRoutes.js'
import { sampleRouter } from './routes/sampleRoutes.js'
import { deviceRouter } from './routes/deviceRoutes.js'
import { fsRouter } from './routes/fsRoutes.js'
import { sessionRouter } from './routes/sessionRoutes.js'
import { overridesRouter } from './routes/overridesRoutes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const distPath = path.join(projectRoot, 'dist')

const app = express()

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', configRouter)
app.use('/api', sampleRouter)
app.use('/api', deviceRouter)
app.use('/api', fsRouter)
app.use('/api', sessionRouter)
app.use('/api', overridesRouter)

if (existsSync(distPath)) {
  app.use(express.static(distPath))

  app.get(/^(?!\/api).*/, (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next()
    }

    return res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.use((error, _req, res, _next) => {
  console.error('Server error:', error)
  res.status(500).json({
    error: 'Internal server error',
    details: error?.message ?? 'Unknown error',
  })
})

const PORT = Number(process.env.PORT ?? 8010)

async function start() {
  await ensureConfigFile()
  await ensureFolderTagsFile()
  await ensureOverrideFile()
  await initializeSampleIndex()
  const schemaStatus = await ensureSemanticSchema().catch((error) => ({
    enabled: true,
    migrated: false,
    message: `PostgreSQL schema bootstrap failed: ${error instanceof Error ? error.message : 'Unknown error.'}`,
  }))
  const dbStatus = await pingDatabase()

  app.listen(PORT, () => {
    console.log(`LaunchBrain backend listening on http://localhost:${PORT}`)
    if (schemaStatus.enabled) {
      console.log(schemaStatus.message)
    } else {
      console.log('PostgreSQL semantic index disabled. Falling back to JSON index cache.')
    }

    if (dbStatus.available) {
      console.log(
        dbStatus.connected
          ? 'PostgreSQL connection established.'
          : `PostgreSQL connection failed; continuing without DB index. ${dbStatus.error ?? ''}`.trim(),
      )
    }
  })
}

start().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
