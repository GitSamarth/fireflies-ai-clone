"use client";
import type { Chapter, Summary } from "@/lib/api";
import { formatClock } from "@/lib/format";

export default function SummaryPanel({ summary, chapters, currentMs, onSeek }:
  { summary: Summary | null; chapters: Chapter[]; currentMs: number; onSeek: (ms: number) => void }) {
  const activeChapter = chapters.reduce((a, c, i) => (c.start_ms <= currentMs ? i : a), -1);
  return (
    <div className="summary">
      {summary ? (
        <>
          <p className="src">{summary.source === "seed" ? "Sample AI summary (seeded data)" : "Auto-generated locally with a keyword heuristic — no LLM involved"}</p>
          <h3>Keywords</h3>
          <div className="chips">{summary.keywords.map((k) => <span key={k} className="chip">{k}</span>)}</div>
          <h3>Meeting overview</h3>
          <p>{summary.overview}</p>
        </>
      ) : <p className="muted">No summary available.</p>}

      <h3>Meeting outline</h3>
      {chapters.length ? (
        <ol className="outline">
          {chapters.map((c, i) => (
            <li key={c.id}>
              <button className={i === activeChapter ? "on" : ""} onClick={() => onSeek(c.start_ms)}>
                <time>{formatClock(c.start_ms)}</time> {c.title}
              </button>
            </li>
          ))}
        </ol>
      ) : <p className="muted">No chapters.</p>}

      {!!summary?.notes.length && (<><h3>Bullet-point notes</h3><ul className="notes">{summary.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></>)}
    </div>
  );
}
