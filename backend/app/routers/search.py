from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models as m
from .. import schemas as s
from ..database import get_db

router = APIRouter(prefix="/api/search", tags=["search"])


def _snippet(text: str, term: str, width: int = 70) -> str:
    i = text.lower().find(term.lower())
    if i < 0:
        return text[:2 * width]
    a, b = max(0, i - width), min(len(text), i + len(term) + width)
    return ("…" if a else "") + text[a:b] + ("…" if b < len(text) else "")


@router.get("", response_model=list[s.SearchHit])
def search(q: str = Query(..., min_length=2, max_length=200), limit: int = Query(30, ge=1, le=100),
           db: Session = Depends(get_db)):
    """Global transcript search (LIKE scan; fine at this scale — see README for FTS5 upgrade path)."""
    term = q.strip()
    if len(term) < 2:
        return []
    rows = db.execute(
        select(m.TranscriptSegment, m.Meeting.title)
        .join(m.Meeting, m.Meeting.id == m.TranscriptSegment.meeting_id)
        .where(m.TranscriptSegment.text.icontains(term, autoescape=True))
        .order_by(m.Meeting.started_at.desc(), m.TranscriptSegment.idx).limit(limit)).all()
    return [s.SearchHit(meeting_id=seg.meeting_id, meeting_title=title, segment_id=seg.id,
                        speaker=seg.speaker, start_ms=seg.start_ms, snippet=_snippet(seg.text, term))
            for seg, title in rows]
