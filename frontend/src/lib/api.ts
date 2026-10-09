export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface Segment { id: number; idx: number; speaker: string; start_ms: number; end_ms: number; text: string }
export interface Chapter { id: number; start_ms: number; title: string }
export interface ActionItem { id: number; meeting_id: number; text: string; assignee: string | null; due_date: string | null; completed: boolean }
export interface Summary { overview: string; keywords: string[]; notes: string[]; source: string }
export interface MeetingListItem {
  id: number; title: string; started_at: string; duration_ms: number; participants: string[];
  open_action_items: number; total_action_items: number; overview_preview: string;
}
export interface MeetingDetail {
  id: number; title: string; started_at: string; duration_ms: number; media_url: string | null;
  participants: string[]; segments: Segment[]; summary: Summary | null; chapters: Chapter[]; action_items: ActionItem[];
}
export interface SearchHit { meeting_id: number; meeting_title: string; segment_id: number; speaker: string; start_ms: number; snippet: string }

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function errorMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    const d = detail[0] as { loc?: unknown[]; msg?: string };
    return `${d.loc?.slice(-1)[0] ?? "field"}: ${d.msg ?? "invalid"}`;
  }
  return `Request failed (${status})`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "Cannot reach the server. Is the backend running?");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, errorMessage(body, res.status));
  return body as T;
}

const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) });

export interface ListParams { q?: string; participant?: string; date_from?: string; date_to?: string; sort?: "recent" | "oldest"; limit?: number; offset?: number }

export const api = {
  listMeetings(p: ListParams, signal?: AbortSignal) {
    const qs = new URLSearchParams();
    Object.entries(p).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
    return request<{ items: MeetingListItem[]; total: number }>(`/api/meetings?${qs}`, { signal });
  },
  participants: () => request<string[]>("/api/meetings/participants"),
  getMeeting: (id: number | string) => request<MeetingDetail>(`/api/meetings/${id}`),
  createMeeting: (d: { title: string; transcript: string; filename?: string; started_at?: string; participants?: string[] }) =>
    request<MeetingDetail>("/api/meetings", json("POST", d)),
  updateMeeting: (id: number, d: { title?: string; participants?: string[] }) =>
    request<MeetingDetail>(`/api/meetings/${id}`, json("PATCH", d)),
  deleteMeeting: (id: number) => request<void>(`/api/meetings/${id}`, { method: "DELETE" }),
  addActionItem: (mid: number, d: { text: string; assignee?: string | null; due_date?: string | null }) =>
    request<ActionItem>(`/api/meetings/${mid}/action-items`, json("POST", d)),
  updateActionItem: (id: number, d: Partial<Pick<ActionItem, "text" | "assignee" | "due_date" | "completed">>) =>
    request<ActionItem>(`/api/action-items/${id}`, json("PATCH", d)),
  deleteActionItem: (id: number) => request<void>(`/api/action-items/${id}`, { method: "DELETE" }),
  search: (q: string, signal?: AbortSignal) => request<SearchHit[]>(`/api/search?q=${encodeURIComponent(q)}`, { signal }),
};
