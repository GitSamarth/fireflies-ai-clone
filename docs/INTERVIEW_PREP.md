# Interview prep

## Be ready to defend
1. **Integer-ms times, one `activeIndex` binary search** — O(log n) per tick vs O(n) scan; ms ints avoid float equality bugs.
2. **Player abstraction** — transcript sync depends on `currentMs` only. The simulated clock uses an authoritative ref
   (not render state); I found and fixed a real drift bug there via a failing test.
3. **Action items as rows** — independent PATCH, per-item completion, cheap open-count in the list view.
4. **Optimistic UI** for completing/deleting items with rollback + toast on failure.
5. **Request races** — AbortController + "am I still current" guard; same guard on "Load more".
6. **SQLite FK pragma + delete-before-insert** when replacing participants (unique constraint would otherwise fire — a
   test fails without the fix).
7. **Parser** — format sniffing (`[00:12] A:` starts with `[`, so JSON detection must verify with `json.loads`).

## Questions to expect
- Why SQLite? Why not FTS5 for search? What breaks at 100k segments? (full-scan LIKE; render cost; need virtualization + FTS5/pgvector.)
- How would you swap the mock summarizer for an LLM? (async job, prompt on chunked transcript, store provenance in `summaries.source`, idempotent regenerate.)
- How would you add real audio sync? (word-level timestamps from ASR, `media_url` signed URLs, drift between audio/transcript.)
- Where are the N+1 risks? (list endpoint uses `selectinload`; show me.) 
- What's the security story? (no auth, no rate limit, 1 MB transcript cap, input validation, CORS allow-list.)
- Why do tests pass on a mock that ignored abort — what did that teach you? (don't rely on the transport for correctness.)

## Weaknesses (say them before they do)
Heuristic summaries are weak · no real audio path tested · no migrations · no auth · ephemeral DB on free hosting ·
no transcript virtualization · participants edit doesn't touch speaker labels · no browser E2E · visual fidelity unmeasured.

## To reach production level
Alembic + Postgres, auth/tenancy, background jobs for summarization, FTS5/Postgres tsvector, virtualized transcript,
Playwright E2E + visual regression, structured logging/metrics, rate limiting, CI.

## Learn alongside
SQLAlchemy unit-of-work flush ordering · HTTP caching/ETags · React concurrent rendering & effects · AbortController ·
WebVTT spec · FTS5 · for the ML side later: ASR (Whisper, diarization), chunked LLM summarization, RAG over transcripts.

## Basic → Improved → Research-level
- **Basic (this build):** seeded data, heuristic summary, simulated player.
- **Improved:** Whisper + diarization, LLM summaries w/ structured output, FTS5, "ask this meeting" RAG chat.
- **Research-level:** long-context vs RAG evaluation on meeting QA, speaker-attributed action-item extraction scored
  against human labels, hallucination/faithfulness checks tied to transcript spans.
