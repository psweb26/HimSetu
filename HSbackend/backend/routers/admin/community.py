from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import EventStateTransition, Grievance, Incident, Officer
from .dependencies import admin_actor
from .serializers import incident_moderation_flags, iso, serialize_incident

router = APIRouter()


def incident_for(db: Session, incident_id: int) -> Incident:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=404, detail="Community incident not found")
    return incident


@router.get("/community")
@router.get("/community/incidents")
def community_incidents(db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> list[dict[str, Any]]:
    rows = []
    incidents = db.query(Incident).order_by(Incident.created_at.desc()).all()
    incidents.sort(key=lambda item: incident_moderation_flags(item)[1], reverse=True)
    for incident in incidents:
        if incident_moderation_flags(incident)[0]:
            continue
        ticket = db.query(Grievance).filter(Grievance.incident_id == incident.id).order_by(Grievance.id.asc()).first()
        rows.append(serialize_incident(incident, ticket))
    return rows


@router.get("/community/{incident_id}")
def community_detail(incident_id: int, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    incident = incident_for(db, incident_id)
    ticket = db.query(Grievance).filter(Grievance.incident_id == incident.id).order_by(Grievance.id.asc()).first()
    return {
        **serialize_incident(incident, ticket),
        "comments": [{
            "id": item.id,
            "author": item.actor_type,
            "comment": item.reason,
            "created_at": iso(item.created_at),
        } for item in incident.transitions if item.actor_type in {"Community", "Citizen"}],
        "evidence": [{
            "id": item.id,
            "image_url": item.image_url or (item.payload or {}).get("image_url"),
            "description": item.description,
            "verification_status": item.verification_status,
            "created_at": iso(item.created_at),
        } for item in incident.evidence_list],
    }


@router.get("/community/{incident_id}/comments")
def community_comments(incident_id: int, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> list[dict[str, Any]]:
    return community_detail(incident_id, db, _admin)["comments"]


@router.get("/community/{incident_id}/evidence")
def community_evidence(incident_id: int, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> list[dict[str, Any]]:
    return community_detail(incident_id, db, _admin)["evidence"]


@router.get("/community/{incident_id}/support-count")
def community_support_count(incident_id: int, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, int]:
    incident = incident_for(db, incident_id)
    ticket = db.query(Grievance).filter(Grievance.incident_id == incident.id).first()
    return {"incident_id": incident_id, "support_count": int(ticket.upvotes or 0) if ticket else 0}


@router.post("/community/{incident_id}/pin")
def pin_incident(incident_id: int, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    incident = incident_for(db, incident_id)
    db.add(EventStateTransition(
        incident_id=incident.id,
        from_state=incident.current_state,
        to_state=incident.current_state,
        actor_type="Admin",
        reason="Admin moderation: Pinned incident.",
    ))
    db.commit()
    return {"incident_id": incident_id, "is_pinned": True}


@router.post("/community/{incident_id}/hide")
def hide_incident(incident_id: int, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    incident = incident_for(db, incident_id)
    db.add(EventStateTransition(
        incident_id=incident.id,
        from_state=incident.current_state,
        to_state=incident.current_state,
        actor_type="Admin",
        reason="Admin moderation: Hidden incident.",
    ))
    db.commit()
    return {"incident_id": incident_id, "is_hidden": True}


@router.delete("/community/{incident_id}")
def delete_incident(incident_id: int, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    incident = incident_for(db, incident_id)
    db.add(EventStateTransition(
        incident_id=incident.id,
        from_state=incident.current_state,
        to_state=incident.current_state,
        actor_type="Admin",
        reason="Admin moderation: Hidden incident (delete requested).",
    ))
    db.commit()
    return {"incident_id": incident_id, "status": "deleted"}
