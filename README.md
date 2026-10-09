# Fireflies.ai Clone — Meeting Notes & Transcription Platform

Scaler SDE Fullstack assignment. A Fireflies-style workspace: meeting library, interactive transcript synced to a
player, summaries / outline / action items, and full meeting CRUD. Transcription and AI summaries are mocked/seeded as
the assignment allows.

**Stack:** Next.js 15 (App Router, TypeScript, plain CSS) · FastAPI + SQLAlchemy 2 · SQLite · pytest · Vitest + Testing Library

## Run locally
```bash
# backend → http://localhost:8000  (docs at /docs). Creates fireflies.db and seeds 5 meetings on first start.
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload

# frontend → http://localhost:3000
cd frontend && cp .env.example .env.local && npm install && npm run dev
```
Tests: `cd backend && pytest` · `cd frontend && npm test && npm run lint && npm run build`

## Features vs. the assignment
| Requirement | Where |
|---|---|
| Library: title/date/duration/participants, search, filters (participant, date range), sort, navbar | `app/page.tsx`, `GET /api/meetings` |
| Transcript with speakers + timestamps; click line → seek; player position → active line | `TranscriptPanel`, `usePlayer`, `activeIndex()` |
| Player with seek bar | `PlayerBar` (real `<audio>` if `media_url` set, else simulated clock — see Assumptions) |
| In-transcript search with highlighted matches, next/prev | `TranscriptPanel`, `Highlight` |
| Summary, keywords, outline/chapters (click → seek), notes, action items | `SummaryPanel`, `ActionItems` |
| Create (paste / .txt / .vtt / .json), edit title+participants, delete (confirm) | `CreateMeetingModal`, `EditMeetingModal` |
| Action items: add / edit / complete / delete (optimistic with rollback) | `ActionItems`, `/api/action-items` |
| Toasts, modals, settings + coming-soon placeholders, loading/empty/error states | `Toast`, `Modal`, `app/settings` |
| Bonus done: global transcript search API (`/api/search`), summary auto-generation for imports | UI for global search **not built** |

## Architecture
```
Next.js (client components) ──fetch/JSON──▶ FastAPI routers ─▶ services/parsing/summarizer ─▶ SQLAlchemy ─▶ SQLite
```
- `backend/app/routers/` thin HTTP layer + validation; `services.py` use-cases; `parsing.py` transcript import
  (txt/vtt/json → normalized segments); `summarizer.py` deterministic heuristic summary; `seed.py` sample data.
- Frontend isolates server access in `lib/api.ts`; playback in `hooks/usePlayer.ts` (one interface over real audio or
  simulated clock) so transcript sync never knows which backs it.

## Database schema (SQLite)
```
meetings(id, title, started_at, duration_ms, media_url, created_at, updated_at)
  ├─< participants(id, meeting_id FK, name)                UNIQUE(meeting_id, name)
  ├─< transcript_segments(id, meeting_id FK, idx, speaker, start_ms, end_ms, text)   INDEX(meeting_id, start_ms)
  ├─1 summaries(meeting_id PK/FK, overview, keywords JSON, notes JSON, source)       source = seed | heuristic
  ├─< chapters(id, meeting_id FK, start_ms, title)
  └─< action_items(id, meeting_id FK, text, assignee, due_date, completed, created_at)
```
All children `ON DELETE CASCADE` (+ `PRAGMA foreign_keys=ON`, which SQLite needs explicitly).
Design choices: timestamps are **integer ms** (exact seek/sync comparisons); action items are **rows**, not JSON, so
they mutate independently; chapters carry `start_ms` so the outline is clickable; keywords/notes are JSON because
they're always read/written whole.

## API
| Method & path | Purpose |
|---|---|
| `GET /api/meetings?q&participant&date_from&date_to&sort=recent\|oldest&limit&offset` | list → `{items,total}`; `q` matches title or participant |
| `GET /api/meetings/participants` | distinct names for the filter |
| `POST /api/meetings` | create from `{title, transcript, filename?, started_at?, participants?}`; parses + summarizes |
| `GET / PATCH / DELETE /api/meetings/{id}` | detail (segments, summary, chapters, items) / edit title+participants / delete |
| `POST /api/meetings/{id}/action-items` | add item |
| `PATCH / DELETE /api/action-items/{id}` | edit, complete, delete (explicit `null` clears assignee/due date) |
| `GET /api/search?q=` | cross-meeting transcript search with snippets |
| `GET /api/health` | liveness |

## Assumptions & known limitations (please read)
- **No real audio.** Seeded/imported meetings have `media_url = null`, so the player is a *simulated timeline*
  (labelled "placeholder audio" in the UI). Set `media_url` and it uses a real `<audio>` element through the same hook;
  that path is written but **not covered by automated tests** (jsdom has no media).
- **Summaries are mocked.** Seeded ones are hand-written; imported ones come from a keyword/regex heuristic and are
  labelled as such in the UI. Quality is modest by design; no LLM is called.
- Seeded meetings are condensed (≈1–2 min of transcript each) so the demo is fast to read.
- Imported transcripts without timestamps get synthetic timing (~2.6 words/s).
- Editing participants does **not** rename speaker labels inside transcript segments.
- Auth is a fixed "Demo User". Integrations/team/AI-apps/settings are "Coming soon" placeholders.
- Schema is created with `create_all()` (no migrations). Datetimes are stored as naive UTC and shown in local time.
- Global search is a `LIKE` scan (fine at this scale; FTS5 is the upgrade). Long transcripts render every segment
  (no virtualization yet).
- Visual fidelity: colors/layout follow the public reference clone's sampled design tokens; I have **not** compared
  against live Fireflies screenshots.

## Testing (what is and isn't verified)
- Backend: 26 pytest tests — parser (txt/vtt/json/edge cases), CRUD, filters/sort/pagination, cascade deletes, search.
- Frontend: 34 Vitest tests on the real components + real player hook (network mocked): click→seek, seek→active line,
  timed playback and speed, search highlight/navigation, CRUD flows, optimistic rollback, stale-response handling.
- Smoke: real server restart keeps data; CORS allow/deny checked.
- **Not done:** real-browser E2E (no browser available in the build environment), live deployment.

## Deploy
Backend → Render (`render.yaml`; set `ALLOWED_ORIGINS` to the frontend URL). Frontend → Vercel with root `frontend`
and `NEXT_PUBLIC_API_URL` = backend URL. Render's free disk is ephemeral: the DB re-seeds on restart, so the demo stays
usable but user-created data does not survive redeploys (use a persistent disk or Postgres for that).
