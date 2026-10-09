from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import exists, func, or_, select
from sqlalchemy.orm import Session, selectinload

from .. import models as m
from .. import schemas as s
from ..database import get_db
from ..services import create_meeting, to_detail, to_list_item

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def _get(db: Session, meeting_id: int) -> m.Meeting:
    mt = db.get(m.Meeting, meeting_id)
    if not mt:
        raise HTTPException(404, "Meeting not found")
    return mt


@router.get("", response_model=s.MeetingList)
def list_meetings(
    q: str | None = Query(None, max_length=200, description="matches title or participant"),
    participant: str | None = Query(None, max_length=120),
    date_from: date | None = None,
    date_to: date | None = None,
    sort: Literal["recent", "oldest"] = "recent",
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    conds = []
    if q and q.strip():
        term = q.strip()
        conds.append(or_(
            m.Meeting.title.icontains(term, autoescape=True),
            exists().where(m.Participant.meeting_id == m.Meeting.id,
                           m.Participant.name.icontains(term, autoescape=True))))
    if participant and participant.strip():
        conds.append(exists().where(m.Participant.meeting_id == m.Meeting.id,
                                    func.lower(m.Participant.name) == participant.strip().lower()))
    if date_from:
        conds.append(m.Meeting.started_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        conds.append(m.Meeting.started_at < datetime.combine(date_to + timedelta(days=1), datetime.min.time()))
    if date_from and date_to and date_from > date_to:
        raise HTTPException(422, "date_from must be on or before date_to")

    order = (m.Meeting.started_at.desc(), m.Meeting.id.desc()) if sort == "recent" \
        else (m.Meeting.started_at.asc(), m.Meeting.id.asc())
    total = db.scalar(select(func.count()).select_from(m.Meeting).where(*conds)) or 0
    rows = db.scalars(
        select(m.Meeting).where(*conds).order_by(*order).limit(limit).offset(offset)
        .options(selectinload(m.Meeting.participants), selectinload(m.Meeting.action_items),
                 selectinload(m.Meeting.summary))).all()
    return s.MeetingList(items=[to_list_item(r) for r in rows], total=total)


@router.get("/participants", response_model=list[str])
def all_participants(db: Session = Depends(get_db)):
    """Distinct names for the filter dropdown."""
    return db.scalars(select(m.Participant.name).distinct().order_by(func.lower(m.Participant.name))).all()


@router.post("", response_model=s.MeetingDetail, status_code=201)
def create(body: s.MeetingCreate, db: Session = Depends(get_db)):
    try:
        mt = create_meeting(db, body)
    except ValueError as e:
        raise HTTPException(422, str(e))
    return to_detail(mt)


@router.get("/{meeting_id}", response_model=s.MeetingDetail)
def detail(meeting_id: int, db: Session = Depends(get_db)):
    return to_detail(_get(db, meeting_id))


@router.patch("/{meeting_id}", response_model=s.MeetingDetail)
def update(meeting_id: int, body: s.MeetingUpdate, db: Session = Depends(get_db)):
    mt = _get(db, meeting_id)
    if body.title is not None:
        mt.title = body.title
    if body.participants is not None:
        if not body.participants:
            raise HTTPException(422, "A meeting needs at least one participant")
        # Delete first: the unique(meeting_id, name) constraint would otherwise fire when a
        # name is kept, because SQLAlchemy flushes INSERTs before DELETEs.
        mt.participants.clear()
        db.flush()
        mt.participants = [m.Participant(name=n) for n in body.participants]
    db.commit()
    return to_detail(mt)


@router.delete("/{meeting_id}", status_code=204)
def delete(meeting_id: int, db: Session = Depends(get_db)):
    db.delete(_get(db, meeting_id))
    db.commit()
    return Response(status_code=204)


# ---- action items scoped to a meeting -------------------------------------
@router.post("/{meeting_id}/action-items", response_model=s.ActionItemOut, status_code=201)
def add_action_item(meeting_id: int, body: s.ActionItemCreate, db: Session = Depends(get_db)):
    _get(db, meeting_id)
    text = body.text.strip()
    if not text:
        raise HTTPException(422, "text must not be blank")
    item = m.ActionItem(meeting_id=meeting_id, text=text,
                        assignee=(body.assignee or "").strip() or None,
                        due_date=body.due_date.isoformat() if body.due_date else None)
    db.add(item)
    db.commit()
    return item
