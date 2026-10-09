"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/Toast";
import { api, type MeetingListItem } from "@/lib/api";
import { colorFor, formatDay, formatDuration, formatTime, initials } from "@/lib/format";

const PAGE = 20;

export default function Library() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [participant, setParticipant] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const [names, setNames] = useState<string[]>([]);
  const [items, setItems] = useState<MeetingListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const ctl = useRef<AbortController | null>(null);

  useEffect(() => { const t = setTimeout(() => setDebouncedQ(q), 250); return () => clearTimeout(t); }, [q]);
  useEffect(() => { api.participants().then(setNames).catch(() => {}); }, []);

  const params = useMemo(
    () => ({ q: debouncedQ, participant, date_from: dateFrom, date_to: dateTo, sort, limit: PAGE }),
    [debouncedQ, participant, dateFrom, dateTo, sort],
  );
  const badRange = !!dateFrom && !!dateTo && dateFrom > dateTo;

  useEffect(() => {
    if (badRange) return;
    ctl.current?.abort(); // a slower, older response must never overwrite a newer one
    const c = (ctl.current = new AbortController());
    setLoading(true); setError("");
    api.listMeetings(params, c.signal)
      .then((r) => { if (c.signal.aborted) return; setItems(r.items); setTotal(r.total); setLoading(false); })
      .catch((e) => { if (c.signal.aborted || e.name === "AbortError") return; setError(e.message); setLoading(false); });
    return () => c.abort();
  }, [params, badRange, retry]);

  const loadMore = useCallback(async () => {
    setMore(true);
    const c = ctl.current; // identifies the filter set this page-load belongs to
    try {
      const r = await api.listMeetings({ ...params, offset: items.length });
      if (c !== ctl.current || c?.signal.aborted) { setMore(false); return; } // filters changed meanwhile
      setItems((cur) => [...cur, ...r.items.filter((n) => !cur.some((c) => c.id === n.id))]);
      setTotal(r.total);
    } catch (e) { toast((e as Error).message, "error"); }
    setMore(false);
  }, [params, items.length, toast]);

  const groups = useMemo(() => {
    const out: { day: string; rows: MeetingListItem[] }[] = [];
    for (const m of items) {
      const day = formatDay(m.started_at);
      const last = out[out.length - 1];
      if (last && last.day === day) last.rows.push(m); else out.push({ day, rows: [m] });
    }
    return out;
  }, [items]);

  const filtered = !!(debouncedQ || participant || dateFrom || dateTo);
  const clear = () => { setQ(""); setDebouncedQ(""); setParticipant(""); setDateFrom(""); setDateTo(""); };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Meetings</h1>
        <span className="muted">{loading ? "Loading…" : `${total} meeting${total === 1 ? "" : "s"}`}</span>
      </div>

      <div className="toolbar">
        <input className="search" type="search" aria-label="Search meetings" placeholder="Search by title or participant…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter by participant" value={participant} onChange={(e) => setParticipant(e.target.value)}>
          <option value="">All participants</option>
          {names.map((n) => <option key={n}>{n}</option>)}
        </select>
        <label className="inline">From<input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} /></label>
        <label className="inline">To<input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} /></label>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as "recent" | "oldest")}>
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest first</option>
        </select>
        {filtered && <button className="btn" onClick={clear}>Clear</button>}
      </div>
      {badRange && <div className="form-error">“From” date must be on or before “To” date.</div>}

      {error ? (
        <div className="empty"><p>{error}</p><button className="btn primary" onClick={() => setRetry((n) => n + 1)}>Retry</button></div>
      ) : loading && !items.length ? (
        <div aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" />)}</div>
      ) : !items.length ? (
        <div className="empty">
          <p>{filtered ? "No meetings match your filters." : "No meetings yet. Add one with “+ Add meeting”."}</p>
          {filtered && <button className="btn" onClick={clear}>Clear filters</button>}
        </div>
      ) : (
        <div style={{ opacity: loading ? 0.6 : 1 }}>
          {groups.map((g) => (
            <section key={g.day}>
              <h2 className="day">{g.day}</h2>
              {g.rows.map((m) => (
                <Link key={m.id} href={`/meetings/${m.id}`} className="meeting-card">
                  <span className="squircle" aria-hidden>▶</span>
                  <span className="mc-body">
                    <span className="mc-title">{m.title}</span>
                    <span className="mc-meta">{formatTime(m.started_at)} · {formatDuration(m.duration_ms)} · {m.participants.slice(0, 3).join(", ")}{m.participants.length > 3 ? ` +${m.participants.length - 3}` : ""}</span>
                    {m.overview_preview && <span className="mc-preview">{m.overview_preview}</span>}
                  </span>
                  <span className="avatars" aria-hidden>
                    {m.participants.slice(0, 4).map((p) => <span key={p} className="avatar sm" style={{ background: colorFor(p) }} title={p}>{initials(p)}</span>)}
                  </span>
                  {m.total_action_items > 0 && (
                    <span className={m.open_action_items ? "pill open" : "pill done"}>{m.open_action_items ? `${m.open_action_items} open` : "All done"}</span>
                  )}
                </Link>
              ))}
            </section>
          ))}
          {items.length < total && <div className="center"><button className="btn" disabled={more} onClick={loadMore}>{more ? "Loading…" : `Load more (${total - items.length} left)`}</button></div>}
        </div>
      )}
    </div>
  );
}
