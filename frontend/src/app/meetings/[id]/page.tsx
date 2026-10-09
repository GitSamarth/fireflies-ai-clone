"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ActionItems from "@/components/ActionItems";
import EditMeetingModal from "@/components/EditMeetingModal";
import Modal from "@/components/Modal";
import PlayerBar from "@/components/PlayerBar";
import SummaryPanel from "@/components/SummaryPanel";
import { useToast } from "@/components/Toast";
import TranscriptPanel from "@/components/TranscriptPanel";
import { usePlayer } from "@/hooks/usePlayer";
import { api, ApiError, type MeetingDetail } from "@/lib/api";
import { activeIndex, formatDay, formatDuration, formatTime } from "@/lib/format";

export default function MeetingPage() {
  const { id } = useParams<{ id: string }>();
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let live = true;
    setMeeting(null); setError(null);
    api.getMeeting(id).then((m) => live && setMeeting(m)).catch((e) => live && setError(e));
    return () => { live = false; };
  }, [id]);

  if (error) {
    return (
      <div className="page narrow"><div className="empty">
        <p>{error.status === 404 ? "This meeting doesn't exist (it may have been deleted)." : error.message}</p>
        <Link href="/" className="btn primary">Back to meetings</Link>
      </div></div>
    );
  }
  if (!meeting) return <div className="page"><div className="skeleton" /><div className="skeleton" /></div>;
  return <Detail key={meeting.id} meeting={meeting} setMeeting={setMeeting} />;
}

function Detail({ meeting, setMeeting }: { meeting: MeetingDetail; setMeeting: (m: MeetingDetail) => void }) {
  const router = useRouter();
  const toast = useToast();
  const player = usePlayer(meeting.duration_ms, meeting.media_url);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const starts = useMemo(() => meeting.segments.map((s) => s.start_ms), [meeting.segments]);
  const activeIdx = activeIndex(starts, player.currentMs);

  async function remove() {
    setBusy(true);
    try { await api.deleteMeeting(meeting.id); toast("Meeting deleted"); router.push("/"); }
    catch (e) { toast((e as Error).message, "error"); setBusy(false); }
  }

  return (
    <div className="detail">
      <div className="detail-head">
        <Link href="/" className="icon-btn" aria-label="Back to meetings">←</Link>
        <div className="dh-main">
          <h1>{meeting.title}</h1>
          <span className="muted">{formatDay(meeting.started_at)} · {formatTime(meeting.started_at)} · {formatDuration(meeting.duration_ms)} · {meeting.participants.join(", ")}</span>
        </div>
        <button className="btn" onClick={() => setEditing(true)}>Edit</button>
        <button className="btn danger" onClick={() => setDeleting(true)}>Delete</button>
      </div>
      <div className="detail-cols">
        <section className="col left" aria-label="Summary and notes">
          <SummaryPanel summary={meeting.summary} chapters={meeting.chapters} currentMs={player.currentMs} onSeek={(ms) => player.seek(ms, true)} />
          <ActionItems meetingId={meeting.id} initial={meeting.action_items} />
        </section>
        <section className="col right" aria-label="Transcript">
          <PlayerBar player={player} chapters={meeting.chapters} mediaUrl={meeting.media_url} />
          <TranscriptPanel segments={meeting.segments} activeIdx={activeIdx} onSeek={(ms) => player.seek(ms, true)} />
        </section>
      </div>
      {editing && <EditMeetingModal meeting={meeting} onClose={() => setEditing(false)} onSaved={setMeeting} />}
      {deleting && (
        <Modal title="Delete meeting?" onClose={() => !busy && setDeleting(false)}>
          <p>“{meeting.title}” and its transcript, summary and action items will be permanently deleted.</p>
          <div className="modal-actions"><button className="btn" onClick={() => setDeleting(false)} disabled={busy}>Cancel</button><button className="btn danger solid" onClick={remove} disabled={busy}>{busy ? "Deleting…" : "Delete"}</button></div>
        </Modal>
      )}
    </div>
  );
}
