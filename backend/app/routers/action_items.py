from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from .. import models as m
from .. import schemas as s
from ..database import get_db

router = APIRouter(prefix="/api/action-items", tags=["action-items"])


def _get(db: Session, item_id: int) -> m.ActionItem:
    item = db.get(m.ActionItem, item_id)
    if not item:
        raise HTTPException(404, "Action item not found")
    return item


@router.patch("/{item_id}", response_model=s.ActionItemOut)
def update(item_id: int, body: s.ActionItemUpdate, db: Session = Depends(get_db)):
    item = _get(db, item_id)
    sent = body.model_fields_set  # lets clients clear assignee/due_date with explicit null
    if "text" in sent and body.text is not None:
        t = body.text.strip()
        if not t:
            raise HTTPException(422, "text must not be blank")
        item.text = t
    if "assignee" in sent:
        item.assignee = (body.assignee or "").strip() or None
    if "due_date" in sent:
        item.due_date = body.due_date.isoformat() if body.due_date else None
    if "completed" in sent and body.completed is not None:
        item.completed = body.completed
    db.commit()
    return item


@router.delete("/{item_id}", status_code=204)
def delete(item_id: int, db: Session = Depends(get_db)):
    db.delete(_get(db, item_id))
    db.commit()
    return Response(status_code=204)
