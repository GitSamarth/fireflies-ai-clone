from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


def _clean_names(v: list[str] | None) -> list[str] | None:
    if v is None:
        return None
    seen, out = set(), []
    for name in v:
        n = " ".join(name.split())
        if n and n.lower() not in seen:
            seen.add(n.lower())
            out.append(n[:120])
    return out


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class SegmentOut(ORM):
    id: int
    idx: int
    speaker: str
    start_ms: int
    end_ms: int
    text: str


class SummaryOut(ORM):
    overview: str
    keywords: list[str]
    notes: list[str]
    source: str


class ChapterOut(ORM):
    id: int
    start_ms: int
    title: str


class ActionItemOut(ORM):
    id: int
    meeting_id: int
    text: str
    assignee: str | None
    due_date: str | None
    completed: bool


class MeetingListItem(BaseModel):
    id: int
    title: str
    started_at: datetime
    duration_ms: int
    participants: list[str]
    open_action_items: int
    total_action_items: int
    overview_preview: str


class MeetingList(BaseModel):
    items: list[MeetingListItem]
    total: int


class MeetingDetail(BaseModel):
    id: int
    title: str
    started_at: datetime
    duration_ms: int
    media_url: str | None
    participants: list[str]
    segments: list[SegmentOut]
    summary: SummaryOut | None
    chapters: list[ChapterOut]
    action_items: list[ActionItemOut]


class MeetingCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    started_at: datetime | None = None
    participants: list[str] | None = None
    transcript: str = Field(min_length=1, max_length=1_000_000)
    filename: str | None = Field(default=None, max_length=255)  # format hint only

    @field_validator("title")
    @classmethod
    def _title(cls, v):
        v = " ".join(v.split())
        if not v:
            raise ValueError("title must not be blank")
        return v

    @field_validator("participants")
    @classmethod
    def _p(cls, v):
        return _clean_names(v)


class MeetingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    participants: list[str] | None = None

    @field_validator("title")
    @classmethod
    def _title(cls, v):
        if v is None:
            return v
        v = " ".join(v.split())
        if not v:
            raise ValueError("title must not be blank")
        return v

    @field_validator("participants")
    @classmethod
    def _p(cls, v):
        return _clean_names(v)


class ActionItemCreate(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    assignee: str | None = Field(default=None, max_length=120)
    due_date: date | None = None


class ActionItemUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1, max_length=1000)
    assignee: str | None = Field(default=None, max_length=120)
    due_date: date | None = None
    completed: bool | None = None


class SearchHit(BaseModel):
    meeting_id: int
    meeting_title: str
    segment_id: int
    speaker: str
    start_ms: int
    snippet: str
