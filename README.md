# LaunchBrain

LaunchBrain is a desktop-first session-launcher prototype (React + Vite + Zustand + Node/Express).

Current focus:
- real local sample library scanning
- PostgreSQL semantic indexing
- pack-first browsing
- browser sample and clip playback
- quantized session-launch behavior
- Web Audio clock-synced loop playback

## Current Capabilities

- One-page layout (`100vh`) with internal panel scrolling
- Collapsible bottom inspector
- Left sidebar focused on Library Explorer + Results (root/settings moved to Session tab)
- Real sample root config in `.launchbrain/config.json`
- Real sample index in `.launchbrain/sample-index.json`
- PostgreSQL semantic index when `DATABASE_URL` is configured
- Manual folder-tag overrides in `.launchbrain/folder-tags.json`
- Folder browser modal for choosing sample root (no file copy)
- Library scan of real audio files (`wav/aiff/aif/mp3/flac/ogg`)
- Semantic scanner hierarchy:
  - folder tags
  - folder context
  - parent folders
  - pack context
  - filename parsing
  - BPM/key extraction
  - suitability heuristics
  - optional OpenAI folder enrichment
- Browser preview playback directly on sample rows (active row play/stop indicator)
- Drag-and-drop from browser results into grid clips
- Browser double-click sample to load into selected clip
- Grid clip preload/decode pipeline with per-slot `unloaded/loading/ready/failed` preparation states
- 8x8 session grid clip playback
- Track Role system (role-driven columns instead of hardcoded column logic)
- Column reorder (move left/right, role-aware remap of clips + controls)
- Layout presets:
  - Classic
  - Vocal First
  - Instrument First
  - Performance
- Quantized clip/scene launch queue
- One clip per column/track rule
- Scene launch switching per column
- Stop All / per-column stop behavior
- Working per-track controls:
  - Mute affects actual playback output
  - Solo affects actual playback output
  - Arm is a future capture placeholder
- Web Audio transport scheduling (AudioContext clock, quantized boundaries)
- Clip sync metadata (duration, detected BPM, beats length, sync status, playbackRate)
- Clip context menu + partial clear workflow (clip/row/column/all/remove missing/undo)
- Auto Fill with source selection:
  - Selected Pack
  - Auto Best Pack
  - Entire Library
- Context-aware explorer groups that scope Categories/BPM/Key/Type counts to the selected pack
- Auto Fill respects current Track Role layout and accepted categories per column
- Auto Fill duplicate prevention by default (`Allow duplicates` is optional)
- Auto Fill prefers correct empty slots over wrong category fills
- Live-role metadata on tracks (Instrument + Vocal marked `LIVE` for future capture workflows)
- Launchpad Pro MK3 planning schema (`src/hardware/launchpadProMapping.ts`)
- Harmonic Intelligence Layer v1:
  - normalized key parsing with enharmonic handling
  - strict / compatible / off key matching
  - manual key overrides + per-sample Auto Fill exclusion
  - persisted overrides in `.launchbrain/sample-overrides.json`
- Semantic indexing foundation for future:
  - semantic search
  - pgvector-ready schema
  - AI-assisted session building
  - pack/folder enrichment jobs
- Lightweight session manifest save/load (`.launchbrain/sessions/*.json`)

## Semantic Index Architecture

LaunchBrain now supports a database-backed semantic index layer:

```text
Filesystem
  -> Semantic scanner
  -> PostgreSQL semantic index
  -> Optional OpenAI folder enrichment
  -> Auto Fill / Session Builder / future semantic search
```

Important:
- The filesystem remains the source of truth.
- Audio files are never copied into PostgreSQL.
- PostgreSQL stores metadata, folder/pack context, semantic tags, and future-ready search structures.
- If `DATABASE_URL` is not configured, LaunchBrain falls back to the JSON index cache.

Core tables:
- `packs`
- `folders`
- `samples`
- `sample_overrides`
- `folder_tags`
- `sessions`
- `session_clips`
- `semantic_jobs`

## Semantic Scanner v1

The scanner now classifies from context before filenames.

Priority order:
1. Folder tags override
2. Folder context
3. Parent folder context
4. Pack context
5. Filename parsing
6. BPM / key extraction
7. Duration / type heuristics
8. Optional OpenAI folder enrichment
9. Unknown fallback

Examples:
- `Drum Loops` strongly implies `Drums`, `loop`, `key-neutral`, `high suitability`
- `Vocal Atmospheres` strongly implies `Vocal`, phrase/texture content, `high suitability`
- `Construction Kits` can bias toward harmonic loop/stem content rather than utility one-shots

## Folder Tags

Manual folder-tag overrides live in:

```text
.launchbrain/folder-tags.json
```

Folder tags can override:
- `category`
- `role`
- `type`
- `sessionSuitability`
- `keyMode`
- `inheritToChildren`
- `ignored`

Folder tags have higher priority than scanner guesses.

## Session Suitability

Every indexed sample now gets a suitability level:
- `high`: loops, phrases, grooves, stems, atmospheres, playable live content
- `medium`: FX, transitions, supporting textures
- `low`: uncertain or weakly-classified material
- `ignore`: helper/utility/non-session material

Auto Fill prefers:

```text
high >>> medium >>> low
```

## Ignored Content Strategy

The semantic index now ignores or strongly deprioritizes non-session material.

Default ignored examples:
- presets
- MIDI
- DAW projects
- Kontakt/Serum preset content
- helper previews/demo assets
- non-audio assets
- single drum hits / utility one-shots

The live session grid is optimized for:
- loops
- phrases
- grooves
- stems
- atmospheres
- textures
- vocal phrases
- drum loops
- melodic loops
- bass loops
- FX transitions

## Optional OpenAI Enrichment

Optional enrichment is available when:
- `DATABASE_URL` is configured
- `OPENAI_API_KEY` is configured

Model used:
- `gpt-4o-mini`

Important:
- OpenAI is an enrichment layer, not the source of truth.
- The app fully works without OpenAI.
- Enrichment runs at folder/pack level, not per-sample.
- Enrichment results are stored separately from raw scanner metadata.

## Session Launch Behavior

- Clip states:
  - `empty`
  - `stopped`
  - `queued`
  - `playing`
  - `stopping`
- If quantize is not `None`, clip actions are queued to next boundary.
- If quantize is `None`, clip actions are immediate.
- Only one clip can play per column.
- Launching another clip in the same column queues switch at boundary.
- Scene launch queues row clips and switches each filled column at boundary.
- Top transport Stop stops clock and all clips immediately.
- Actual audio start/stop is scheduled by Web Audio time (`AudioContext.currentTime`), not JS wall-clock timers.

## Web Audio Sync

- A shared transport service drives clip launch timing from `AudioContext.currentTime`.
- Grid clips are prepared in the background before they are allowed to launch.
- The transport clock is isolated from clip loading, preview playback, Auto Fill and drag/drop assignment.
- Loop clips are bar-locked by scheduling repeated segments at musical boundaries.
- Loop sync uses:
  - detected BPM (filename parse) when available
  - estimated beats length snap (`1,2,4,8,16,32,64`)
  - playbackRate correction to match project tempo
- Clip inspector displays:
  - duration
  - detected BPM + source
  - estimated beats / beats length
  - sync status
  - playbackRate
- Note: playbackRate-based sync can shift pitch in this prototype.

## Quantize + Clock

- Global transport clock runs when Play is active.
- Segmented quantize meter shows current launch cycle (up to 16 segments).
- Beat indicator shows current beat in cycle (`Beat x / y`) for the selected quantize length.
- Meter visuals read from the same audio transport clock used for scheduling.
- Quantize options:
  - `None`
  - `1/4`
  - `1/2`
  - `1 Bar`
  - `2 Bars`
  - `4 Bars`
  - `8 Bars`

## Auto Fill Source Rules

- If source is `Selected Pack` and a pack is selected, Auto Fill uses only that pack.
- Auto Fill consumes the semantic index snapshot returned by the backend.
- Semantic role/category and session suitability now influence candidate ranking.
- If selected pack coverage is narrow (for example drums-only), Auto Fill keeps non-matching columns empty by default instead of forcing unrelated files.
- Optional fallback to sibling categories is only used when `Prefer same folder` is disabled.
- If no pack is selected in `Selected Pack` mode, it falls back to best-coverage pack.
- `Auto Best Pack` picks the top-level folder with strongest category coverage.
- `Auto Best Pack` reason text now reports role coverage, common BPM and usable loop context.
- `Entire Library` allows cross-pack fill.
- Grid header shows resolved source context, coverage, target BPM, key, and mode.
- Default BPM tolerance is `3` for tighter loop coherence.

## Clip Preparation

- Assigned grid clips are not launched raw.
- Preload is optional in Auto Fill settings and is off by default for a faster live-performance feel.
- After Auto Fill, only the clips actually placed on the grid are prepared/decode-cached.
- Preparation states:
  - `unloaded`
  - `loading`
  - `ready`
  - `failed`
- These are internal engine states. The performance grid only shows:
  - `Queued`
  - `Playing`
  - `Stopping`
  - `Failed`
- If a clip is still loading when clicked, it will not launch asynchronously out of time.
- Click feedback is immediate even when a clip is still preparing.
- Scene launch skips unready clips instead of starting them late.
- Session inspector exposes lightweight diagnostics for:
  - transport state
  - queued/playing clips
  - loading/ready/failed clips
  - last schedule/decode error

## Track Controls

- Each column now has a fuller runtime track model:
  - `muted`
  - `solo`
  - `armed`
  - `selected`
  - `volume`
  - `playingClipId`
  - `queuedClipId`
- Mute is immediate and uses per-track gain routing instead of stopping clips.
- Solo recalculates track audibility across all columns:
  - soloed and not muted = audible
  - non-soloed columns are dimmed when any solo is active
- Arm is a non-recording placeholder for future live capture workflows.
- Track tab now shows:
  - role/name
  - muted / soloed / armed state
  - selected clip
  - currently playing clip
  - queued clip
  - future input type
  - browser playback output
- Track control actions are prepared for future Launchpad Pro mapping:
  - `toggleTrackMute(trackId)`
  - `toggleTrackSolo(trackId)`
  - `toggleTrackArm(trackId)`
  - `stopTrack(trackId)`
  - `selectTrack(trackId)`

## Track Role System

- Columns are now rendered from role config, not fixed hardcoded label arrays.
- Each track column carries role metadata:
  - `role`, `label`, `shortLabel`, `icon`, `color`
  - `acceptedCategories`
  - `preferredTypes`
  - `liveInput`, `inputType`, `futureDevice`
  - `allowOneShots`, `launchRule`, `hardwareColumnIndex`
- Auto Fill scoring and filtering uses the current role config per column.
- Wrong category filling is avoided; empty slots are preferred over mismatched assignments.

### Column Reorder

- Move columns left/right from each track header.
- Reordering remaps:
  - column header
  - track controls
  - clip assignments
- Reorder is role-aware and updates track metadata/indexes for future hardware mapping.

### Layout Presets

- Available presets:
  - `Classic`
  - `Vocal First`
  - `Instrument First`
  - `Performance`
- Applying a preset remaps columns by role (not by fixed index assumptions).
- Preset selector is available in Session Grid options and Session inspector tab.

## Harmonic Intelligence Layer v1

- Key parsing now uses safer token boundaries (spaces, `_`, `-`, brackets, folder separators).
- Parsing supports formats like:
  - `Gm`, `Gmin`, `G minor`
  - `F#min`, `Bb_major`, `Ab Maj`
- False positives inside words are reduced (for example `Em` in `Stem` is ignored).
- Every scanned sample now carries:
  - `parsedKey`
  - `normalizedKey`
  - `keySource` (`filename` / `folder` / `manual` / `unknown`)
  - `keyConfidence` (`high` / `medium` / `low`)

Compatibility modes:
- `off`: key is ignored
- `strict`: exact normalized key only
- `compatible`: exact + relative/parallel + simple adjacent fifth compatibility

Unknown-key handling:
- `allowUnknownKeySamples` is available in Auto Fill options
- default `true` for compatible mode
- default `false` for strict mode
- `allowKeyNeutralStrict` keeps Drum / Drum 2-Hats / FX columns usable in strict mode even when samples are keyless

Category confidence:
- Scanner now stores:
  - `category`
  - `categoryConfidence`
  - `categorySource`
- Drum / Drum 2-Hats / FX assignment requires medium/high confidence material.
- Low-confidence samples are rejected for strict role-driven filling.

Auto Fill harmonic context priority:
1. Auto Fill explicit key (if set)
2. Active key filter/group
3. Project key + scale
4. Most common key in the selected source

Right-click tools on browser samples and grid clips:
- Analyze Key
- Set Key Manually
- Mark Key Unknown
- Use This Key as Project Key
- Exclude/Include From Current Auto Fill
- Show Metadata
- `Transpose / Change Key to Project Key` (placeholder, disabled)

## Sample Overrides

- User metadata corrections are stored in:
  - `.launchbrain/sample-overrides.json`
- Overrides are path-based (relative to sample root), no audio copy/move is performed.
- Current fields:
  - `manualKey`
  - `manualBpm`
  - `excluded`
  - `notes`
- Overrides are applied automatically on scan and when loading cached index.

Overrides API:
- `GET /api/overrides`
- `POST /api/overrides/sample`
- `DELETE /api/overrides/sample`

## Session Save/Load (Lightweight)

- Sessions are saved as JSON manifests in:
  - `.launchbrain/sessions/`
- Audio files are never copied or moved.
- Manifests only store references (`absolutePath`, `relativePath`, metadata, grid position).
- Manifest now also stores:
  - track role config/order
  - layout preset name
  - transport + harmonic settings
  - Auto Fill settings + selected pack context
- Save/Load controls are available in the top-bar session menu:
  - Save Set
  - Save Set As
  - Load Set
  - Recent Sets
- Load behavior:
  1. try `absolutePath`
  2. fallback to `sampleRoot + relativePath`
  3. if still missing, clip remains visible and is marked missing

## Project Structure

```text
server/
  index.js
  routes/
    configRoutes.js
    sampleRoutes.js
    deviceRoutes.js
    fsRoutes.js
    sessionRoutes.js
    overridesRoutes.js
  services/
    configStore.js
    db.js
    folderTagsStore.js
    semanticEnrichment.js
    semanticIndexService.js
    semanticSchema.js
    sampleScanner.js
    sampleIndexStore.js
    overridesStore.js
    musicTheory.js
    audioDevices.js
    midiDevices.js
    fsBrowser.js
    sessionStore.js

src/
  components/
  data/
  hardware/
  features/
  pages/
  services/
  store/
  types/
  utils/
```

## Run Locally (Windows)

1. Install:

```bash
npm install
```

2. Run frontend + backend:

```bash
npm run dev
```

- Frontend: `http://localhost:3010`
- Backend API: `http://localhost:8010`

Optional split mode:

```bash
npm run dev:server
npm run dev:client
```

Optional local PostgreSQL:

```bash
$env:DATABASE_URL="postgresql://launchbrain:launchbrain@localhost:5432/launchbrain"
npm run dev
```

Optional OpenAI enrichment:

```bash
$env:OPENAI_API_KEY="your-key-here"
npm run dev
```

## Root/Scan Workflow

1. Use top status root indicator + settings icon to open **Session** tab.
2. Click **Browse Folder**, choose sample root.
3. Click **Use This Folder**.
4. Click **Scan/Rescan**.
5. In left explorer, select a pack.
6. Use **Auto Fill Grid**.

The scan will:
- index playable audio into the semantic scanner pipeline
- mirror the visible snapshot into `.launchbrain/sample-index.json`
- populate PostgreSQL when `DATABASE_URL` is available
- queue optional background folder-enrichment jobs when `OPENAI_API_KEY` is available

## Browser + Grid Workflow

1. Click a sample row to select + preview.
2. Click the same active sample again to stop preview.
3. Drag a sample from browser results onto any grid slot to assign it.
4. Double-click a sample to load it into the currently selected clip.
5. Manual clip loading now prepares the clip through the transport sync pipeline before use.
6. Use right-click on a clip for play/stop, replace, and clear actions.

## Regression Checklist

1. Auto Fill a `D Minor` strict pattern.
2. Confirm Drum / Drum 2-Hats / FX columns still fill with key-neutral material.
3. Start two loops at the same BPM and confirm they stay synchronized.
4. Drag a drum loop manually into the Drum column.
5. Trigger it with another loop and confirm the beat meter keeps running.
6. Switch clips in the same column and confirm one-clip-per-column still holds.
7. Select a pack and confirm Categories / BPM / Key / Type groups update to that pack only.
8. Clear the pack selection and confirm explorer groups return to the entire library.
9. Auto Fill a large pack and confirm clip slots show loading/ready states without freezing transport.
10. Confirm duplicate samples are avoided when `Allow duplicates` is off.

## Build + Start

```bash
npm run build
npm run start
```

`npm run start` runs backend on `8010` and serves `dist/` when built.

## Session API

- `GET /api/sessions`
- `POST /api/sessions/save`
- `GET /api/sessions/:id`
- `POST /api/sessions/load/:id`

## Docker Readiness

Included:
- `Dockerfile.client`
- `Dockerfile.server`
- `docker-compose.yml`

Ports:
- postgres `5432`
- frontend `3010`
- backend `8010`

Example sample mount:

```yaml
volumes:
  - "D:/Samples:/sample-library:ro"
```

Compose now includes:
- `postgres` for the semantic index
- `backend` with `DATABASE_URL`
- optional `OPENAI_API_KEY` pass-through for enrichment jobs

Set sample root to:

```text
/sample-library
```

## Known Limitations

- Browser playback prototype (Web Audio scheduling, not a full DAW engine)
- Semantic scanner is still heuristic-first; it uses folder context before filenames, but it is not full waveform/audio-content analysis yet
- OpenAI enrichment is optional, async, and folder-level only
- Current database schema is future-ready for semantic search/pgvector, but vector search is not implemented yet
- No time-stretching/warping yet
- Clips with different BPM are not warped to project tempo
- Loop sync currently uses playbackRate, so pitch can change
- Bad trims or wrong BPM metadata can still produce imperfect loop feel
- Browser preview is intentionally separate from the transport engine; preview should not affect session timing
- Session manifests reference local files; moving/renaming files can cause missing clips
- BPM/key detection is filename/folder heuristic (not audio analysis)
- Category/session suitability confidence is still rule-based plus optional folder enrichment, not waveform analysis
- Audio key analysis endpoint is currently a truthful placeholder (manual key override is the working path)
- Manual key override updates metadata only (it does not transpose audio)
- Real non-destructive pitch-shifting / key change to project key is not implemented yet
- Launchpad Pro MK3 mapping schema is planning-only in this step (no live MIDI control wired yet)
- Live input roles (Instrument/Vocal) are metadata + UX indicators only; capture/recording is not active yet
- No MIDI hardware control/mapping yet
- No recording pipeline yet
- No mixer/timeline/VST/arrangement features yet

## Future Semantic Direction

The current schema is intentionally ready for:
- semantic search
- pgvector embeddings
- “build me an afro house set”
- “find dark female vocal textures”
- “generate cinematic D minor atmosphere”

Those are not implemented yet in this step, but the index architecture is now prepared for them.
