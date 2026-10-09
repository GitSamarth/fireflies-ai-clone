export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0"), ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatDuration(ms: number): string {
  if (ms < 60000) return `${Math.max(1, Math.round(ms / 1000))} sec`;
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} hr ${mins % 60} min`;
}

// Backend sends naive UTC timestamps; display in the viewer's locale.
export function parseServerDate(iso: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + "Z");
}
export const formatDay = (iso: string) =>
  parseServerDate(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
export const formatTime = (iso: string) =>
  parseServerDate(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

const PALETTE = ["#6A39EF", "#0E9F6E", "#D97706", "#DB2777", "#0284C7", "#7C3AED", "#DC2626", "#0D9488"];
export function colorFor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Index of the last segment whose start <= t (binary search); -1 if none. */
export function activeIndex(starts: number[], t: number): number {
  let lo = 0, hi = starts.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (starts[mid] <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}
