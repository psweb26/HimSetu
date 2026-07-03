import os
import re
import shutil
import threading
import time
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional

from schemas import ManualInjectRequest
from ledger import process_evidence
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload


from database import Base, SessionLocal, engine, get_db
from domain import (
    DEFAULT_COORDINATES_BY_DISTRICT,
    DEPARTMENT_BY_INFRASTRUCTURE_TYPE,
    DEPARTMENT_CODES,
    HIMACHAL_ADMIN_HIERARCHY,
    SLA_HOURS_BY_PRIORITY,
    allocate_department_name as resolve_department_name,
    evaluate_priority as resolve_priority,
)
from bridge import run_live_transit_bridge
from ingestor import build_ingestion_service
from security import hash_password, verify_password
import models
from models import (
    Asset,
    Incident,
    EventStateTransition,
    Category,
    Citizen,
    CitizenVeto,
    Evidence,
    CulturalAsset,
    Department,
    District,
    Grievance,
    GrievanceLog,
    Notification,
    Officer,
    Subcategory,
    TransitRoute,
    WeatherStation,
)

MUNICIPAL_REGION = os.getenv("MUNICIPAL_REGION", "HIMACHAL_PRADESH")
MONSOON_COMMAND_STATE = os.getenv("MONSOON_COMMAND_STATE", "ACTIVE")

UPVOTE_CRITICAL_THRESHOLD = 30
ACTIVE_STATUSES = ("Pending", "Under Verification", "In Progress", "Reopened via Citizen Veto")
SLA_MONITOR_INTERVAL_SECONDS = 60
UPLOAD_ROOT = Path(os.getenv("UPLOAD_ROOT", Path(__file__).resolve().parent / "uploads"))
UPLOAD_PUBLIC_PREFIX = "/uploads"

sla_monitor_thread: Optional[threading.Thread] = None
ingestion_scheduler: Optional[BackgroundScheduler] = None

app = FastAPI(
    title="HimSetu: Unified Civic Accountability & Heritage Platform",
    version="3.0.0",
    description="Localized multi-tenant civic oversight with regional cultural preservation for Himachal Pradesh",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Accept",
        "Authorization",
        "Content-Type",
        "Origin",
        "X-Monsoon-Command-State",
        "X-Municipal-Region",
        "X-Requested-With",
    ],
)

UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount(UPLOAD_PUBLIC_PREFIX, StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")

def to_iso(dt):
    return dt.isoformat() + "Z" if dt else None
@app.get("/api/assets/{asset_id}/incidents")
def get_asset_incidents(
    asset_id: int,
    db: Session = Depends(get_db)
):
    asset = db.query(Asset).filter(
        Asset.id == asset_id
    ).first()

    if not asset:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    incidents = (
        db.query(Incident)
        .filter(Incident.asset_id == asset_id)
        .order_by(Incident.created_at.desc())
        .all()
    )

    return {
        "asset": {
            "id": asset.id,
            "name": asset.name,
            "asset_type": asset.asset_type,
            "district": asset.district
        },
        "incidents": [
            {
                "incident_id": incident.id,
                "event_type": incident.event_type,
                "current_state": incident.current_state,
                "created_at": incident.created_at.isoformat() + "Z"
            }
            for incident in incidents
        ]
    }

@app.get("/api/assets/{asset_id}")
def get_asset(asset_id: int, db: Session = Depends(get_db)):
    asset = db.query(Asset).filter(
        Asset.id == asset_id
    ).first()

    if not asset:
        raise HTTPException(
            status_code=404,
            detail="Asset not found"
        )

    return {
        "id": asset.id,
        "name": asset.name,
        "asset_type": asset.asset_type,
        "district": asset.district,
        "lat": asset.lat,
        "lon": asset.lon
    }

@app.get("/api/incidents/{incident_ref}")
def get_incident(
    incident_ref: str,
    db: Session = Depends(get_db)
):
    """Fetch complete Incident narrative, evidence trail and audit history."""
    incident = resolve_incident_by_ref(db, incident_ref)

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    asset = db.query(Asset).filter(Asset.id == incident.asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=500, 
            detail=f"Data Integrity Error: Asset {incident.asset_id} for incident {incident.id} not found."
        )
    
    transitions = (
    db.query(EventStateTransition)
    .filter(
        EventStateTransition.incident_id == incident.id
    )
    .order_by(EventStateTransition.created_at)
    .all()
    )

    evidence_list = (
    db.query(Evidence)
    .options(joinedload(Evidence.source))
    .filter(Evidence.incident_id == incident.id)
    .order_by(Evidence.created_at.desc())
    .all()
    )
    grievance = get_primary_grievance_for_incident(db, incident.id)
    evidence_count = len(evidence_list)
    image_evidence = [
        evidence
        for evidence in evidence_list
        if evidence.image_url or (evidence.payload or {}).get("image_url")
    ]
    image_evidence.sort(
        key=lambda evidence: (
            int((evidence.payload or {}).get("upload_order") or 9999),
            evidence.created_at or utc_now(),
        )
    )
    primary_image_url = (
        grievance.intake_photo_url
        if grievance and grievance.intake_photo_url
        else (
            image_evidence[0].image_url or (image_evidence[0].payload or {}).get("image_url")
            if image_evidence
            else None
        )
    )
    gallery_images = [
        {
            "id": evidence.id,
            "image_url": evidence.image_url or (evidence.payload or {}).get("image_url"),
            "description": evidence.description or evidence.summary,
            "is_primary": (
                (evidence.image_url or (evidence.payload or {}).get("image_url"))
                == primary_image_url
            ),
            "upload_order": int((evidence.payload or {}).get("upload_order") or index + 1),
        }
        for index, evidence in enumerate(image_evidence)
    ]
    sla_status = "On Track"
    if grievance and grievance.sla_due_date and enum_value(grievance.status) in ACTIVE_STATUSES:
        sla_status = "Breached" if grievance.sla_due_date < utc_now() else "On Track"

    return {
    "asset": {
        "id": asset.id,
        "name": asset.name,
        "asset_type": asset.asset_type,
        "district": asset.district,
        "lat": asset.lat,
        "lon": asset.lon,
    },

    "incident": {
        "id": incident.id,
        "ticket_id": grievance.ticket_id if grievance else f"INC-{incident.id}",
        "asset_id": incident.asset_id,
        "event_type": incident.event_type,
        "current_state": incident.current_state,
        "title": grievance.title if grievance else asset.name,
        "description": grievance.description if grievance else "",
        "priority": enum_value(grievance.priority) if grievance else "medium",
        "department": grievance.department.name if grievance and grievance.department else "Pending",
        "district": grievance.district if grievance else asset.district,
        "block": grievance.block if grievance else "",
        "panchayat": grievance.panchayat if grievance else "",
        "citizen_name": (
            grievance.citizen_name
            if grievance and grievance.citizen_name
            else ("Anonymous" if grievance else None)
        ),
        "citizen_contact": grievance.citizen_contact if grievance else None,
        "verification_state": "Verified" if grievance and grievance.is_verified else "Pending Verification",
        "resolution_notes": grievance.resolution_notes if grievance else None,
        "resolution_photo_url": grievance.resolution_photo_url if grievance else None,
        "primary_image_url": primary_image_url,
        "gallery_images": gallery_images,
        "created_at": to_iso(incident.created_at),
        "updated_at": to_iso(incident.updated_at),
    },

    "summary": {
        "evidence_count": evidence_count,
        "transition_count": len(transitions),
        "current_status": incident.current_state,
        "upvotes": int(grievance.upvotes or 0) if grievance else 0,
        "sla_status": sla_status,
        "created_date": to_iso(grievance.created_at if grievance else incident.created_at),
        "last_updated": to_iso(
            incident.updated_at or incident.created_at
        ),
    },

    "timeline": [
        {
            "from_state": t.from_state,
            "to_state": t.to_state,
            "actor": t.actor_type,
            "reason": t.reason,
            "created_at": to_iso(t.created_at),
        }
        for t in transitions
    ],

    "evidence": [
        {
            "id": e.id,
            "incident_id": e.incident_id,
            "source": e.source.name if e.source else "Unknown",
            "evidence_type": e.evidence_type,
            "summary": e.summary,
            "uploaded_by": e.uploaded_by,
            "image_url": e.image_url or (e.payload or {}).get("image_url"),
            "description": e.description,
            "verification_status": e.verification_status,
            "created_at": to_iso(e.created_at),
        }
        for e in evidence_list
    ],
}

@app.post("/api/incidents/manual-inject")
def inject_incident(request: ManualInjectRequest, db: Session = Depends(get_db)):
    incident = process_evidence(
        db, 
        request.asset_id, 
        request.event_type, 
        request.source_id, 
        request.summary, 
        {"note": request.summary}
    )
    return {
    "status": "Incident updated",
    "incident_id": incident.id,
    "current_state": incident.current_state,
    "updated_at": incident.updated_at.isoformat() + "Z",
    }

class OTPLoginRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)
    otp: str = Field(..., min_length=4, max_length=6)

class StaffLoginRequest(BaseModel):
    email: EmailStr
    password: str

class GrievanceResponse(BaseModel):
    id: int
    ticket_id: str
    incident_id: Optional[int] = None
    title: str
    description: str
    district: str
    block: str
    panchayat: str
    citizenName: Optional[str] = None
    citizenContact: Optional[str] = None
    upvotes: int
    is_verified: bool
    terrainRisk: str
    infrastructureType: str
    department: str
    status: str
    priority: str
    intakePhotoUrl: str = ""
    evidenceCount: int = 0
    sla_due_date: datetime
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolutionNotes: Optional[str] = None
    validationImageUrl: Optional[str] = None

class GrievanceResolveRequest(BaseModel):
    resolutionNotes: str
    validationImageUrl: str = Field(..., max_length=255)
    officerId: Optional[int] = Field(default=None, gt=0)

class GrievanceResolveResponse(BaseModel):
    ticket_id: str
    previous_status: str
    new_status: str
    resolved_at: datetime
    log_id: int

class GrievanceReopenRequest(BaseModel):
    remarks: str

class GrievanceReopenResponse(BaseModel):
    ticket_id: str
    previous_status: str
    new_status: str
    reopened_count: int
    is_escalated_to_supervisor: bool
    sla_due_date: datetime
    log_id: int


class GrievanceVerificationRequest(BaseModel):
    officerId: int = Field(..., gt=0)
    isVerified: bool
    remarks: Optional[str] = None


class GrievanceVerificationResponse(BaseModel):
    ticket_id: str
    previous_verification: bool
    is_verified: bool
    updated_by_officer_id: int

class CitizenVetoRequest(BaseModel):
    veto_remarks: str
    evidence_photo_url: Optional[str] = None

class CitizenVetoResponse(BaseModel):
    ticket_id: str
    previous_status: str
    new_status: str
    veto_id: int

class CulturalSubItem(BaseModel):
    name: str
    detail: str
    spec: str
    icon: str
    img: Optional[str] = ""

class CulturalAssetResponse(BaseModel):
    id: str
    pillar_category: str
    title: str
    description: str
    specification: str
    icon: str
    image_url: Optional[str] = None
    sub_items: List[CulturalSubItem] = []
    created_at: datetime

    class Config:
        from_attributes = True

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

def enum_value(value: Any) -> str:
    return value.value if hasattr(value, "value") else str(value)

def require_non_empty(value: Optional[str], field_name: str) -> str:
    if value is None or not value.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must not be empty.",
        )
    return value.strip()

def validate_location_hierarchy(district: str, block: str, panchayat: str) -> None:
    block_map = HIMACHAL_ADMIN_HIERARCHY.get(district)
    if block_map is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"district must be one of: {', '.join(HIMACHAL_ADMIN_HIERARCHY.keys())}.",
        )

    panchayats = block_map.get(block)
    if panchayats is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"block '{block}' is not configured under district '{district}'.",
        )

    if panchayat not in panchayats:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"panchayat '{panchayat}' is not configured under {district} / {block}.",
        )

def evaluate_priority(terrain_risk: str) -> str:
    try:
        return resolve_priority(terrain_risk)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

def allocate_department_name(infrastructure_type: str) -> str:
    try:
        return resolve_department_name(infrastructure_type)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc

def get_or_create_department(db: Session, department_name: str) -> Department:
    department = db.query(Department).filter(Department.name == department_name).first()
    if department is not None:
        return department

    department = Department(
        name=department_name,
        code=DEPARTMENT_CODES[department_name],
    )
    db.add(department)
    db.flush()
    return department

def get_or_create_district(db: Session, district_name: str) -> District:
    district = db.query(District).filter(District.name == district_name).first()
    if district is not None:
        return district

    district = District(name=district_name)
    db.add(district)
    db.flush()
    return district

def get_or_create_citizen(db: Session) -> Citizen:
    citizen = db.query(Citizen).filter(Citizen.phone == "9999999999").first()
    if citizen is not None:
        return citizen

    citizen = Citizen(
        name="Rina Thakur",
        phone="9999999999",
        otp_hash="demo_hash",
    )
    db.add(citizen)
    db.flush()
    return citizen

def get_or_create_category(db: Session, name: str) -> Category:
    category = db.query(Category).filter(Category.name == name).first()
    if category is not None:
        return category

    category = Category(name=name)
    db.add(category)
    db.flush()
    return category

def get_or_create_subcategory(
    db: Session,
    category_id: int,
    department_id: int,
    name: str,
    sla_hours: int,
    base_priority: str,
) -> Subcategory:
    subcategory = db.query(Subcategory).filter(Subcategory.name == name).first()
    if subcategory is not None:
        return subcategory

    subcategory = Subcategory(
        category_id=category_id,
        department_id=department_id,
        name=name,
        sla_hours=sla_hours,
        base_priority=base_priority,
    )
    db.add(subcategory)
    db.flush()
    return subcategory

def get_or_create_officer(
    db: Session,
    name: str,
    department_id: int,
    district_id: int,
    block: str,
    email: str,
) -> Officer:
    officer = db.query(Officer).filter(Officer.email == email).first()
    if officer is not None:
        return officer

    officer = Officer(
        name=name,
        department_id=department_id,
        service_district_id=district_id,
        block=block,
        role="Officer",
        email=email,
        password_hash=hash_password("password"),
        is_active=True,
    )
    db.add(officer)
    db.flush()
    return officer

def get_or_create_data_source(db: Session, name: str, priority: int = 50) -> models.DataSource:
    source = db.query(models.DataSource).filter(models.DataSource.name == name).first()
    if source is not None:
        return source

    source = models.DataSource(name=name, source_priority=priority)
    db.add(source)
    db.flush()
    return source

def safe_upload_filename(original_name: str) -> str:
    suffix = Path(original_name or "").suffix.lower()
    if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Evidence file must be a JPG, PNG or WEBP image.",
        )
    timestamp = utc_now().strftime("%Y%m%d%H%M%S%f")
    stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", Path(original_name).stem).strip("-")[:40]
    return f"{timestamp}-{stem or 'evidence'}{suffix}"

def save_upload_file(upload: UploadFile) -> str:
    stored_name = safe_upload_filename(upload.filename or "evidence.jpg")
    now = utc_now()
    month_dir = UPLOAD_ROOT / f"{now:%Y}" / f"{now:%m}"
    month_dir.mkdir(parents=True, exist_ok=True)
    destination = month_dir / stored_name
    with destination.open("wb") as buffer:
        shutil.copyfileobj(upload.file, buffer)
    return f"{UPLOAD_PUBLIC_PREFIX}/{now:%Y}/{now:%m}/{stored_name}"

def tokenize_for_match(value: str) -> set[str]:
    return {
        token
        for token in re.findall(r"[a-z0-9]+", (value or "").lower())
        if len(token) > 2
    }

def similarity_score(left: str, right: str) -> float:
    left_tokens = tokenize_for_match(left)
    right_tokens = tokenize_for_match(right)
    if not left_tokens or not right_tokens:
        return 0.0
    return len(left_tokens & right_tokens) / len(left_tokens | right_tokens)

def find_matching_active_incident(
    db: Session,
    panchayat: str,
    title: str,
    description: str,
) -> Optional[Incident]:
    active_linked = (
        db.query(Grievance)
        .filter(
            Grievance.panchayat == panchayat,
            Grievance.incident_id.isnot(None),
            Grievance.status.in_(ACTIVE_STATUSES),
        )
        .order_by(Grievance.created_at.desc())
        .all()
    )
    for existing in active_linked:
        title_score = similarity_score(existing.title, title)
        description_score = similarity_score(existing.description, description)
        if title_score >= 0.35 or description_score >= 0.25:
            return existing.incident
    return None

def create_report_asset(
    db: Session,
    title: str,
    infrastructure_type: str,
    district: str,
    latitude: Optional[Decimal],
    longitude: Optional[Decimal],
) -> Asset:
    asset = Asset(
        asset_type=infrastructure_type,
        name=title[:120],
        district=district,
        lat=float(latitude) if latitude is not None else None,
        lon=float(longitude) if longitude is not None else None,
    )
    db.add(asset)
    db.flush()
    return asset

def append_incident_timeline(
    db: Session,
    incident: Incident,
    to_state: str,
    actor_type: str,
    reason: str,
    evidence_id: Optional[int] = None,
) -> EventStateTransition:
    transition = EventStateTransition(
        incident_id=incident.id,
        from_state=incident.current_state,
        to_state=to_state,
        actor_type=actor_type,
        reason=reason,
        evidence_id=evidence_id,
    )
    incident.current_state = to_state
    incident.updated_at = utc_now()
    db.add(transition)
    db.flush()
    return transition

def append_incident_evidence(
    db: Session,
    incident_id: int,
    source_name: str,
    uploaded_by: str,
    image_url: Optional[str],
    description: str,
    evidence_type: str = "Image",
    verification_status: str = "Pending Verification",
    source_priority: int = 50,
    metadata: Optional[Dict[str, Any]] = None,
) -> Evidence:
    source = get_or_create_data_source(db, source_name, source_priority)
    payload = {
        "image_url": image_url,
        "description": description,
        "uploaded_by": uploaded_by,
        "verification_status": verification_status,
    }
    if metadata:
        payload.update(metadata)
    evidence = Evidence(
        incident_id=incident_id,
        source_id=source.id,
        evidence_type=evidence_type,
        summary=description,
        payload=payload,
        uploaded_by=uploaded_by,
        image_url=image_url,
        description=description,
        verification_status=verification_status,
        source_timestamp=utc_now(),
    )
    db.add(evidence)
    db.flush()
    return evidence

def get_primary_grievance_for_incident(db: Session, incident_id: int) -> Optional[Grievance]:
    return (
        db.query(Grievance)
        .filter(Grievance.incident_id == incident_id)
        .order_by(Grievance.created_at.asc())
        .first()
    )

def resolve_incident_by_ref(db: Session, incident_ref: str) -> Optional[Incident]:
    grievance_for_ref = db.query(Grievance).filter(Grievance.ticket_id == incident_ref).first()
    if grievance_for_ref and grievance_for_ref.incident_id:
        return db.query(Incident).filter(Incident.id == grievance_for_ref.incident_id).first()
    if incident_ref.isdigit():
        return db.query(Incident).filter(Incident.id == int(incident_ref)).first()
    return None


def ensure_schema_updates() -> None:
    db = SessionLocal()
    try:
        for statement in (
            "ALTER TABLE grievances ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;",
            "ALTER TABLE grievances ADD COLUMN IF NOT EXISTS incident_id INTEGER;",
            "ALTER TABLE grievances ADD COLUMN IF NOT EXISTS citizen_name VARCHAR(120);",
            "ALTER TABLE grievances ADD COLUMN IF NOT EXISTS citizen_contact VARCHAR(120);",
            "CREATE INDEX IF NOT EXISTS ix_grievances_incident_id ON grievances (incident_id);",
            "ALTER TABLE evidence ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(120);",
            "ALTER TABLE evidence ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);",
            "ALTER TABLE evidence ADD COLUMN IF NOT EXISTS description TEXT;",
            "ALTER TABLE evidence ADD COLUMN IF NOT EXISTS verification_status VARCHAR(40) NOT NULL DEFAULT 'Pending Verification';",
        ):
            db.execute(text(statement))
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def bootstrap_database() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_schema_updates()

    db = SessionLocal()
    try:
        districts = {
            district_name: get_or_create_district(db, district_name)
            for district_name in HIMACHAL_ADMIN_HIERARCHY
        }
        departments = {
            department_name: get_or_create_department(db, department_name)
            for department_name in DEPARTMENT_BY_INFRASTRUCTURE_TYPE.values()
        }
        citizen = get_or_create_citizen(db)
        infrastructure_category = get_or_create_category(db, "Monsoon Infrastructure")
        utilities_category = get_or_create_category(db, "Critical Public Utilities")

        subcategories = {
            "Connecting Bailey Bridge": get_or_create_subcategory(
                db,
                infrastructure_category.id,
                departments["Public Works Department"].id,
                "Bailey Bridge Distress",
                8,
                "critical",
            ),
            "Drinking Water Line": get_or_create_subcategory(
                db,
                utilities_category.id,
                departments["Jal Shakti Vibhag"].id,
                "Drinking Water Line Washout",
                24,
                "high",
            ),
            "NH Highway Link": get_or_create_subcategory(
                db,
                infrastructure_category.id,
                departments["National Highways Wing"].id,
                "Highway Landslide Corridor",
                24,
                "high",
            ),
            "Power Grid Substation": get_or_create_subcategory(
                db,
                utilities_category.id,
                departments["HPSEBL Operations"].id,
                "Power Grid Access Failure",
                24,
                "high",
            ),
        }

        get_or_create_officer(
            db,
            "Officer Dev Negi",
            departments["Public Works Department"].id,
            districts["Kullu"].id,
            "Bhuntar",
            "dev.negi@hp.gov.example",
        )
        get_or_create_officer(
            db,
            "Officer Meera Rana",
            departments["Jal Shakti Vibhag"].id,
            districts["Kullu"].id,
            "Anni",
            "meera.rana@hp.gov.example",
        )
        get_or_create_officer(
            db,
            "Officer Arjun Chauhan",
            departments["National Highways Wing"].id,
            districts["Mandi"].id,
            "Seraj",
            "arjun.chauhan@hp.gov.example",
        )
        get_or_create_officer(
            db,
            "Officer Tashi Dolma",
            departments["HPSEBL Operations"].id,
            districts["Lahaul & Spiti"].id,
            "Kaza",
            "tashi.dolma@hp.gov.example",
        )

        if db.query(Grievance.id).first() is None:
            seed_bootstrap_grievances(db, citizen, districts, departments, subcategories)

        migrate_legacy_ticket_ids(db)
        backfill_incidents_for_grievances(db)

        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def next_daily_hs_ticket_id(db: Session, created_at: datetime, used: set[str]) -> str:
    day_prefix = f"HS-{created_at:%Y%m%d}-"
    existing_ids = [
        row[0]
        for row in db.query(Grievance.ticket_id)
        .filter(Grievance.ticket_id.like(f"{day_prefix}%"))
        .all()
    ]
    max_sequence = 0
    for ticket_id in existing_ids:
        match = re.search(r"-(\d{4})$", ticket_id)
        if match:
            max_sequence = max(max_sequence, int(match.group(1)))

    sequence = max_sequence + 1
    while True:
        candidate = f"{day_prefix}{sequence:04d}"
        if candidate not in used:
            used.add(candidate)
            return candidate
        sequence += 1

def migrate_legacy_ticket_ids(db: Session) -> None:
    legacy_tickets = (
        db.query(Grievance)
        .filter(~Grievance.ticket_id.op("~")(r"^HS-[0-9]{8}-[0-9]{4}$"))
        .order_by(Grievance.created_at.asc(), Grievance.id.asc())
        .all()
    )
    used = {row[0] for row in db.query(Grievance.ticket_id).all()}
    for ticket in legacy_tickets:
        old_ticket_id = ticket.ticket_id
        ticket.ticket_id = next_daily_hs_ticket_id(db, ticket.created_at or utc_now(), used)
        db.add(
            Notification(
                grievance_id=ticket.id,
                recipient_type="System",
                channel="Email",
                message=f"Legacy ticket {old_ticket_id} migrated to HimSetu ticket {ticket.ticket_id}.",
            )
        )

def backfill_incidents_for_grievances(db: Session) -> None:
    tickets = (
        db.query(Grievance)
        .filter(Grievance.incident_id.is_(None))
        .order_by(Grievance.created_at.asc())
        .all()
    )
    for ticket in tickets:
        asset = create_report_asset(
            db=db,
            title=ticket.title,
            infrastructure_type=ticket.infrastructure_type,
            district=ticket.district,
            latitude=ticket.latitude,
            longitude=ticket.longitude,
        )
        incident = Incident(
            asset_id=asset.id,
            event_type=ticket.infrastructure_type,
            current_state=enum_value(ticket.status),
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
        )
        db.add(incident)
        db.flush()
        ticket.incident_id = incident.id
        if not ticket.citizen_name:
            ticket.citizen_name = ticket.citizen.name if ticket.citizen else "Anonymous"

        image_url = ticket.intake_photo_url or ""
        evidence_id = None
        if image_url:
            evidence = append_incident_evidence(
                db=db,
                incident_id=incident.id,
                source_name="Citizen",
                uploaded_by=ticket.citizen_name or "Anonymous",
                image_url=image_url,
                description=f"Citizen submitted photograph for {ticket.title}",
                evidence_type="Image",
                verification_status="Verified" if ticket.is_verified else "Pending Verification",
                source_priority=40,
            )
            evidence_id = evidence.id
        db.add(
            EventStateTransition(
                incident_id=incident.id,
                from_state=None,
                to_state=enum_value(ticket.status),
                actor_type="Citizen",
                reason="Citizen report submitted",
                evidence_id=evidence_id,
                created_at=ticket.created_at,
            )
        )

def seed_bootstrap_grievances(
    db: Session,
    citizen: Citizen,
    districts: Dict[str, District],
    departments: Dict[str, Department],
    subcategories: Dict[str, Subcategory],
) -> None:
    now = utc_now()
    payloads = [
        {
            "ticket_id": "HP-2026-PWD-BAILEY-001",
            "district": "Kullu",
            "block": "Bhuntar",
            "panchayat": "Sainj",
            "terrainRisk": "Flash Flood Khud Proximity",
            "infrastructureType": "Connecting Bailey Bridge",
            "title": "Bailey bridge deck plates buckling near Sainj market",
            "description": "Community crossing over the khud is vibrating under school bus traffic after overnight rainfall.",
            "upvotes": 42,
            "hours_ago": 3,
        },
        {
            "ticket_id": "HP-2026-NHW-LANDSLIDE-002",
            "district": "Mandi",
            "block": "Seraj",
            "panchayat": "Thunag",
            "terrainRisk": "Landslide Vulnerable Link",
            "infrastructureType": "NH Highway Link",
            "title": "Road retaining wall slipping on Seraj orchard link",
            "description": "The lower shoulder has opened a visible crack and loose stone is falling onto the bus route.",
            "upvotes": 29,
            "hours_ago": 10,
        },
        {
            "ticket_id": "HP-2026-JSV-WATER-003",
            "district": "Kullu",
            "block": "Anni",
            "panchayat": "Draman",
            "terrainRisk": "Flash Flood Khud Proximity",
            "infrastructureType": "Drinking Water Line",
            "title": "Gravity water line washed out above Draman",
            "description": "Two hamlets are reporting no drinking water after the exposed pipe snapped at the nala crossing.",
            "upvotes": 18,
            "hours_ago": 6,
        },
        {
            "ticket_id": "HP-2026-HPSEBL-POWER-004",
            "district": "Lahaul & Spiti",
            "block": "Kaza",
            "panchayat": "Kibber",
            "terrainRisk": "High-Alpine Alpine Track",
            "infrastructureType": "Power Grid Substation",
            "title": "Snowmelt erosion along Kibber service track",
            "description": "High-altitude track shoulders are narrowing and emergency vehicle access is now unreliable.",
            "upvotes": 12,
            "hours_ago": 20,
        },
    ]

    for payload in payloads:
        department_name = allocate_department_name(payload["infrastructureType"])
        department = departments[department_name]
        district = districts[payload["district"]]
        created_at = now - timedelta(hours=payload["hours_ago"])
        priority = evaluate_priority(payload["terrainRisk"])
        if payload["upvotes"] > UPVOTE_CRITICAL_THRESHOLD:
            priority = "critical"
        officer = find_assignment_officer(db, department.id, district.id, payload["block"])

        db.add(Grievance(
            ticket_id=payload["ticket_id"],
            citizen_id=citizen.id,
            category_id=subcategories[payload["infrastructureType"]].category_id,
            subcategory_id=subcategories[payload["infrastructureType"]].id,
            department_id=department.id,
            assigned_officer_id=officer.id if officer else None,
            latitude=decimal_coord(None, payload["district"], 0),
            longitude=decimal_coord(None, payload["district"], 1),
            district_id=district.id,
            district=payload["district"],
            block=payload["block"],
            panchayat=payload["panchayat"],
            terrain_risk=payload["terrainRisk"],
            infrastructure_type=payload["infrastructureType"],
            upvotes=payload["upvotes"],
            is_verified=False,
            title=payload["title"],
            description=payload["description"],
            intake_photo_url="",
            status="Pending",
            priority=priority,
            is_flagged_to_cmo=payload["upvotes"] > UPVOTE_CRITICAL_THRESHOLD,
            sla_due_date=created_at + timedelta(hours=SLA_HOURS_BY_PRIORITY[priority]),
            created_at=created_at,
            updated_at=created_at,
        ))

def find_assignment_officer(db: Session, department_id: int, district_id: Optional[int], block: str) -> Optional[Officer]:
    location_specific = db.query(Officer).filter(
        Officer.department_id == department_id,
        Officer.service_district_id == district_id,
        Officer.block == block,
        Officer.role == "Officer",
        Officer.is_active.is_(True),
    ).order_by(Officer.id.asc()).first()
    if location_specific is not None:
        return location_specific

    return db.query(Officer).filter(
        Officer.department_id == department_id,
        Officer.role == "Officer",
        Officer.is_active.is_(True),
    ).order_by(Officer.id.asc()).first()

def generate_ticket_id(sequence: int, now: datetime) -> str:
    return f"HS-{now:%Y%m%d}-{sequence:04d}"

def ensure_unique_ticket_id(db: Session, department_code: str) -> tuple[str, datetime]:
    now = utc_now()
    day_prefix = f"HS-{now:%Y%m%d}-"
    latest_ticket = (
        db.query(Grievance.ticket_id)
        .filter(Grievance.ticket_id.like(f"{day_prefix}%"))
        .order_by(Grievance.ticket_id.desc())
        .first()
    )
    next_sequence = 1
    if latest_ticket:
        match = re.search(r"-(\d{4})$", latest_ticket[0])
        if match:
            next_sequence = int(match.group(1)) + 1

    for sequence in range(next_sequence, next_sequence + 100):
        ticket_id = generate_ticket_id(sequence, now)
        exists = db.query(Grievance.id).filter(Grievance.ticket_id == ticket_id).first()
        if not exists:
            return ticket_id, now
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Unable to generate a unique HimSetu ticket id.",
    )

def decimal_coord(value: Optional[float], district: str, index: int) -> Optional[Decimal]:
    if value is not None:
        return Decimal(f"{value:.6f}")
    fallback = DEFAULT_COORDINATES_BY_DISTRICT.get(district)
    if fallback is None:
        return None
    return Decimal(f"{fallback[index]:.6f}")

def apply_upvote_promotion(grievance: Grievance) -> bool:
    if int(grievance.upvotes or 0) > UPVOTE_CRITICAL_THRESHOLD:
        changed = enum_value(grievance.priority) != "critical"
        grievance.priority = "critical"
        grievance.is_flagged_to_cmo = True
        return changed
    return False

def promote_high_upvote_tickets(db: Session) -> None:
    promoted = False
    tickets = db.query(Grievance).filter(Grievance.upvotes > UPVOTE_CRITICAL_THRESHOLD).all()
    for ticket in tickets:
        promoted = apply_upvote_promotion(ticket) or promoted
    if promoted:
        db.commit()

def calculate_composite_score(grievance: Grievance) -> int:
    priority = enum_value(grievance.priority)
    return (
        (60 if priority == "critical" else 20)
        + int(grievance.upvotes or 0) * 2
        + (15 if grievance.terrain_risk == "Flash Flood Khud Proximity" else 0)
    )

def serialize_grievance(grievance: Grievance) -> GrievanceResponse:
    evidence_count = len(grievance.incident.evidence_list) if grievance.incident else 0
    return GrievanceResponse(
        id=grievance.id,
        ticket_id=grievance.ticket_id,
        incident_id=grievance.incident_id,
        title=grievance.title,
        description=grievance.description,
        district=grievance.district,
        block=grievance.block,
        panchayat=grievance.panchayat,
        citizenName=grievance.citizen_name or (grievance.citizen.name if grievance.citizen else "Anonymous"),
        citizenContact=grievance.citizen_contact,
        upvotes=int(grievance.upvotes or 0),
        is_verified=bool(grievance.is_verified),
        terrainRisk=grievance.terrain_risk,
        infrastructureType=grievance.infrastructure_type,
        department=grievance.department.name if grievance.department else "Unassigned",
        status=enum_value(grievance.status),
        priority=enum_value(grievance.priority),
        intakePhotoUrl=grievance.intake_photo_url or "",
        evidenceCount=evidence_count,
        sla_due_date=grievance.sla_due_date,
        created_at=grievance.created_at,
        resolved_at=grievance.resolved_at,
        resolutionNotes=grievance.resolution_notes,
        validationImageUrl=grievance.resolution_photo_url,
    )

def run_sla_compliance_monitor() -> None:
    while True:
        from database import SessionLocal
        worker_db = SessionLocal()
        try:
            now = utc_now()
            breached_tickets = worker_db.query(Grievance).filter(
                Grievance.status.in_(ACTIVE_STATUSES),
                Grievance.sla_due_date < now,
                Grievance.is_escalated_to_dm.is_(False),
            ).all()

            for ticket in breached_tickets:
                previous_status = enum_value(ticket.status)
                ticket.is_escalated_to_dm = True
                ticket.priority = "critical"
                ticket.is_flagged_to_cmo = True

                worker_db.add(GrievanceLog(
                    grievance_id=ticket.id,
                    previous_status=previous_status,
                    new_status=previous_status,
                    remarks="System Automation Hook: mountain window SLA breached. Escalated to District Magistrate.",
                    action_by_officer_id=ticket.assigned_officer_id,
                ))
                worker_db.add(Notification(
                    grievance_id=ticket.id,
                    recipient_type="District Magistrate",
                    channel="Email",
                    message=f"SLA breach alert for ticket {ticket.ticket_id}. Command review required.",
                ))
            worker_db.commit()
        except Exception as monitor_err:
            print(f"Background monitoring worker error encountered: {monitor_err}")
            worker_db.rollback()
        finally:
            worker_db.close()
        time.sleep(SLA_MONITOR_INTERVAL_SECONDS)


def require_officer_role(db: Session, officer_id: int) -> Officer:
    officer = db.query(Officer).filter(Officer.id == officer_id).first()
    if officer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Officer account not found.",
        )
    if enum_value(officer.role) != "Officer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only users with role 'Officer' can update verification.",
        )
    return officer

@app.on_event("startup")
def start_sla_compliance_monitor() -> None:
    global ingestion_scheduler
    global sla_monitor_thread
    bootstrap_database()
    if sla_monitor_thread is None or not sla_monitor_thread.is_alive():
        sla_monitor_thread = threading.Thread(target=run_sla_compliance_monitor, daemon=True)
        sla_monitor_thread.start()

    if ingestion_scheduler and ingestion_scheduler.running:
        return

    ingestion_service = build_ingestion_service()
    ingestion_scheduler = BackgroundScheduler(
        timezone="Asia/Kolkata",
        job_defaults={"coalesce": True, "max_instances": 1},
    )
    ingestion_scheduler.add_job(
        ingestion_service.run_weather_sync,
        trigger=IntervalTrigger(minutes=10),
        id="weather-ingestion",
        replace_existing=True,
    )
    ingestion_scheduler.add_job(
        ingestion_service.run_transit_sync,
        trigger=IntervalTrigger(minutes=5),
        id="transit-ingestion",
        replace_existing=True,
    )
    ingestion_scheduler.add_job(
        run_live_transit_bridge,
        trigger=IntervalTrigger(minutes=2),
        id="live-emergency-bridge",
        replace_existing=True,
    )
    ingestion_scheduler.start()
    ingestion_service.run_weather_sync()
    ingestion_service.run_transit_sync()
    run_live_transit_bridge()


@app.on_event("shutdown")
def stop_ingestion_scheduler() -> None:
    global ingestion_scheduler
    if ingestion_scheduler and ingestion_scheduler.running:
        ingestion_scheduler.shutdown(wait=False)
    ingestion_scheduler = None

@app.get("/health")
def health_check() -> Dict[str, str]:
    return {
        "status": "ok",
        "municipal_region": MUNICIPAL_REGION,
        "monsoon_command_state": MONSOON_COMMAND_STATE,
    }

@app.post("/api/v1/auth/login", status_code=status.HTTP_200_OK)
def staff_and_executive_login(
    payload: StaffLoginRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    officer = db.query(Officer).filter(Officer.email == payload.email).first()
    
    if officer is None or not verify_password(payload.password, officer.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrative username or password configuration.",
        )

    return {
        "success": True,
        "user_id": officer.id,
        "role": enum_value(officer.role),
        "department_id": officer.department_id,
        "token": "mocked_staff_jwt_token_hash",
    }

@app.get("/api/grievances", response_model=List[GrievanceResponse])
def list_grievances(db: Session = Depends(get_db)) -> List[GrievanceResponse]:
    promote_high_upvote_tickets(db)
    tickets = db.query(Grievance).order_by(Grievance.created_at.desc()).all()
    return [serialize_grievance(ticket) for ticket in tickets]

@app.get("/api/community-discovery", response_model=List[GrievanceResponse])
def community_discovery(db: Session = Depends(get_db)) -> List[GrievanceResponse]:
    """Community-facing incident cards sourced from submitted grievances."""
    promote_high_upvote_tickets(db)
    tickets = db.query(Grievance).order_by(Grievance.created_at.desc()).all()
    return [serialize_grievance(ticket) for ticket in tickets]

@app.get("/api/ticket-telemetry")
def live_ticket_telemetry(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """Operational feed only: no discussion, comments or evidence gallery."""
    promote_high_upvote_tickets(db)
    tickets = db.query(Grievance).order_by(Grievance.created_at.desc()).all()
    now = utc_now()
    rows = []
    for ticket in tickets:
        status_value = enum_value(ticket.status)
        if status_value not in ACTIVE_STATUSES:
            progress = 4
        elif status_value == "Pending":
            progress = 1
        elif status_value == "Under Verification":
            progress = 2
        else:
            progress = 3
        rows.append({
            "ticket_id": ticket.ticket_id,
            "incident_id": ticket.incident_id,
            "status": status_value,
            "priority": enum_value(ticket.priority),
            "district": ticket.district,
            "assigned_department": ticket.department.name if ticket.department else "Unassigned",
            "verification_state": "Verified" if ticket.is_verified else "Pending Verification",
            "sla_status": "Breached" if ticket.sla_due_date < now and status_value in ACTIVE_STATUSES else "On Track",
            "timeline_progress": progress,
            "created_at": to_iso(ticket.created_at),
        })
    return rows

@app.post("/api/grievances", response_model=GrievanceResponse, status_code=status.HTTP_201_CREATED)
def create_grievance(
    title: str = Form(...),
    description: str = Form(...),
    district: str = Form(...),
    block: str = Form(...),
    panchayat: str = Form(...),
    terrainRisk: str = Form("Standard Rural Road"),
    infrastructureType: str = Form("Connecting Bailey Bridge"),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    citizenName: Optional[str] = Form(None),
    contact: Optional[str] = Form(None),
    citizenId: Optional[int] = Form(None),
    file: Optional[UploadFile] = File(None),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
) -> GrievanceResponse:
    """Create a citizen report and attach it to the incident/evidence lifecycle."""
    title = require_non_empty(title, "title")
    description = require_non_empty(description, "description")
    validate_location_hierarchy(district, block, panchayat)

    priority = evaluate_priority(terrainRisk)
    department_name = allocate_department_name(infrastructureType)
    department = get_or_create_department(db, department_name)
    district_obj = get_or_create_district(db, district)
    
    officer = find_assignment_officer(
        db=db,
        department_id=department.id,
        district_id=district_obj.id,
        block=block,
    )
    citizen = db.query(Citizen).filter(Citizen.id == citizenId).first() if citizenId else None
    ticket_id, now = ensure_unique_ticket_id(db, department.code)
    latitude_value = decimal_coord(latitude, district, 0)
    longitude_value = decimal_coord(longitude, district, 1)
    upload_files = [upload for upload in (files or []) if upload and upload.filename]
    if file is not None and file.filename:
        upload_files.insert(0, file)
    if not upload_files:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one evidence photograph is required.",
        )
    if len(upload_files) > 3:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A maximum of 3 evidence photographs can be uploaded.",
        )
    image_urls = [save_upload_file(upload) for upload in upload_files]
    image_url = image_urls[0]
    matched_incident = find_matching_active_incident(db, panchayat, title, description)
    incident = matched_incident

    if incident is None:
        asset = create_report_asset(
            db=db,
            title=title,
            infrastructure_type=infrastructureType,
            district=district,
            latitude=latitude_value,
            longitude=longitude_value,
        )
        incident = Incident(
            asset_id=asset.id,
            event_type=infrastructureType,
            current_state="Pending",
            created_at=now,
            updated_at=now,
        )
        db.add(incident)
        db.flush()
    
    grievance = Grievance(
        ticket_id=ticket_id,
        citizen_id=citizen.id if citizen else None,
        incident_id=incident.id,
        citizen_name=(citizenName or "").strip() or (citizen.name if citizen else "Anonymous"),
        citizen_contact=(contact or "").strip() or None,
        department_id=department.id,
        assigned_officer_id=officer.id if officer else None,
        latitude=latitude_value,
        longitude=longitude_value,
        district_id=district_obj.id,
        district=district,
        block=block,
        panchayat=panchayat,
        terrain_risk=terrainRisk,
        infrastructure_type=infrastructureType,
        upvotes=0,
        is_verified=False,
        title=title,
        description=description,
        intake_photo_url=image_url,
        status="Pending",
        priority=priority,
        is_flagged_to_cmo=False,
        sla_due_date=now + timedelta(hours=SLA_HOURS_BY_PRIORITY[priority]),
        created_at=now,
        updated_at=now,
    )

    try:
        db.add(grievance)
        if matched_incident is not None:
            primary = get_primary_grievance_for_incident(db, incident.id)
            if primary is not None:
                primary.upvotes = int(primary.upvotes or 0) + 1

        first_evidence_id = None
        for index, uploaded_image_url in enumerate(image_urls, start=1):
            evidence = append_incident_evidence(
                db=db,
                incident_id=incident.id,
                source_name="Citizen",
                uploaded_by=grievance.citizen_name or "Anonymous",
                image_url=uploaded_image_url,
                description=(
                    f"Citizen submitted primary photograph for {title}"
                    if index == 1
                    else f"Citizen submitted supporting photograph {index} for {title}"
                ),
                evidence_type="Image",
                verification_status="Pending Verification",
                source_priority=40,
                metadata={
                    "upload_order": index,
                    "is_primary": index == 1,
                },
            )
            if index == 1:
                first_evidence_id = evidence.id
        append_incident_timeline(
            db=db,
            incident=incident,
            to_state=enum_value(grievance.status),
            actor_type="Citizen",
            reason="Citizen report submitted",
            evidence_id=first_evidence_id,
        )
        db.add(
            GrievanceLog(
                grievance_id=grievance.id,
                previous_status="Pending",
                new_status="Pending",
                remarks="Citizen report submitted",
                action_by_officer_id=None,
            )
        )
        db.commit()
        db.refresh(grievance)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to commit grievance data record.",
        ) from exc

    return serialize_grievance(grievance)

@app.post("/api/grievances/{ticket_id}/upvote", response_model=GrievanceResponse)
def upvote_grievance(ticket_id: str, db: Session = Depends(get_db)) -> GrievanceResponse:
    grievance = db.query(Grievance).filter(Grievance.ticket_id == ticket_id).with_for_update().first()
    if grievance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grievance profile lookup failure.")

    grievance.upvotes = int(grievance.upvotes or 0) + 1
    apply_upvote_promotion(grievance)

    try:
        db.commit()
        db.refresh(grievance)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Upvote transaction commit error.") from exc
    return serialize_grievance(grievance)

@app.post("/api/incidents/{incident_id}/upvote", response_model=GrievanceResponse)
def upvote_incident(incident_id: int, db: Session = Depends(get_db)) -> GrievanceResponse:
    grievance = get_primary_grievance_for_incident(db, incident_id)
    if grievance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident grievance profile not found.")
    return upvote_grievance(grievance.ticket_id, db)

@app.post("/api/incidents/{incident_id}/evidence")
def upload_incident_evidence(
    incident_id: int,
    description: str = Form("Community uploaded evidence"),
    source: str = Form("Community"),
    uploadedBy: str = Form("Anonymous"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    incident = db.query(Incident).filter(Incident.id == incident_id).with_for_update().first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")

    image_url = save_upload_file(file)
    evidence = append_incident_evidence(
        db=db,
        incident_id=incident.id,
        source_name=source,
        uploaded_by=uploadedBy.strip() or "Anonymous",
        image_url=image_url,
        description=description.strip() or "Community uploaded evidence",
        evidence_type="Image",
        verification_status="Pending Verification",
        source_priority=40,
    )
    append_incident_timeline(
        db=db,
        incident=incident,
        to_state=incident.current_state,
        actor_type=source,
        reason="Community uploaded evidence",
        evidence_id=evidence.id,
    )

    try:
        db.commit()
        db.refresh(evidence)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Evidence upload commit error.") from exc

    return {
        "evidence_id": evidence.id,
        "incident_id": incident.id,
        "image_url": evidence.image_url,
        "verification_status": evidence.verification_status,
        "created_at": to_iso(evidence.created_at),
    }

@app.post("/api/incidents/{incident_ref}/community-replies")
def add_community_reply(
    incident_ref: str,
    comment: str = Form(...),
    uploadedBy: str = Form("Community Member"),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    incident = resolve_incident_by_ref(db, incident_ref)
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")

    comment_text = require_non_empty(comment, "comment")
    display_name = uploadedBy.strip() or "Community Member"
    evidence_id = None
    image_url = None
    if file is not None and file.filename:
        image_url = save_upload_file(file)
        evidence = append_incident_evidence(
            db=db,
            incident_id=incident.id,
            source_name="Community",
            uploaded_by=display_name,
            image_url=image_url,
            description=f"Community proof attached: {comment_text}",
            evidence_type="Community Proof",
            verification_status="Pending Verification",
            source_priority=40,
        )
        evidence_id = evidence.id

    append_incident_timeline(
        db=db,
        incident=incident,
        to_state=incident.current_state,
        actor_type="Community",
        reason=f"Community reply by {display_name}: {comment_text}",
        evidence_id=evidence_id,
    )

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Community reply commit error.") from exc

    grievance = get_primary_grievance_for_incident(db, incident.id)
    return {
        "incident_id": incident.id,
        "ticket_id": grievance.ticket_id if grievance else f"INC-{incident.id}",
        "author": display_name,
        "comment": comment_text,
        "image_url": image_url,
        "evidence_id": evidence_id,
        "created_at": to_iso(utc_now()),
    }

@app.post("/api/incidents/{incident_id}/duplicates")
def report_duplicate_incident(
    incident_id: int,
    duplicateIncidentId: Optional[int] = Form(None),
    remarks: str = Form("Community duplicate report"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    append_incident_timeline(
        db=db,
        incident=incident,
        to_state=incident.current_state,
        actor_type="Community",
        reason=(
            f"Duplicate reported against incident {duplicateIncidentId}: {remarks}"
            if duplicateIncidentId
            else f"Duplicate report filed: {remarks}"
        ),
    )
    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Duplicate report commit error.") from exc
    return {"incident_id": incident.id, "status": "duplicate_report_logged"}


@app.patch("/api/grievances/{ticket_id}/verification", response_model=GrievanceVerificationResponse)
def update_grievance_verification(
    ticket_id: str,
    payload: GrievanceVerificationRequest,
    db: Session = Depends(get_db),
) -> GrievanceVerificationResponse:
    officer = require_officer_role(db, payload.officerId)
    grievance = (
        db.query(Grievance)
        .filter(Grievance.ticket_id == ticket_id)
        .with_for_update()
        .first()
    )
    if grievance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance ticket not found.",
        )

    previous_verification = bool(grievance.is_verified)
    previous_status = enum_value(grievance.status)
    grievance.is_verified = bool(payload.isVerified)
    if grievance.is_verified and enum_value(grievance.status) == "Pending":
        grievance.status = "Under Verification"

    verification_note = payload.remarks.strip() if isinstance(payload.remarks, str) else ""
    db.add(
        Notification(
            grievance_id=grievance.id,
            recipient_type="Command Center",
            channel="Email",
            message=(
                f"Ticket {grievance.ticket_id} verification changed to "
                f"{'Verified' if grievance.is_verified else 'Pending'} by Officer ID {officer.id}."
                + (f" Remarks: {verification_note}" if verification_note else "")
            ),
        )
    )
    if grievance.incident_id:
        incident = db.query(Incident).filter(Incident.id == grievance.incident_id).first()
        if incident is not None:
            append_incident_timeline(
                db=db,
                incident=incident,
                to_state=enum_value(grievance.status),
                actor_type="Officer",
                reason=verification_note or (
                    "Verification started" if grievance.is_verified else "Verification state updated"
                ),
            )
    if previous_status != enum_value(grievance.status):
        db.add(
            GrievanceLog(
                grievance_id=grievance.id,
                previous_status=previous_status,
                new_status=enum_value(grievance.status),
                remarks=verification_note or "Verification started",
                action_by_officer_id=officer.id,
            )
        )

    try:
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update verification status.",
        ) from exc

    return GrievanceVerificationResponse(
        ticket_id=grievance.ticket_id,
        previous_verification=previous_verification,
        is_verified=bool(grievance.is_verified),
        updated_by_officer_id=officer.id,
    )


@app.post("/api/grievances/{ticket_id}/resolve", response_model=GrievanceResolveResponse)
def resolve_grievance(
    ticket_id: str,
    payload: GrievanceResolveRequest,
    db: Session = Depends(get_db),
) -> GrievanceResolveResponse:
    resolution_notes = require_non_empty(payload.resolutionNotes, "resolutionNotes")
    validation_image_url = require_non_empty(payload.validationImageUrl, "validationImageUrl")

    grievance = db.query(Grievance).filter(Grievance.ticket_id == ticket_id).with_for_update().first()
    if grievance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grievance ticket not found.")

    previous_status = enum_value(grievance.status)
    if previous_status not in ACTIVE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ticket cannot be resolved from {previous_status} status.",
        )

    action_by_officer_id = payload.officerId or grievance.assigned_officer_id
    now = utc_now()
    grievance.status = "Verified Resolved"
    grievance.resolved_at = now
    grievance.resolution_notes = resolution_notes
    grievance.resolution_photo_url = validation_image_url
    evidence_id = None
    if grievance.incident_id:
        evidence = append_incident_evidence(
            db=db,
            incident_id=grievance.incident_id,
            source_name=grievance.department.name if grievance.department else "Department",
            uploaded_by=(
                grievance.assigned_officer.name
                if grievance.assigned_officer
                else "Assigned Department"
            ),
            image_url=validation_image_url,
            description=f"Resolution uploaded: {resolution_notes}",
            evidence_type="Resolution Photograph",
            verification_status="Verified",
            source_priority=90,
        )
        evidence_id = evidence.id
        incident = db.query(Incident).filter(Incident.id == grievance.incident_id).first()
        if incident is not None:
            append_incident_timeline(
                db=db,
                incident=incident,
                to_state="Verified Resolved",
                actor_type=grievance.department.name if grievance.department else "Department",
                reason=f"Resolution uploaded: {resolution_notes}",
                evidence_id=evidence_id,
            )

    log = GrievanceLog(
        grievance_id=grievance.id,
        previous_status=previous_status,
        new_status="Verified Resolved",
        remarks=resolution_notes,
        action_by_officer_id=action_by_officer_id,
    )

    try:
        db.add(log)
        db.commit()
        db.refresh(log)
        db.refresh(grievance)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve grievance ticket.",
        ) from exc

    return GrievanceResolveResponse(
        ticket_id=grievance.ticket_id,
        previous_status=previous_status,
        new_status=enum_value(grievance.status),
        resolved_at=grievance.resolved_at,
        log_id=log.id,
    )

@app.post("/api/grievances/{ticket_id}/veto", response_model=CitizenVetoResponse)
def file_citizen_veto(
    ticket_id: str,
    payload: CitizenVetoRequest,
    db: Session = Depends(get_db),
) -> CitizenVetoResponse:
    """Allow citizens to veto a resolved ticket with fresh ground evidence."""
    veto_remarks = require_non_empty(payload.veto_remarks, "veto_remarks")
    
    grievance = db.query(Grievance).filter(Grievance.ticket_id == ticket_id).with_for_update().first()
    if grievance is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grievance ticket not found.")

    if enum_value(grievance.status) != "Verified Resolved":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Citizen veto can only be filed on resolved tickets.",
        )

    citizen = db.query(Citizen).filter(Citizen.phone == "9999999999").first()
    
    previous_status = "Verified Resolved"
    now = utc_now()
    grievance.status = "Reopened via Citizen Veto"
    grievance.reopened_count = int(grievance.reopened_count or 0) + 1
    grievance.is_escalated_to_supervisor = True
    grievance.sla_due_date = now + timedelta(hours=24)
    evidence_id = None
    if grievance.incident_id and payload.evidence_photo_url:
        evidence = append_incident_evidence(
            db=db,
            incident_id=grievance.incident_id,
            source_name="Citizen",
            uploaded_by=grievance.citizen_name or "Citizen",
            image_url=payload.evidence_photo_url,
            description=f"Citizen veto evidence: {veto_remarks}",
            evidence_type="Citizen Veto Photograph",
            verification_status="Pending Verification",
            source_priority=40,
        )
        evidence_id = evidence.id
    if grievance.incident_id:
        incident = db.query(Incident).filter(Incident.id == grievance.incident_id).first()
        if incident is not None:
            append_incident_timeline(
                db=db,
                incident=incident,
                to_state="Reopened via Citizen Veto",
                actor_type="Citizen",
                reason=f"Citizen veto filed: {veto_remarks}",
                evidence_id=evidence_id,
            )

    veto_record = CitizenVeto(
        grievance_id=grievance.id,
        citizen_id=citizen.id if citizen else None,
        veto_remarks=veto_remarks,
        evidence_photo_url=payload.evidence_photo_url,
    )

    log = GrievanceLog(
        grievance_id=grievance.id,
        previous_status=previous_status,
        new_status="Reopened via Citizen Veto",
        remarks=f"Citizen veto filed: {veto_remarks}",
        action_by_officer_id=None,
    )

    try:
        db.add(veto_record)
        db.add(log)
        db.commit()
        db.refresh(grievance)
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to file citizen veto.",
        ) from exc

    return CitizenVetoResponse(
        ticket_id=grievance.ticket_id,
        previous_status=previous_status,
        new_status=enum_value(grievance.status),
        veto_id=veto_record.id,
    )

@app.get("/api/cultural-assets", response_model=List[CulturalAssetResponse])
def list_cultural_assets(db: Session = Depends(get_db)) -> List[CulturalAssetResponse]:
    """Fetch structured heritage content to fuel daily active user carousels."""
    assets = db.query(models.CulturalAsset).order_by(models.CulturalAsset.id.asc()).all()
    return [
        CulturalAssetResponse(
            id=str(asset.id),
            pillar_category=asset.pillar_category,
            title=asset.title,
            description=asset.description,
            specification=asset.specification,
            icon=asset.icon,
            image_url=asset.image_url,
            sub_items=asset.sub_items or [],
            created_at=asset.created_at,
        )
        for asset in assets
    ]

@app.get("/api/admin/executive-alerts")
def executive_alerts(db: Session = Depends(get_db)) -> Dict[str, Any]:
    promote_high_upvote_tickets(db)
    metric_row = db.query(
        func.count(Grievance.id).label("total_grievances"),
        func.count(Grievance.id).filter(Grievance.status.in_(ACTIVE_STATUSES)).label("active_pending"),
        func.count(Grievance.id).filter(Grievance.status == "Verified Resolved").label("verified_resolved"),
        func.count(Grievance.id).filter(Grievance.upvotes > UPVOTE_CRITICAL_THRESHOLD).label("high_upvote_emergencies"),
    ).one()

    district_rows = db.query(
        Grievance.district,
        func.count(Grievance.id).label("total"),
        func.count(Grievance.id).filter(Grievance.upvotes > UPVOTE_CRITICAL_THRESHOLD).label("high_upvote"),
        func.count(Grievance.id).filter(Grievance.terrain_risk == "Landslide Vulnerable Link").label("landslide"),
        func.count(Grievance.id).filter(Grievance.infrastructure_type == "Connecting Bailey Bridge").label("bailey_bridge"),
    ).group_by(Grievance.district).order_by(func.count(Grievance.id).desc()).all()

    alert_details = []
    high_risk_tickets = db.query(Grievance).filter(
        Grievance.status.in_(ACTIVE_STATUSES),
        ((Grievance.upvotes > UPVOTE_CRITICAL_THRESHOLD) | (Grievance.priority == "critical") | (Grievance.sla_due_date < func.now())),
    ).order_by(Grievance.upvotes.desc(), Grievance.sla_due_date.asc()).limit(8).all()

    for ticket in high_risk_tickets:
        alert_details.append({
            "type": "monsoon_infrastructure_escalation",
            "severity": enum_value(ticket.priority),
            "message": f"{ticket.district} / {ticket.block}: {ticket.title} has {ticket.upvotes} upvotes.",
            "ticket_id": ticket.ticket_id,
            "district": ticket.district,
            "block": ticket.block,
            "panchayat": ticket.panchayat,
            "upvotes": ticket.upvotes,
            "terrainRisk": ticket.terrain_risk,
            "infrastructureType": ticket.infrastructure_type,
            "compositeScore": calculate_composite_score(ticket),
        })

    return {
        "generated_at": utc_now(),
        "metrics": {
            "total_grievances": metric_row.total_grievances,
            "high_upvote_emergencies": metric_row.high_upvote_emergencies,
            "active_pending": metric_row.active_pending,
            "verified_resolved": metric_row.verified_resolved,
        },
        "district_load": [
            {"district": r.district, "total": int(r.total or 0), "high_upvote": int(r.high_upvote or 0), "landslide_or_bridge": int(r.landslide or 0) + int(r.bailey_bridge or 0)}
            for r in district_rows
        ],
        "alerts": [item["message"] for item in alert_details],
        "alert_details": alert_details,
    }


# Insert or ensure this block handles calculations correctly without uncommitted flushes:

def compute_multi_factor_status(rain: float, river: float, landslide: bool, debris: bool) -> tuple[str, str]:
    """Evaluates combined rainfall indices, river surges, and landslide vectors against composite alert thresholds."""
    r = float(rain)
    riv = float(river)
    
    if r > 100.0 or (r > 80.0 and riv > 2.0) or (r > 70.0 and landslide) or (r > 60.0 and debris):
        status = "Extreme Cloudburst" if r > 120.0 else "Cloudburst"
        return status, "Megh-Vipaat"
    
    if r > 80.0:
        return "Severe Rainfall", "Sankat"
    if r > 50.0:
        return "Heavy Rain", "Satark"
    if r > 25.0:
        return "Moderate Rain", "Satark"
    if r > 10.0:
        return "Light Rain", "Nazar"
    if landslide or debris or riv > 1.0:
        return "Moderate Rain", "Nazar"
        
    return "Normal", "Sthir"

@app.get("/api/telemetry/weather")
def get_weather_telemetry(db: Session = Depends(get_db)):
    stations = db.query(WeatherStation).all()
    payload = []
    for s in stations:
        # Calculate transient properties dynamically on the fly
        status, takri = compute_multi_factor_status(
            s.rainfall_1hr_mm, s.river_stage_m, s.landslide_sensor_triggered, s.debris_flow_detected
        )
        
        payload.append({
            "id": s.id,
            "station_name": s.station_name,
            "district": s.district,
            "elevation_m": s.elevation_m,
            "terrain_type": s.terrain_type,
            "current_season": s.current_season,
            "temp_envelope": f"{s.temp_night_floor}°C to {s.temp_day_ceiling}°C",
            "rainfall_1hr_mm": float(s.rainfall_1hr_mm),
            "temperature_c": float(s.temperature_c),
            "river_stage_m": float(s.river_stage_m),
            "landslide_sensor_triggered": s.landslide_sensor_triggered,
            "debris_flow_detected": s.debris_flow_detected,
            "dashboard_status": status,
            "takri_status_label": takri,
            "last_ping": s.last_ping.isoformat() if s.last_ping else None
        })
    return payload

@app.get("/api/telemetry/transit")
def get_transit_telemetry(db: Session = Depends(get_db)):
    return db.query(TransitRoute).order_by(TransitRoute.current_status.asc()).all()
