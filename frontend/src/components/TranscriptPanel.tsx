"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Segment } from "@/lib/api";
import { colorFor, formatClock, initials } from "@/lib/format";
import Highlight, { countMatches } from "./Highlight";

export default function TranscriptPanel({ segments, activeIdx, onSeek }:
  { segments: Segment[]; activeIdx: number; onSeek: (ms: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState("");
  const [cur, setCur] = useState(0);
  const [follow, setFollow] = useState(true);
  const t = term.trim();

  // occurrence offsets so each match has a global index
  const { offsets, total } = useMemo(() => {
    let n = 0;
    const offsets = segments.map((s) => { const o = n; n += countMatches(s.text, t); return o; });
    return { offsets, total: n };
  }, [segments, t]);

  useEffect(() => { setCur(0); }, [t]);

  // jump to the current search match
  useEffect(() => {
    if (!t || !total) return;
    box.current?.querySelector(`mark[data-occ="${cur}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [cur, t, total]);

  // follow playback unless the user scrolled away on purpose
  useEffect(() => {
    if (!follow || activeIdx < 0 || t) return;
    box.current?.querySelector(`[data-idx="${activeIdx}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeIdx, follow, t]);

  const step = (d: number) => { if (total) { setFollow(false); setCur((c) => (c + d + total) % total); } };

  return (
    <div className="transcript">
      <div className="t-tools">
        <input type="search" aria-label="Search transcript" placeholder="Search in transcript…" value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") step(e.shiftKey ? -1 : 1); if (e.key === "Escape") setTerm(""); }} />
        {t && <span className="muted count" aria-live="polite">{total ? `${cur + 1} of ${total}` : "No matches"}</span>}
        {t && <button className="icon-btn" aria-label="Previous match" onClick={() => step(-1)} disabled={!total}>↑</button>}
        {t && <button className="icon-btn" aria-label="Next match" onClick={() => step(1)} disabled={!total}>↓</button>}
        {!follow && !t && <button className="btn sm" onClick={() => setFollow(true)}>Follow playback</button>}
      </div>
      <div className="t-scroll" ref={box} onWheel={() => setFollow(false)} onTouchMove={() => setFollow(false)}>
        {segments.map((s, i) => (
          <div key={s.id} data-idx={i} role="button" tabIndex={0} className={`seg${i === activeIdx ? " active" : ""}`}
            onClick={() => { setFollow(true); onSeek(s.start_ms); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFollow(true); onSeek(s.start_ms); } }}>
            <span className="avatar sm" style={{ background: colorFor(s.speaker) }} aria-hidden>{initials(s.speaker)}</span>
            <div className="seg-body">
              <div className="seg-head"><b>{s.speaker}</b><time>{formatClock(s.start_ms)}</time></div>
              <p><Highlight text={s.text} term={t} firstOccurrence={offsets[i]} currentOccurrence={cur} /></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
