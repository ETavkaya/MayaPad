import { hasDatabase, withDbClient } from './db.js'

const SCHEMA_SQL = [
  `
  create table if not exists packs (
    id bigserial primary key,
    sample_root text not null,
    name text not null,
    relative_path text not null,
    absolute_path text not null,
    semantic_context jsonb not null default '{}'::jsonb,
    enrichment jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (sample_root, relative_path)
  )
  `,
  `
  create table if not exists folders (
    id bigserial primary key,
    pack_id bigint references packs(id) on delete cascade,
    sample_root text not null,
    name text not null,
    relative_path text not null,
    absolute_path text not null,
    parent_relative_path text,
    depth integer not null default 0,
    semantic_context jsonb not null default '{}'::jsonb,
    folder_tags jsonb not null default '{}'::jsonb,
    enrichment jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (sample_root, relative_path)
  )
  `,
  `
  create table if not exists samples (
    id text primary key,
    pack_id bigint references packs(id) on delete set null,
    folder_id bigint references folders(id) on delete set null,
    sample_root text not null,
    absolute_path text not null,
    relative_path text not null,
    filename text not null,
    extension text,
    size_bytes bigint,
    modified_at timestamptz,
    duration_seconds double precision,
    bpm integer,
    bpm_source text,
    key text,
    normalized_key text,
    key_source text,
    category text,
    subtype text,
    role text,
    type text,
    loop_confidence text,
    category_confidence text,
    session_suitability text,
    ignored boolean not null default false,
    ignored_reason text,
    semantic_tags jsonb not null default '[]'::jsonb,
    mood_tags jsonb not null default '[]'::jsonb,
    instrumentation_tags jsonb not null default '[]'::jsonb,
    source_context jsonb not null default '{}'::jsonb,
    classification_reason text,
    semantic_source text not null default 'scanner',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (sample_root, relative_path)
  )
  `,
  `
  create table if not exists sample_overrides (
    id bigserial primary key,
    sample_root text,
    relative_path text not null,
    manual_key text,
    manual_bpm integer,
    excluded boolean not null default false,
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (sample_root, relative_path)
  )
  `,
  `
  create table if not exists folder_tags (
    id bigserial primary key,
    sample_root text,
    relative_path text not null,
    category text,
    role text,
    type text,
    session_suitability text,
    key_mode text,
    inherit_to_children boolean not null default false,
    ignored boolean not null default false,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (sample_root, relative_path)
  )
  `,
  `
  create table if not exists sessions (
    id text primary key,
    name text not null,
    sample_root text,
    selected_pack text,
    tempo double precision,
    time_signature text,
    quantize text,
    key text,
    scale text,
    layout_preset_name text,
    auto_fill_settings jsonb not null default '{}'::jsonb,
    track_config jsonb not null default '[]'::jsonb,
    manifest jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )
  `,
  `
  create table if not exists session_clips (
    id bigserial primary key,
    session_id text references sessions(id) on delete cascade,
    clip_id text not null,
    track_index integer not null,
    scene_index integer not null,
    sample_id text,
    absolute_path text,
    relative_path text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (session_id, clip_id)
  )
  `,
  `
  create table if not exists semantic_jobs (
    id bigserial primary key,
    job_type text not null,
    sample_root text,
    relative_path text,
    payload jsonb not null default '{}'::jsonb,
    status text not null default 'pending',
    error_message text,
    attempts integer not null default 0,
    started_at timestamptz,
    finished_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )
  `,
  'create index if not exists idx_samples_bpm on samples (bpm)',
  'create index if not exists idx_samples_normalized_key on samples (normalized_key)',
  'create index if not exists idx_samples_category on samples (category)',
  'create index if not exists idx_samples_role on samples (role)',
  'create index if not exists idx_samples_session_suitability on samples (session_suitability)',
  'create index if not exists idx_samples_pack_id on samples (pack_id)',
  'create index if not exists idx_samples_folder_id on samples (folder_id)',
  'create index if not exists idx_samples_root_relative_path on samples (sample_root, relative_path)',
  'create index if not exists idx_folders_pack_id on folders (pack_id)',
  'create index if not exists idx_semantic_jobs_status on semantic_jobs (status, created_at)',
]

export async function ensureSemanticSchema() {
  if (!hasDatabase()) {
    return {
      enabled: false,
      migrated: false,
      message: 'DATABASE_URL is not configured; semantic index stays on JSON fallback.',
    }
  }

  await withDbClient(async (client) => {
    for (const statement of SCHEMA_SQL) {
      await client.query(statement)
    }
  })

  return {
    enabled: true,
    migrated: true,
    message: 'PostgreSQL semantic index schema is ready.',
  }
}
