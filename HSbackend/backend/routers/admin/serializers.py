from typing import Any

from models import CulturalAsset, Grievance, Incident


def enum_value(value: Any) -> str:
    return value.value if hasattr(value, "value") else str(value)


def iso(value: Any) -> str | None:
    return value.isoformat() if value else None


def incident_moderation_flags(incident: Incident) -> tuple[bool, bool]:
    flags = {
        "hidden": False,
        "pinned": False,
    }
    for transition in incident.transitions or []:
        if transition.actor_type != "Admin" or not transition.reason:
            continue
        reason = transition.reason.lower()
        flags["hidden"] = flags["hidden"] or "moderation: hidden" in reason
        flags["pinned"] = flags["pinned"] or "moderation: pinned" in reason
    return flags["hidden"], flags["pinned"]


def serialize_grievance(ticket: Grievance) -> dict[str, Any]:
    evidence_count = len(ticket.incident.evidence_list) if ticket.incident else 0
    return {
        "id": ticket.id,
        "ticket_id": ticket.ticket_id,
        "incident_id": ticket.incident_id,
        "title": ticket.title,
        "description": ticket.description,
        "district": ticket.district,
        "block": ticket.block,
        "panchayat": ticket.panchayat,
        "citizenName": ticket.citizen_name or (ticket.citizen.name if ticket.citizen else "Anonymous"),
        "citizenContact": ticket.citizen_contact or (ticket.citizen.phone if ticket.citizen else None),
        "citizen_id": ticket.citizen_id,
        "upvotes": int(ticket.upvotes or 0),
        "is_verified": bool(ticket.is_verified),
        "terrainRisk": ticket.terrain_risk,
        "infrastructureType": ticket.infrastructure_type,
        "department": ticket.department.name if ticket.department else "Unassigned",
        "department_id": ticket.department_id,
        "assigned_officer_id": ticket.assigned_officer_id,
        "status": enum_value(ticket.status),
        "priority": enum_value(ticket.priority),
        "intakePhotoUrl": ticket.intake_photo_url or "",
        "evidenceCount": evidence_count,
        "sla_due_date": iso(ticket.sla_due_date),
        "created_at": iso(ticket.created_at),
        "updated_at": iso(ticket.updated_at),
        "resolved_at": iso(ticket.resolved_at),
        "resolutionNotes": ticket.resolution_notes,
        "validationImageUrl": ticket.resolution_photo_url,
        "is_flagged": bool(ticket.is_flagged_to_cmo or enum_value(ticket.priority) == "critical"),
        "reopened_count": int(ticket.reopened_count or 0),
    }


def serialize_incident(incident: Incident, ticket: Grievance | None = None) -> dict[str, Any]:
    evidence = incident.evidence_list or []
    comments = [item for item in (incident.transitions or []) if item.actor_type in {"Community", "Citizen"}]
    is_hidden, is_pinned = incident_moderation_flags(incident)
    return {
        "id": incident.id,
        "incident_id": incident.id,
        "ticket_id": ticket.ticket_id if ticket else None,
        "title": ticket.title if ticket else incident.asset.name if incident.asset else incident.event_type,
        "description": ticket.description if ticket else "",
        "event_type": incident.event_type,
        "current_state": incident.current_state,
        "district": ticket.district if ticket else incident.asset.district if incident.asset else None,
        "is_hidden": is_hidden,
        "is_pinned": is_pinned,
        "support_count": int(ticket.upvotes or 0) if ticket else 0,
        "evidence_count": len(evidence),
        "comment_count": len(comments),
        "created_at": iso(incident.created_at),
        "updated_at": iso(incident.updated_at),
    }


def serialize_heritage(asset: CulturalAsset) -> dict[str, Any]:
    return {
        "id": str(asset.id),
        "pillar_category": asset.pillar_category,
        "title": asset.title,
        "description": asset.description,
        "specification": asset.specification,
        "icon": asset.icon,
        "image_url": asset.image_url,
        "images": [asset.image_url] if asset.image_url else [],
        "sub_items": asset.sub_items or [],
        "metadata": {"specification": asset.specification},
        "is_hidden": False,
        "is_featured": False,
        "created_at": iso(asset.created_at),
    }
