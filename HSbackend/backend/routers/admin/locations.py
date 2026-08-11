from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from domain import HIMACHAL_ADMIN_HIERARCHY
from models import District, Officer
from .dependencies import admin_actor

router = APIRouter()


def get_district(name: str, db: Session) -> District:
    district = db.query(District).filter(District.name == name).first()
    if district is None:
        raise HTTPException(status_code=404, detail="District not found")
    return district


def district_row(item: District) -> dict[str, Any]:
    hierarchy = HIMACHAL_ADMIN_HIERARCHY.get(item.name, {})
    return {
        "id": item.id,
        "name": item.name,
        "blocks": [{"name": block, "panchayats": panchayats} for block, panchayats in hierarchy.items()],
        "hierarchy": hierarchy,
    }


@router.get("/locations")
def list_locations(db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> list[dict[str, Any]]:
    return [district_row(item) for item in db.query(District).order_by(District.name.asc()).all()]


@router.post("/locations/districts", status_code=201)
def create_district(payload: dict[str, Any] = Body(default={}), db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    name = payload.get("name")
    if not name:
        raise HTTPException(status_code=422, detail="District name is required")
    if db.query(District).filter(District.name == name).first():
        raise HTTPException(status_code=409, detail="District already exists")
    item = District(name=name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return district_row(item)


@router.patch("/locations/districts/{district_name}")
def update_district(district_name: str, payload: dict[str, Any] = Body(default={}), db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    item = get_district(district_name, db)
    if payload.get("name") and payload["name"] != district_name:
        item.name = payload["name"]
    db.commit()
    return district_row(item)


@router.delete("/locations/districts/{district_name}")
def delete_district(district_name: str, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    item = get_district(district_name, db)
    if item.grievances:
        raise HTTPException(status_code=409, detail="District has complaint history and cannot be deleted")
    db.delete(item)
    db.commit()
    return {"name": district_name, "status": "deleted"}


@router.get("/locations/{district_name}")
def location_detail(district_name: str, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    return district_row(get_district(district_name, db))


@router.post("/locations/{district_name}/blocks")
def create_block(district_name: str, payload: dict[str, Any] = Body(default={}), db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    get_district(district_name, db)
    raise HTTPException(status_code=409, detail="Block and panchayat records are not persisted by the existing schema.")


@router.delete("/locations/{district_name}/blocks/{block_name}")
def delete_block(district_name: str, block_name: str, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    get_district(district_name, db)
    raise HTTPException(status_code=409, detail="Block and panchayat records are not persisted by the existing schema.")


@router.post("/locations/{district_name}/blocks/{block_name}/panchayats")
def create_panchayat(district_name: str, block_name: str, payload: dict[str, Any] = Body(default={}), db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    get_district(district_name, db)
    raise HTTPException(status_code=409, detail="Block and panchayat records are not persisted by the existing schema.")


@router.delete("/locations/{district_name}/blocks/{block_name}/panchayats/{panchayat_name}")
def delete_panchayat(district_name: str, block_name: str, panchayat_name: str, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    get_district(district_name, db)
    raise HTTPException(status_code=409, detail="Block and panchayat records are not persisted by the existing schema.")
