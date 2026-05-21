import { hasDatabase, withDbClient } from './db.js'

let workerRunning = false

function hasOpenAiKey() {
  return typeof process.env.OPENAI_API_KEY === 'string' && process.env.OPENAI_API_KEY.trim().length > 0
}

async function createFolderEnrichment(folderPayload) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You enrich sample-library folder metadata. Return strict JSON only. You are not classifying single files for playback; you are inferring folder-level musical context for a live session launcher. Never invent BPM or key when unknown.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Classify this sample-library folder for session-launch suitability.',
            expectedSchema: {
              folderRole: 'string|null',
              category: 'string|null',
              sessionSuitability: 'high|medium|low|ignore',
              semanticTags: ['string'],
              moodTags: ['string'],
              instrumentationTags: ['string'],
              likelyContent: 'string|null',
              confidence: 'number 0..1',
              reason: 'string',
            },
            payload: folderPayload,
          }),
        },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`OpenAI enrichment failed (${response.status}): ${body.slice(0, 240)}`)
  }

  const json = await response.json()
  const content = json?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('OpenAI enrichment returned no JSON content.')
  }

  const parsed = JSON.parse(content)
  return {
    folderRole: typeof parsed.folderRole === 'string' ? parsed.folderRole : null,
    category: typeof parsed.category === 'string' ? parsed.category : null,
    sessionSuitability:
      typeof parsed.sessionSuitability === 'string' ? parsed.sessionSuitability.toLowerCase() : 'low',
    semanticTags: Array.isArray(parsed.semanticTags) ? parsed.semanticTags.filter((item) => typeof item === 'string') : [],
    moodTags: Array.isArray(parsed.moodTags) ? parsed.moodTags.filter((item) => typeof item === 'string') : [],
    instrumentationTags: Array.isArray(parsed.instrumentationTags)
      ? parsed.instrumentationTags.filter((item) => typeof item === 'string')
      : [],
    likelyContent: typeof parsed.likelyContent === 'string' ? parsed.likelyContent : null,
    confidence: Number.isFinite(Number(parsed.confidence)) ? Number(parsed.confidence) : 0,
    reason: typeof parsed.reason === 'string' ? parsed.reason : 'No reason returned.',
    source: 'openai:gpt-4o-mini',
    enrichedAt: new Date().toISOString(),
  }
}

export async function enqueueFolderEnrichmentJobs(sampleRoot, folderPayloads) {
  if (!hasDatabase() || !hasOpenAiKey() || !Array.isArray(folderPayloads) || folderPayloads.length === 0) {
    return 0
  }

  return withDbClient(async (client) => {
    let inserted = 0

    for (const folderPayload of folderPayloads) {
      const relativePath = String(folderPayload.relativePath ?? '').trim()
      if (!relativePath) {
        continue
      }

      const existing = await client.query(
        `
          select id
          from semantic_jobs
          where job_type = 'folder_enrichment'
            and sample_root = $1
            and relative_path = $2
            and status in ('pending', 'running')
          limit 1
        `,
        [sampleRoot, relativePath],
      )

      if (existing.rowCount > 0) {
        continue
      }

      await client.query(
        `
          insert into semantic_jobs (job_type, sample_root, relative_path, payload, status)
          values ('folder_enrichment', $1, $2, $3::jsonb, 'pending')
        `,
        [sampleRoot, relativePath, JSON.stringify(folderPayload)],
      )
      inserted += 1
    }

    return inserted
  })
}

export function runPendingSemanticEnrichmentJobs(limit = 3) {
  if (workerRunning || !hasDatabase() || !hasOpenAiKey()) {
    return
  }

  workerRunning = true

  void withDbClient(async (client) => {
    try {
      const pending = await client.query(
        `
          select id, sample_root, relative_path, payload
          from semantic_jobs
          where status = 'pending'
          order by created_at asc
          limit $1
        `,
        [limit],
      )

      for (const job of pending.rows) {
        await client.query(
          `
            update semantic_jobs
            set status = 'running', attempts = attempts + 1, started_at = now(), updated_at = now(), error_message = null
            where id = $1
          `,
          [job.id],
        )

        try {
          const enrichment = await createFolderEnrichment(job.payload)
          await client.query(
            `
              update folders
              set enrichment = $3::jsonb, updated_at = now()
              where sample_root = $1 and relative_path = $2
            `,
            [job.sample_root, job.relative_path, JSON.stringify(enrichment)],
          )

          await client.query(
            `
              update semantic_jobs
              set status = 'completed', finished_at = now(), updated_at = now(), error_message = null
              where id = $1
            `,
            [job.id],
          )
        } catch (error) {
          await client.query(
            `
              update semantic_jobs
              set status = 'failed', finished_at = now(), updated_at = now(), error_message = $2
              where id = $1
            `,
            [job.id, error instanceof Error ? error.message : 'Semantic enrichment failed.'],
          )
        }
      }
    } finally {
      workerRunning = false
    }
  })
}

export function isSemanticEnrichmentEnabled() {
  return hasDatabase() && hasOpenAiKey()
}
