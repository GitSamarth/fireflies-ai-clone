"use client";
import type { Chapter } from "@/lib/api";
import { formatClock } from "@/lib/format";
import type { Player } from "@/hooks/usePlayer";

export default function PlayerBar({ player, chapters, mediaUrl }: { player: Player; chapters: Chapter[]; mediaUrl: string | null }) {
  const { currentMs, durationMs, playing, rate } = player;
  return (
    <div className="player" role="group" aria-label="Media player">
      {mediaUrl && <audio ref={player.audioRef} src={mediaUrl} preload="metadata" />}
      <button className="play-btn" onClick={player.toggle} aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
      <button className="icon-btn" onClick={() => player.seek(currentMs - 10000)} aria-label="Back 10 seconds">⟲10</button>
      <button className="icon-btn" onClick={() => player.seek(currentMs + 10000)} aria-label="Forward 10 seconds">10⟳</button>
      <span className="time">{formatClock(currentMs)} / {formatClock(durationMs)}</span>
      <div className="seek">
        <input type="range" min={0} max={durationMs} step={100} value={Math.min(currentMs, durationMs)}
          aria-label="Seek" aria-valuetext={formatClock(currentMs)}
          style={{ ["--pct" as string]: `${durationMs ? (currentMs / durationMs) * 100 : 0}%` }}
          onChange={(e) => player.seek(Number(e.target.value))} />
        {chapters.map((c) => (
          <i key={c.id} className="tick" title={c.title} style={{ left: `${durationMs ? (c.start_ms / durationMs) * 100 : 0}%` }} />
        ))}
      </div>
      <select aria-label="Playback speed" value={rate} onChange={(e) => player.setRate(Number(e.target.value))}>
        {[0.75, 1, 1.25, 1.5, 2].map((r) => <option key={r} value={r}>{r}×</option>)}
      </select>
      {!mediaUrl && <span className="player-note" title="No audio file is attached to this meeting; the timeline is simulated so transcript sync can be demonstrated.">placeholder audio</span>}
    </div>
  );
}
