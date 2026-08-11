from datetime import datetime, time, timezone
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from database import get_db
from domain import HIMACHAL_ADMIN_HIERARCHY
from models import Citizen, CulturalAsset, Evidence, Grievance, GrievanceLog, Officer, TransitRoute, WeatherStation
from .dependencies import admin_actor
from .serializers import enum_value, iso, serialize_grievance, serialize_heritage

router = APIRouter()


def weather_row(station: WeatherStation) -> dict[str, Any]:
    rain = float(station.rainfall_1hr_mm or 0)
    river = float(station.river_stage_m or 0)
    if rain > 100 or (rain > 80 and river > 2):
        status, takri = "Cloudburst", "Megh-Vipaat"
    elif rain > 50:
        status, takri = "Heavy Rain", "Satark"
    elif rain > 10:
        status, takri = "Light Rain", "Nazar"
    else:
        status, takri = "Normal", "Sthir"
    return {
        "id": station.id,
        "station_name": station.station_name,
        "district": station.district,
        "elevation_m": station.elevation_m,
        "terrain_type": station.terrain_type,
        "current_season": station.current_season,
        "rainfall_1hr_mm": rain,
        "temperature_c": float(station.temperature_c or 0),
        "river_stage_m": river,
        "landslide_sensor_triggered": bool(station.landslide_sensor_triggered),
        "debris_flow_detected": bool(station.debris_flow_detected),
        "dashboard_status": status,
        "takri_status_label": takri,
        "last_ping": iso(station.last_ping),
    }


def transit_row(route: TransitRoute) -> dict[str, Any]:
    return {
        "id": route.id,
        "route_name": route.route_name,
        "origin": route.origin,
        "destination": route.destination,
        "key_hazard_zone": route.key_hazard_zone,
        "hazard_profile": route.hazard_profile,
        "current_status": route.current_status,
        "relay_state": route.relay_state,
        "is_closed": route.current_status in {"Blocked", "Suspended"},
        "closure_reason": route.roznamcha_remarks if route.current_status in {"Blocked", "Suspended"} else None,
        "roznamcha_remarks": route.roznamcha_remarks,
        "updated_at": iso(route.updated_at),
    }


def build_dashboard(db: Session) -> dict[str, Any]:
    tickets = db.query(Grievance).order_by(Grievance.created_at.desc()).all()
    heritage = db.query(CulturalAsset).order_by(CulturalAsset.id.asc()).all()
    weather = db.query(WeatherStation).order_by(WeatherStation.district.asc()).all()
    transit = db.query(TransitRoute).order_by(TransitRoute.current_status.asc()).all()
    today_start = datetime.combine(datetime.now(timezone.utc).date(), time.min).replace(tzinfo=None)
    active_statuses = {"Pending", "Under Verification", "In Progress", "Reopened via Citizen Veto"}
    normalized = [serialize_grievance(ticket) for ticket in tickets]
    district_load: dict[str, dict[str, int | str]] = {}
    for ticket in normalized:
        district = ticket["district"] or "Unassigned"
        row = district_load.setdefault(district, {"district": district, "total": 0, "critical": 0, "pending": 0})
        row["total"] += 1
        row["critical"] += int(ticket["priority"] == "critical")
        row["pending"] += int(ticket["status"] in active_statuses)

    activity = []
    for log in db.query(GrievanceLog).order_by(GrievanceLog.changed_at.desc()).limit(12).all():
        activity.append({
            "id": log.id,
            "ticket_id": log.grievance.ticket_id if log.grievance else None,
            "type": "complaint",
            "message": log.remarks,
            "status": enum_value(log.new_status),
            "created_at": iso(log.changed_at),
        })

    pending_verification = sum(not ticket.is_verified for ticket in tickets if enum_value(ticket.status) in active_statuses)
    resolved_today = sum(ticket.resolved_at is not None and ticket.resolved_at >= today_start for ticket in tickets)
    total_users = db.query(Citizen).count() + db.query(Officer).count()
    active_users = db.query(Citizen).count()
    active_users += db.query(Officer).filter(Officer.is_active.is_(True)).count()
    pending_images = db.query(Evidence).filter(Evidence.verification_status == "Pending Verification").count()
    infrastructure_records = db.query(models.Asset).count() + db.query(TransitRoute).count() + db.query(WeatherStation).count()

    metrics = {
        "total_grievances": len(tickets),
        "pending_complaints": sum(enum_value(ticket.status) == "Pending" for ticket in tickets),
        "pending_verification": pending_verification,
        "resolved_today": resolved_today,
        "total_users": total_users,
        "active_users": active_users,
        "flagged_reports": sum(bool(ticket.is_flagged_to_cmo or ticket.priority == "critical") for ticket in tickets),
        "pending_image_moderation": pending_images,
        "heritage_cards": len(heritage),
        "infrastructure_records": infrastructure_records,
        "active_pending": sum(enum_value(ticket.status) in active_statuses for ticket in tickets),
        "verified_resolved": sum(enum_value(ticket.status) == "Verified Resolved" for ticket in tickets),
        "verified_complaints": sum(bool(ticket.is_verified) for ticket in tickets),
        "resolved_complaints": sum(enum_value(ticket.status) == "Verified Resolved" for ticket in tickets),
        "critical_queue": sum(enum_value(ticket.priority) == "critical" for ticket in tickets),
        "weather_nodes": len(weather),
        "transit_routes": len(transit),
        "heritage_assets": len(heritage),
    }
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "metrics": metrics,
        "district_load": list(district_load.values()),
        "grievances": normalized,
        "pending_complaints": [ticket for ticket in normalized if ticket["status"] in active_statuses],
        "recent_activity": activity,
        "alerts": [item for item in activity if item["message"]],
        "weather": [weather_row(station) for station in weather],
        "transit": [transit_row(route) for route in transit],
        "heritage": [serialize_heritage(asset) for asset in heritage],
        "locations": [
            {"id": district.id, "name": district.name, "hierarchy": HIMACHAL_ADMIN_HIERARCHY.get(district.name, {})}
            for district in db.query(models.District).order_by(models.District.name.asc()).all()
        ],
    }


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    return build_dashboard(db)


@router.get("/summary")
def summary(db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    return build_dashboard(db)
