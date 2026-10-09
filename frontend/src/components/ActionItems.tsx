"use client";
import { useState } from "react";
import { api, type ActionItem } from "@/lib/api";
import { useToast } from "./Toast";

const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function ActionItems({ meetingId, initial }: { meetingId: number; initial: ActionItem[] }) {
  const toast = useToast();
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState({ text: "", assignee: "", due: "" });
  const [adding, setAdding] = useState({ text: "", assignee: "", due: "" });
  const [busy, setBusy] = useState(false);
  const replace = (it: ActionItem) => setItems((xs) => xs.map((x) => (x.id === it.id ? it : x)));

  async function toggle(it: ActionItem) {
    replace({ ...it, completed: !it.completed }); // optimistic
    try { replace(await api.updateActionItem(it.id, { completed: !it.completed })); }
    catch (e) { replace(it); toast((e as Error).message, "error"); }
  }
  async function saveEdit(it: ActionItem) {
    if (!draft.text.trim()) return toast("Action item text can't be empty", "error");
    try {
      replace(await api.updateActionItem(it.id, { text: draft.text, assignee: draft.assignee.trim() || null, due_date: draft.due || null }));
      setEditing(null); toast("Action item updated");
    } catch (e) { toast((e as Error).message, "error"); }
  }
  async function remove(it: ActionItem) {
    const before = items;
    setItems((xs) => xs.filter((x) => x.id !== it.id));
    try { await api.deleteActionItem(it.id); toast("Action item deleted"); }
    catch (e) { setItems(before); toast((e as Error).message, "error"); }
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!adding.text.trim() || busy) return;
    setBusy(true);
    try {
      const it = await api.addActionItem(meetingId, { text: adding.text, assignee: adding.assignee.trim() || null, due_date: adding.due || null });
      setItems((xs) => [...xs, it]); setAdding({ text: "", assignee: "", due: "" }); toast("Action item added");
    } catch (err) { toast((err as Error).message, "error"); }
    setBusy(false);
  }

  const open = items.filter((i) => !i.completed).length;
  return (
    <div className="actions">
      <h3>Action items <span className="muted">{items.length ? `${open} open · ${items.length - open} done` : ""}</span></h3>
      {!items.length && <p className="muted">No action items yet.</p>}
      <ul>
        {items.map((it) => (
          <li key={it.id} className={it.completed ? "done" : ""}>
            {editing === it.id ? (
              <div className="ai-edit">
                <input aria-label="Action item text" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} autoFocus />
                <input aria-label="Assignee" placeholder="Assignee" value={draft.assignee} onChange={(e) => setDraft({ ...draft, assignee: e.target.value })} />
                <input aria-label="Due date" type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
                <button className="btn sm primary" onClick={() => saveEdit(it)}>Save</button>
                <button className="btn sm" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            ) : (
              <>
                <input type="checkbox" checked={it.completed} onChange={() => toggle(it)} aria-label={`Mark “${it.text}” ${it.completed ? "not done" : "done"}`} />
                <div className="ai-body">
                  <span className="ai-text">{it.text}</span>
                  <span className="ai-meta">
                    {it.assignee && <b>{it.assignee}</b>}
                    {it.due_date && <span className={!it.completed && it.due_date < todayISO() ? "overdue" : ""}>Due {it.due_date}{!it.completed && it.due_date < todayISO() ? " · overdue" : ""}</span>}
                  </span>
                </div>
                <button className="icon-btn" aria-label="Edit action item" onClick={() => { setEditing(it.id); setDraft({ text: it.text, assignee: it.assignee ?? "", due: it.due_date ?? "" }); }}>✎</button>
                <button className="icon-btn" aria-label="Delete action item" onClick={() => remove(it)}>🗑</button>
              </>
            )}
          </li>
        ))}
      </ul>
      <form className="ai-add" onSubmit={add}>
        <input aria-label="New action item" placeholder="Add an action item…" value={adding.text} onChange={(e) => setAdding({ ...adding, text: e.target.value })} />
        <input aria-label="New item assignee" placeholder="Assignee" value={adding.assignee} onChange={(e) => setAdding({ ...adding, assignee: e.target.value })} />
        <input aria-label="New item due date" type="date" value={adding.due} onChange={(e) => setAdding({ ...adding, due: e.target.value })} />
        <button className="btn primary sm" disabled={busy || !adding.text.trim()}>Add</button>
      </form>
    </div>
  );
}
