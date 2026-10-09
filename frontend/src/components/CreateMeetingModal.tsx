"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import Modal from "./Modal";
import { useToast } from "./Toast";

const MAX_BYTES = 1_000_000;
const EXT = [".txt", ".vtt", ".json"];
const PLACEHOLDER = "[00:00] Sarah: Welcome everyone.\n[00:08] Marcus: Thanks. I'll share the Q3 numbers.\n\nAlso accepted: WebVTT, JSON, or plain \"Name: text\" lines (timing is estimated when absent).";

export default function CreateMeetingModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"paste" | "file">("paste");
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [people, setPeople] = useState("");
  const [text, setText] = useState("");
  const [filename, setFilename] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(f: File | undefined) {
    setError("");
    if (!f) return;
    if (!EXT.some((e) => f.name.toLowerCase().endsWith(e))) return setError("Use a .txt, .vtt or .json file.");
    if (f.size > MAX_BYTES) return setError("File is larger than 1 MB.");
    setText(await f.text());
    setFilename(f.name);
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!title.trim()) return setError("Title is required.");
    if (!text.trim()) return setError(mode === "file" ? "Choose a transcript file." : "Paste a transcript.");
    setBusy(true); setError("");
    try {
      const m = await api.createMeeting({
        title: title.trim(), transcript: text, filename: mode === "file" ? filename : undefined,
        // datetime-local has no zone: interpret as local time, send as UTC.
        started_at: when ? new Date(when).toISOString().slice(0, 19) : undefined,
        participants: people.split(",").map((s) => s.trim()).filter(Boolean),
      });
      toast("Meeting created");
      onClose();
      router.push(`/meetings/${m.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Add a meeting" onClose={onClose} width={560}>
      <form onSubmit={submit} className="form">
        <div className="tabs">
          <button type="button" className={mode === "paste" ? "on" : ""} onClick={() => { setMode("paste"); setFilename(undefined); }}>Paste transcript</button>
          <button type="button" className={mode === "file" ? "on" : ""} onClick={() => setMode("file")}>Upload file</button>
        </div>
        <label>Title<input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly product sync" /></label>
        <div className="row2">
          <label>Date &amp; time <small>(optional)</small><input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
          <label>Participants <small>(comma-separated, optional)</small><input value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Defaults to speakers" /></label>
        </div>
        {mode === "paste" ? (
          <label>Transcript<textarea rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder={PLACEHOLDER} /></label>
        ) : (
          <label>Transcript file<input type="file" accept=".txt,.vtt,.json" onChange={(e) => onFile(e.target.files?.[0])} />
            {filename && <small>{filename} — {text.length.toLocaleString()} characters loaded</small>}</label>
        )}
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? "Creating…" : "Create meeting"}</button>
        </div>
      </form>
    </Modal>
  );
}
