from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Citizen, EventStateTransition, Evidence, Grievance, GrievanceLog, Notification, Officer
from .dependencies import admin_actor
from .serializers import enum_value, iso, serialize_grievance

router = APIRouter()
ACTIVE_STATUSES = {"Pending", "Under Verification", "In Progress", "Reopened via Citizen Veto"}
VALID_PRIORITIES = {"low", "medium", "high", "critical"}
VALID_STATUSES = ACTIVE_STATUSES | {"Verified Resolved", "Rejected"}


class ComplaintAction(BaseModel):
    status: str | None = None
    remarks: str | None = None
    isVerified: bool | None = None
    resolutionNotes: str | None = None
    validationImageUrl: str | None = None
    priority: str | None = None
    department: str | None = None
    department_id: int | None = None
    note: str | None = None


def get_ticket(db: Session, ticket_id: str) -> Grievance:
    ticket = db.query(Grievance).filter(Grievance.ticket_id == ticket_id).first()
    if ticket is None:
        raise HTTPException(status_code=404, detail="Complaint ticket not found")
    return ticket


def add_log(db: Session, ticket: Grievance, actor: Officer, remarks: str, new_status: str | None = None) -> GrievanceLog:
    previous = enum_value(ticket.status)
    target = new_status or previous
    log = GrievanceLog(
        grievance_id=ticket.id,
        previous_status=previous,
        new_status=target,
        remarks=remarks,
        action_by_officer_id=actor.id,
    )
    db.add(log)
    if ticket.incident:
        db.add(EventStateTransition(
            incident_id=ticket.incident.id,
            from_state=previous,
            to_state=target,
            actor_type="Admin",
            reason=remarks,
        ))
    return log


@router.get("/complaints")
def list_complaints(
    district: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    priority: str | None = None,
    search: str | None = None,
    ticket_id: str | None = None,
    citizen_name: str | None = None,
    db: Session = Depends(get_db),
    _admin: Officer = Depends(admin_actor),
) -> list[dict[str, Any]]:
    query = db.query(Grievance).order_by(Grievance.created_at.desc())
    if district:
        query = query.filter(Grievance.district == district)
    if status_filter:
        query = query.filter(Grievance.status == status_filter)
    if priority:
        query = query.filter(Grievance.priority == priority)
    if ticket_id:
        query = query.filter(Grievance.ticket_id.ilike(f"%{ticket_id}%"))
    if citizen_name:
        query = query.filter(Grievance.citizen_name.ilike(f"%{citizen_name}%"))
    rows = query.all()
    if search:
        needle = search.lower()
        rows = [
            ticket for ticket in rows
            if needle in ticket.ticket_id.lower()
            or needle in (ticket.citizen_name or "").lower()
            or needle in ticket.title.lower()
        ]
    return [serialize_grievance(ticket) for ticket in rows]


@router.get("/grievances")
def list_grievances_alias(
    district: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    priority: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    _admin: Officer = Depends(admin_actor),
) -> list[dict[str, Any]]:
    return list_complaints(district, status_filter, priority, search, None, None, db, _admin)


@router.get("/complaints/{ticket_id}")
def complaint_detail(ticket_id: str, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    ticket = get_ticket(db, ticket_id)
    return {
        **serialize_grievance(ticket),
        "timeline": _timeline_for_ticket(ticket),
        "evidence": _evidence_for_ticket(ticket),
        "community_comments": _comments_for_ticket(ticket),
    }


@router.get("/complaints/{ticket_id}/workspace")
def complaint_workspace(ticket_id: str, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    return complaint_detail(ticket_id, db, _admin)


def _timeline_for_ticket(ticket: Grievance) -> list[dict[str, Any]]:
    rows = [
        {
            "id": log.id,
            "from_state": enum_value(log.previous_status),
            "to_state": enum_value(log.new_status),
            "actor": log.action_by_officer.name if log.action_by_officer else "System",
            "reason": log.remarks,
            "created_at": iso(log.changed_at),
        }
        for log in ticket.logs
    ]
    if ticket.incident:
        rows.extend({
            "id": transition.id,
            "from_state": transition.from_state,
            "to_state": transition.to_state,
            "actor": transition.actor_type,
            "reason": transition.reason,
            "created_at": iso(transition.created_at),
        } for transition in ticket.incident.transitions)
    return sorted(rows, key=lambda item: item["created_at"] or "")


def _evidence_for_ticket(ticket: Grievance) -> list[dict[str, Any]]:
    evidence = ticket.incident.evidence_list if ticket.incident else []
    return [{
        "id": item.id,
        "incident_id": item.incident_id,
        "evidence_type": item.evidence_type,
        "summary": item.summary,
        "description": item.description,
        "uploaded_by": item.uploaded_by,
        "image_url": item.image_url or (item.payload or {}).get("image_url"),
        "verification_status": item.verification_status,
        "created_at": iso(item.created_at),
    } for item in evidence]


def _comments_for_ticket(ticket: Grievance) -> list[dict[str, Any]]:
    if not ticket.incident:
        return []
    return [{
        "id": transition.id,
        "author": transition.actor_type,
        "comment": transition.reason,
        "created_at": iso(transition.created_at),
    } for transition in ticket.incident.transitions if transition.actor_type in {"Community", "Citizen"}]


@router.get("/complaints/{ticket_id}/timeline")
def complaint_timeline(ticket_id: str, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> list[dict[str, Any]]:
    return _timeline_for_ticket(get_ticket(db, ticket_id))


@router.get("/complaints/{ticket_id}/evidence")
def complaint_evidence(ticket_id: str, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> list[dict[str, Any]]:
    return _evidence_for_ticket(get_ticket(db, ticket_id))


@router.get("/complaints/{ticket_id}/comments")
def complaint_comments(ticket_id: str, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> list[dict[str, Any]]:
    return _comments_for_ticket(get_ticket(db, ticket_id))


def update_status(ticket_id: str, target: str, payload: ComplaintAction, db: Session, actor: Officer) -> dict[str, Any]:
    if target not in VALID_STATUSES:
        raise HTTPException(status_code=422, detail="Unsupported complaint status")
    ticket = get_ticket(db, ticket_id)
    previous = enum_value(ticket.status)
    ticket.status = target
    if target == "Verified Resolved":
        ticket.resolved_at = __import__("main").utc_now()
        ticket.resolution_notes = payload.resolutionNotes or payload.remarks or "Resolved by admin."
        ticket.resolution_photo_url = payload.validationImageUrl
    elif target in {"Pending", "Under Verification", "In Progress", "Reopened via Citizen Veto"}:
        ticket.resolved_at = None
    if target == "Reopened via Citizen Veto":
        ticket.reopened_count = int(ticket.reopened_count or 0) + 1
        ticket.sla_due_date = __import__("main").utc_now() + timedelta(hours=24)
    log = add_log(db, ticket, actor, payload.remarks or payload.resolutionNotes or f"Status changed to {target}.", target)
    db.commit()
    db.refresh(ticket)
    return {"ticket_id": ticket.ticket_id, "previous_status": previous, "new_status": target, "log_id": log.id, "complaint": serialize_grievance(ticket)}


@router.patch("/complaints/{ticket_id}/status")
def change_complaint_status(ticket_id: str, payload: ComplaintAction, db: Session = Depends(get_db), actor: Officer = Depends(admin_actor)) -> dict[str, Any]:
    if not payload.status:
        raise HTTPException(status_code=422, detail="status is required")
    if payload.status == "Pending":
        ticket = get_ticket(db, ticket_id)
        payload.status = "Pending"
        return update_status(ticket_id, payload.status, payload, db, actor)
    return update_status(ticket_id, payload.status, payload, db, actor)


@router.post("/complaints/{ticket_id}/verify")
@router.patch("/complaints/{ticket_id}/verification")
@router.post("/grievances/{ticket_id}/verify")
def verify_complaint(ticket_id: str, payload: ComplaintAction = Body(default=ComplaintAction()), db: Session = Depends(get_db), actor: Officer = Depends(admin_actor)) -> dict[str, Any]:
    ticket = get_ticket(db, ticket_id)
    ticket.is_verified = payload.isVerified if payload.isVerified is not None else True
    target = "Under Verification" if ticket.is_verified and enum_value(ticket.status) == "Pending" else enum_value(ticket.status)
    return update_status(ticket_id, target, payload, db, actor) if target != enum_value(ticket.status) else update_verification(ticket, payload, db, actor)


def update_verification(ticket: Grievance, payload: ComplaintAction, db: Session, actor: Officer) -> dict[str, Any]:
    db.add(Notification(
        grievance_id=ticket.id,
        recipient_type="Command Center",
        channel="Email",
        message=payload.remarks or "Complaint verification updated by admin.",
    ))
    add_log(db, ticket, actor, payload.remarks or "Complaint verification updated.")
    db.commit()
    return {"ticket_id": ticket.ticket_id, "is_verified": bool(ticket.is_verified), "complaint": serialize_grievance(ticket)}


@router.post("/complaints/{ticket_id}/reject")
def reject_complaint(ticket_id: str, payload: ComplaintAction = Body(default=ComplaintAction()), db: Session = Depends(get_db), actor: Officer = Depends(admin_actor)) -> dict[str, Any]:
    return update_status(ticket_id, "Rejected", payload, db, actor)


@router.post("/complaints/{ticket_id}/resolve")
@router.post("/grievances/{ticket_id}/resolve")
def resolve_complaint(ticket_id: str, payload: ComplaintAction = Body(default=ComplaintAction()), db: Session = Depends(get_db), actor: Officer = Depends(admin_actor)) -> dict[str, Any]:
    return update_status(ticket_id, "Verified Resolved", payload, db, actor)


@router.post("/complaints/{ticket_id}/reopen")
def reopen_complaint(ticket_id: str, payload: ComplaintAction = Body(default=ComplaintAction()), db: Session = Depends(get_db), actor: Officer = Depends(admin_actor)) -> dict[str, Any]:
    return update_status(ticket_id, "Reopened via Citizen Veto", payload, db, actor)


@router.post("/complaints/{ticket_id}/duplicate")
@router.post("/complaints/{ticket_id}/fake")
def mark_complaint_invalid(ticket_id: str, payload: ComplaintAction = Body(default=ComplaintAction()), db: Session = Depends(get_db), actor: Officer = Depends(admin_actor)) -> dict[str, Any]:
    return update_status(ticket_id, "Rejected", payload, db, actor)


@router.patch("/complaints/{ticket_id}/priority")
def update_priority(ticket_id: str, payload: ComplaintAction, db: Session = Depends(get_db), actor: Officer = Depends(admin_actor)) -> dict[str, Any]:
    if payload.priority not in VALID_PRIORITIES:
        raise HTTPException(status_code=422, detail="Unsupported priority")
    ticket = get_ticket(db, ticket_id)
    ticket.priority = payload.priority
    add_log(db, ticket, actor, payload.remarks or f"Priority set to {payload.priority}.")
    db.commit()
    return serialize_grievance(ticket)


@router.patch("/complaints/{ticket_id}/department")
def update_department(ticket_id: str, payload: ComplaintAction, db: Session = Depends(get_db), actor: Officer = Depends(admin_actor)) -> dict[str, Any]:
    ticket = get_ticket(db, ticket_id)
    department = None
    if payload.department_id:
        department = db.query(__import__("models").Department).filter_by(id=payload.department_id).first()
    elif payload.department:
        department = db.query(__import__("models").Department).filter_by(name=payload.department).first()
    if department is None:
        raise HTTPException(status_code=404, detail="Department not found")
    ticket.department_id = department.id
    add_log(db, ticket, actor, payload.remarks or f"Department assigned to {department.name}.")
    db.commit()
    return serialize_grievance(ticket)


@router.post("/complaints/{ticket_id}/notes")
@router.post("/complaints/{ticket_id}/admin-note")
def add_admin_note(ticket_id: str, payload: ComplaintAction, db: Session = Depends(get_db), actor: Officer = Depends(admin_actor)) -> dict[str, Any]:
    note = payload.note or payload.remarks
    if not note:
        raise HTTPException(status_code=422, detail="note is required")
    ticket = get_ticket(db, ticket_id)
    log = add_log(db, ticket, actor, note)
    db.commit()
    return {"id": log.id, "ticket_id": ticket.ticket_id, "note": note, "created_at": iso(log.changed_at)}


@router.delete("/complaints/{ticket_id}")
def delete_complaint(ticket_id: str, db: Session = Depends(get_db), actor: Officer = Depends(admin_actor)) -> dict[str, str]:
    ticket = get_ticket(db, ticket_id)
    db.query(GrievanceLog).filter(GrievanceLog.grievance_id == ticket.id).delete(synchronize_session=False)
    db.query(Notification).filter(Notification.grievance_id == ticket.id).delete(synchronize_session=False)
    db.query(__import__("models").CitizenVeto).filter_by(grievance_id=ticket.id).delete(synchronize_session=False)
    db.delete(ticket)
    db.commit()
    return {"ticket_id": ticket_id, "status": "deleted"}
