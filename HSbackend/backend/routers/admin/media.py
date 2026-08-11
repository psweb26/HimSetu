from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Evidence, Incident, Officer
from .dependencies import admin_actor
from .serializers import iso

router = APIRouter()


def media_row(item: Evidence) -> dict[str, Any]:
    return {
        "id": item.id,
        "incident_id": item.incident_id,
        "evidence_type": item.evidence_type,
        "image_url": item.image_url or (item.payload or {}).get("image_url"),
        "description": item.description,
        "uploaded_by": item.uploaded_by,
        "verification_status": item.verification_status,
        "created_at": iso(item.created_at),
    }


@router.get("/media")
@router.get("/uploads")
def list_media(status_filter: str | None = None, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> list[dict[str, Any]]:
    query = db.query(Evidence).filter(Evidence.image_url.isnot(None))
    if status_filter:
        query = query.filter(Evidence.verification_status == status_filter)
    return [media_row(item) for item in query.order_by(Evidence.created_at.desc()).all()]


@router.get("/media/{media_id}")
def get_media(media_id: int, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    item = db.query(Evidence).filter(Evidence.id == media_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Uploaded image not found")
    return media_row(item)


@router.post("/media/{media_id}/review")
def review_media(media_id: int, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    item = db.query(Evidence).filter(Evidence.id == media_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Uploaded image not found")
    item.verification_status = "Under Review"
    db.commit()
    return media_row(item)


@router.post("/media/{media_id}/approve")
def approve_media(media_id: int, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    item = db.query(Evidence).filter(Evidence.id == media_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Uploaded image not found")
    item.verification_status = "Verified"
    db.commit()
    return media_row(item)


@router.post("/media/{media_id}/reject")
def reject_media(media_id: int, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    item = db.query(Evidence).filter(Evidence.id == media_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Uploaded image not found")
    item.verification_status = "Rejected"
    db.commit()
    return media_row(item)


@router.delete("/media/{media_id}")
def delete_media(media_id: int, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    item = db.query(Evidence).filter(Evidence.id == media_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Uploaded image not found")
    db.delete(item)
    db.commit()
    return {"id": media_id, "status": "deleted"}
