from datetime import datetime, timezone

from sqlalchemy import (JSON, Boolean, DateTime, ForeignKey, Index, Integer,
                        String, Text, UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Meeting(Base):
    __tablename__ = "meetings"
    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    started_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    media_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    participants: Mapped[list["Participant"]] = relationship(
        cascade="all, delete-orphan", order_by="Participant.id")
    segments: Mapped[list["TranscriptSegment"]] = relationship(
        cascade="all, delete-orphan", order_by="TranscriptSegment.idx")
    summary: Mapped["Summary | None"] = relationship(
        cascade="all, delete-orphan", uselist=False)
    chapters: Mapped[list["Chapter"]] = relationship(
        cascade="all, delete-orphan", order_by="Chapter.start_ms")
    action_items: Mapped[list["ActionItem"]] = relationship(
        cascade="all, delete-orphan", order_by="ActionItem.id")


class Participant(Base):
    __tablename__ = "participants"
    __table_args__ = (UniqueConstraint("meeting_id", "name"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120))


class TranscriptSegment(Base):
    """One speaker turn. Times are integer ms so seek/sync comparisons are exact."""
    __tablename__ = "transcript_segments"
    __table_args__ = (Index("ix_seg_meeting_start", "meeting_id", "start_ms"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"))
    idx: Mapped[int] = mapped_column(Integer)
    speaker: Mapped[str] = mapped_column(String(120))
    start_ms: Mapped[int] = mapped_column(Integer)
    end_ms: Mapped[int] = mapped_column(Integer)
    text: Mapped[str] = mapped_column(Text)


class Summary(Base):
    __tablename__ = "summaries"
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True)
    overview: Mapped[str] = mapped_column(Text, default="")
    keywords: Mapped[list] = mapped_column(JSON, default=list)
    notes: Mapped[list] = mapped_column(JSON, default=list)  # bullet-point notes
    source: Mapped[str] = mapped_column(String(20), default="seed")  # seed | heuristic


class Chapter(Base):
    __tablename__ = "chapters"
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    start_ms: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(200))


class ActionItem(Base):
    __tablename__ = "action_items"
    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    assignee: Mapped[str | None] = mapped_column(String(120), nullable=True)
    due_date: Mapped[str | None] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
