# LaunchBrain

LaunchBrain is a desktop-first session-launcher prototype (React + Vite + Zustand + Node/Express).

Current focus:
- real local sample library scanning
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
- Folder browser modal for choosing sample root (no file copy)
- Library scan of real audio files (`wav/aiff/aif/mp3/flac/ogg`)
- Browser preview playback directly on sample rows (active row play/stop indicator)
- Drag-and-drop from browser results into grid clips
- Browser double-click sample to load into selected clip
- 8x8 session grid clip playback
- Quantized clip/scene launch queue
- One clip per column/track rule
- Scene launch switching per column
- Stop All / per-column stop behavior
- Web Audio transport scheduling (AudioContext clock, quantized boundaries)
- Clip sync metadata (duration, detected BPM, beats length, sync status, playbackRate)
- Clip context menu + partial clear workflow (clip/row/column/all/remove missing/undo)
- Auto Fill with source selection:
  - Selected Pack
  - Auto Best Pack
  - Entire Library
- Lightweight session manifest save/load (`.launchbrain/sessions/*.json`)

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
- If selected pack coverage is narrow (for example drums-only), Auto Fill keeps non-matching columns empty by default instead of forcing unrelated files.
- Optional fallback to sibling categories is only used when `Prefer same folder` is disabled.
- If no pack is selected in `Selected Pack` mode, it falls back to best-coverage pack.
- `Auto Best Pack` picks the top-level folder with strongest category coverage.
- `Entire Library` allows cross-pack fill.
- Grid header shows resolved source context, coverage, target BPM, key, and mode.
- Default BPM tolerance is `3` for tighter loop coherence.

## Session Save/Load (Lightweight)

- Sessions are saved as JSON manifests in:
  - `.launchbrain/sessions/`
- Audio files are never copied or moved.
- Manifests only store references (`absolutePath`, `relativePath`, metadata, grid position).
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
  services/
    configStore.js
    sampleScanner.js
    sampleIndexStore.js
    audioDevices.js
    midiDevices.js
    fsBrowser.js
    sessionStore.js

src/
  components/
  data/
  features/
  pages/
  services/
  store/
  types/
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

## Root/Scan Workflow

1. Use top status root indicator + settings icon to open **Session** tab.
2. Click **Browse Folder**, choose sample root.
3. Click **Use This Folder**.
4. Click **Scan/Rescan**.
5. In left explorer, select a pack.
6. Use **Auto Fill Grid**.

## Browser + Grid Workflow

1. Click a sample row to select + preview.
2. Click the same active sample again to stop preview.
3. Drag a sample from browser results onto any grid slot to assign it.
4. Double-click a sample to load it into the currently selected clip.
5. Use right-click on a clip for play/stop, replace, and clear actions.

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
- frontend `3010`
- backend `8010`

Example sample mount:

```yaml
volumes:
  - "D:/Samples:/sample-library:ro"
```

Set sample root to:

```text
/sample-library
```

## Known Limitations

- Browser playback prototype (Web Audio scheduling, not a full DAW engine)
- No time-stretching/warping yet
- Clips with different BPM are not warped to project tempo
- Loop sync currently uses playbackRate, so pitch can change
- Bad trims or wrong BPM metadata can still produce imperfect loop feel
- Session manifests reference local files; moving/renaming files can cause missing clips
- BPM/key detection is filename/folder heuristic (not audio analysis)
- No harmonic matching engine yet
- No MIDI hardware control/mapping yet
- No recording pipeline yet
- No mixer/timeline/VST/arrangement features yet
