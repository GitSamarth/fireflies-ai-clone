"use client";
import { useState } from "react";
import { api, type MeetingDetail } from "@/lib/api";
import Modal from "./Modal";
import { useToast } from "./Toast";

export default function EditMeetingModal({ meeting, onClose, onSaved }:
  { meeting: MeetingDetail; onClose: () => void; onSaved: (m: MeetingDetail) => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(meeting.title);
  const [people, setPeople] = useState(meeting.participants.join(", "));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const list = people.split(",").map((s) => s.trim()).filter(Boolean);
    if (!title.trim()) return setError("Title is required.");
    if (!list.length) return setError("Add at least one participant.");
    setBusy(true); setError("");
    try { onSaved(await api.updateMeeting(meeting.id, { title: title.trim(), participants: list })); toast("Meeting updated"); onClose(); }
    catch (err) { setError((err as Error).message); setBusy(false); }
  }
  return (
    <Modal title="Edit meeting" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>Title<input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} /></label>
        <label>Participants <small>(comma-separated)</small><input value={people} onChange={(e) => setPeople(e.target.value)} /></label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions"><button type="button" className="btn" onClick={onClose}>Cancel</button><button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
      </form>
    </Modal>
  );
}
