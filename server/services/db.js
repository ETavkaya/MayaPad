import { Pool } from 'pg'

let pool = null

function shouldUseSsl() {
  const value = String(process.env.PGSSLMODE ?? '').toLowerCase()
  return value === 'require' || value === 'verify-ca' || value === 'verify-full'
}

export function hasDatabase() {
  return typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.trim().length > 0
}

export function getDatabaseUrl() {
  return hasDatabase() ? process.env.DATABASE_URL.trim() : null
}

export function getDbPool() {
  if (!hasDatabase()) {
    return null
  }

  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
    })
  }

  return pool
}

export async function withDbClient(callback) {
  const dbPool = getDbPool()
  if (!dbPool) {
    return null
  }

  const client = await dbPool.connect()
  try {
    return await callback(client)
  } finally {
    client.release()
  }
}

export async function pingDatabase() {
  const dbPool = getDbPool()
  if (!dbPool) {
    return {
      available: false,
      connected: false,
      error: 'DATABASE_URL is not configured.',
    }
  }

  try {
    await dbPool.query('select 1 as ok')
    return {
      available: true,
      connected: true,
      error: null,
    }
  } catch (error) {
    return {
      available: true,
      connected: false,
      error: error instanceof Error ? error.message : 'Database ping failed.',
    }
  }
}
