from datetime import datetime, timezone

from sqlalchemy.orm import Session

from . import models as m
from .parsing import parse_transcript
from .schemas import MeetingCreate, MeetingDetail, MeetingListItem
from .summarizer import summarize


def create_meeting(db: Session, body: MeetingCreate) -> m.Meeting:
    segs = parse_transcript(body.transcript, body.filename)  # ValueError -> 422 in router
    duration = max(s["end_ms"] for s in segs)
    names = body.participants or list(dict.fromkeys(s["speaker"] for s in segs))
    meeting = m.Meeting(title=body.title, started_at=body.started_at or datetime.now(timezone.utc).replace(tzinfo=None).replace(microsecond=0),
                        duration_ms=duration)
    meeting.participants = [m.Participant(name=n) for n in names]
    meeting.segments = [m.TranscriptSegment(idx=i, **s) for i, s in enumerate(segs)]
    gen = summarize(segs, duration)
    meeting.summary = m.Summary(overview=gen["overview"], keywords=gen["keywords"],
                                notes=gen["notes"], source="heuristic")
    meeting.chapters = [m.Chapter(**c) for c in gen["chapters"]]
    meeting.action_items = [m.ActionItem(**a) for a in gen["action_items"]]
    db.add(meeting)
    db.commit()
    return meeting


def to_list_item(mt: m.Meeting) -> MeetingListItem:
    open_n = sum(1 for a in mt.action_items if not a.completed)
    overview = mt.summary.overview if mt.summary else ""
    return MeetingListItem(
        id=mt.id, title=mt.title, started_at=mt.started_at, duration_ms=mt.duration_ms,
        participants=[p.name for p in mt.participants], open_action_items=open_n,
        total_action_items=len(mt.action_items), overview_preview=overview[:160])


def to_detail(mt: m.Meeting) -> MeetingDetail:
    return MeetingDetail(
        id=mt.id, title=mt.title, started_at=mt.started_at, duration_ms=mt.duration_ms,
        media_url=mt.media_url, participants=[p.name for p in mt.participants],
        segments=mt.segments, summary=mt.summary, chapters=mt.chapters, action_items=mt.action_items)
