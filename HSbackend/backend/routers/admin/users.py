from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Citizen, Evidence, Grievance, Incident, Officer
from .dependencies import admin_actor
from .serializers import iso, serialize_grievance

router = APIRouter()


def find_user(db: Session, user_id: int, user_type: str = "citizen") -> Citizen | Officer:
    model = Officer if user_type.lower() == "officer" else Citizen
    user = db.query(model).filter(model.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def user_row(user: Citizen | Officer, user_type: str) -> dict[str, Any]:
    if isinstance(user, Citizen):
        tickets = user.grievances or []
        comments = sum(
            sum(item.actor_type in {"Community", "Citizen"} for item in (ticket.incident.transitions or []))
            for ticket in tickets if ticket.incident
        )
        evidence = sum(len(ticket.incident.evidence_list or []) for ticket in tickets if ticket.incident)
        return {
            "id": user.id,
            "type": "citizen",
            "name": user.name,
            "email": None,
            "phone": user.phone,
            "role": "citizen",
            "is_active": True,
            "last_active": None,
            "trust_score": None,
            "warning_count": 0,
            "report_count": len(user.grievances),
            "comment_count": comments,
            "evidence_count": evidence,
        }
    return {
        "id": user.id,
        "type": "officer",
        "name": user.name,
        "email": user.email,
        "phone": None,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "is_active": bool(user.is_active),
        "last_active": None,
        "trust_score": None,
        "warning_count": None,
        "report_count": len(user.assigned_grievances),
        "comment_count": 0,
        "evidence_count": sum(len(ticket.incident.evidence_list or []) for ticket in user.assigned_grievances if ticket.incident),
        "department": user.department.name if user.department else None,
    }


@router.get("/users")
def list_users(
    user_type: str = "citizen",
    search: str | None = None,
    db: Session = Depends(get_db),
    _admin: Officer = Depends(admin_actor),
) -> list[dict[str, Any]]:
    model = Officer if user_type.lower() == "officer" else Citizen
    users = db.query(model).order_by(model.id.asc()).all()
    rows = [user_row(user, user_type) for user in users]
    if search:
        needle = search.lower()
        rows = [row for row in rows if needle in (row.get("name") or "").lower() or needle in (row.get("email") or "").lower()]
    return rows


@router.get("/users/{user_id}")
def user_profile(user_id: int, user_type: str = "citizen", db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    return user_row(find_user(db, user_id, user_type), user_type)


@router.get("/users/{user_id}/reports")
def user_reports(user_id: int, user_type: str = "citizen", db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> list[dict[str, Any]]:
    user = find_user(db, user_id, user_type)
    tickets = user.grievances if isinstance(user, Citizen) else user.assigned_grievances
    return [serialize_grievance(ticket) for ticket in tickets]


@router.get("/users/{user_id}/comments")
def user_comments(user_id: int, user_type: str = "citizen", db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> list[dict[str, Any]]:
    user = find_user(db, user_id, user_type)
    tickets = user.grievances if isinstance(user, Citizen) else user.assigned_grievances
    rows = []
    for ticket in tickets:
        if ticket.incident:
            rows.extend({
                "id": transition.id,
                "ticket_id": ticket.ticket_id,
                "comment": transition.reason,
                "created_at": iso(transition.created_at),
            } for transition in ticket.incident.transitions if transition.actor_type in {"Community", "Citizen"})
    return rows


@router.get("/users/{user_id}/evidence")
def user_evidence(user_id: int, user_type: str = "citizen", db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> list[dict[str, Any]]:
    user = find_user(db, user_id, user_type)
    tickets = user.grievances if isinstance(user, Citizen) else user.assigned_grievances
    rows = []
    for ticket in tickets:
        if ticket.incident:
            rows.extend({
                "id": item.id,
                "ticket_id": ticket.ticket_id,
                "image_url": item.image_url or (item.payload or {}).get("image_url"),
                "uploaded_by": item.uploaded_by,
                "verification_status": item.verification_status,
                "created_at": iso(item.created_at),
            } for item in ticket.incident.evidence_list)
    return rows


@router.post("/users/{user_id}/suspend")
def suspend_user(user_id: int, user_type: str = "citizen", db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    user = find_user(db, user_id, user_type)
    if isinstance(user, Citizen):
        raise HTTPException(status_code=409, detail="Citizen suspension is not persistable in the existing schema.")
    user.is_active = False
    db.commit()
    return user_row(user, user_type)


@router.post("/users/{user_id}/activate")
def activate_user(user_id: int, user_type: str = "citizen", db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    user = find_user(db, user_id, user_type)
    if isinstance(user, Citizen):
        raise HTTPException(status_code=409, detail="Citizen activation is not persistable in the existing schema.")
    user.is_active = True
    db.commit()
    return user_row(user, user_type)


@router.delete("/users/{user_id}")
def delete_user(user_id: int, user_type: str = "citizen", db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    user = find_user(db, user_id, user_type)
    if isinstance(user, Citizen):
        raise HTTPException(status_code=409, detail="Citizen deletion is not persistable without changing the existing schema; history was preserved.")
    user.is_active = False
    db.commit()
    return {"id": user.id, "status": "deactivated", "history_preserved": True}
