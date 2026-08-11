from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Asset, Officer, TransitRoute, WeatherStation
from .dependencies import admin_actor
from .dashboard import transit_row, weather_row

router = APIRouter()

WEATHER_RESOURCES = {"weather-nodes", "rainfall", "river-levels", "temperature", "weather-alerts"}
TRANSIT_RESOURCES = {"bus-routes", "route-closures"}
ASSET_RESOURCES = {"roads", "bridges", "infrastructure-advisories"}


def resource_kind(resource: str) -> str:
    if resource in WEATHER_RESOURCES:
        return "weather"
    if resource in TRANSIT_RESOURCES:
        return "transit"
    if resource in ASSET_RESOURCES:
        return "asset"
    raise HTTPException(status_code=404, detail="Unknown operations resource")


def asset_row(item: Asset) -> dict[str, Any]:
    return {
        "id": item.id,
        "asset_type": item.asset_type,
        "name": item.name,
        "district": item.district,
        "lat": item.lat,
        "lon": item.lon,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@router.get("/operations/{resource}")
def list_operations(resource: str, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> list[dict[str, Any]]:
    kind = resource_kind(resource)
    if kind == "weather":
        return [weather_row(item) for item in db.query(WeatherStation).order_by(WeatherStation.district.asc()).all()]
    if kind == "transit":
        return [transit_row(item) for item in db.query(TransitRoute).order_by(TransitRoute.route_name.asc()).all()]
    type_name = {"roads": "Road", "bridges": "Bridge", "infrastructure-advisories": "Infrastructure Advisory", "weather-alerts": "Weather Alert"}.get(resource)
    query = db.query(Asset)
    if type_name:
        query = query.filter(Asset.asset_type == type_name)
    return [asset_row(item) for item in query.order_by(Asset.name.asc()).all()]


@router.get("/operations/{resource}/{record_id}")
def get_operation(resource: str, record_id: int, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    kind = resource_kind(resource)
    if kind == "weather":
        item = db.query(WeatherStation).filter(WeatherStation.id == record_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Weather node not found")
        return weather_row(item)
    if kind == "transit":
        item = db.query(TransitRoute).filter(TransitRoute.id == record_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Route not found")
        return transit_row(item)
    item = db.query(Asset).filter(Asset.id == record_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Infrastructure record not found")
    return asset_row(item)


@router.post("/operations/{resource}", status_code=201)
def create_operation(resource: str, payload: dict[str, Any] = Body(default={}), db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    kind = resource_kind(resource)
    if kind == "weather":
        item = WeatherStation(
            station_name=payload.get("station_name") or payload.get("name") or "Weather Node",
            district=payload.get("district", "Shimla"),
            elevation_m=int(payload.get("elevation_m", 0)),
            terrain_type=payload.get("terrain_type", "Mountain"),
            current_season=payload.get("current_season", "Monsoon"),
            rainfall_1hr_mm=Decimal(str(payload.get("rainfall_1hr_mm", 0))),
            river_stage_m=Decimal(str(payload.get("river_stage_m", 0))),
            temperature_c=Decimal(str(payload.get("temperature_c", 15))),
            landslide_sensor_triggered=bool(payload.get("landslide_sensor_triggered", False)),
            debris_flow_detected=bool(payload.get("debris_flow_detected", False)),
            last_ping=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return weather_row(item)
    if kind == "transit":
        item = TransitRoute(
            route_name=payload.get("route_name") or payload.get("name") or "New Route",
            origin=payload.get("origin", ""),
            destination=payload.get("destination", ""),
            key_hazard_zone=payload.get("key_hazard_zone", ""),
            hazard_profile=payload.get("hazard_profile", ""),
            current_status=payload.get("current_status", "Operational"),
            relay_state=payload.get("relay_state", "Jagrit"),
            roznamcha_remarks=payload.get("roznamcha_remarks"),
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return transit_row(item)
    default_type = {"roads": "Road", "bridges": "Bridge", "infrastructure-advisories": "Infrastructure Advisory", "weather-alerts": "Weather Alert"}[resource]
    item = Asset(
        asset_type=payload.get("asset_type", default_type),
        name=payload.get("name", "Infrastructure Record"),
        district=payload.get("district", "Shimla"),
        lat=payload.get("lat"),
        lon=payload.get("lon"),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return asset_row(item)


@router.put("/operations/{resource}/{record_id}")
@router.patch("/operations/{resource}/{record_id}")
def update_operation(resource: str, record_id: int, payload: dict[str, Any] = Body(default={}), db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    kind = resource_kind(resource)
    if kind == "weather":
        item = db.query(WeatherStation).filter(WeatherStation.id == record_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Weather node not found")
        for key in ("station_name", "district", "elevation_m", "terrain_type", "current_season", "rainfall_1hr_mm", "river_stage_m", "temperature_c", "landslide_sensor_triggered", "debris_flow_detected"):
            if key in payload:
                setattr(item, key, payload[key])
        db.commit()
        db.refresh(item)
        return weather_row(item)
    if kind == "transit":
        item = db.query(TransitRoute).filter(TransitRoute.id == record_id).first()
        if not item:
            raise HTTPException(status_code=404, detail="Route not found")
        for key in ("route_name", "origin", "destination", "key_hazard_zone", "hazard_profile", "current_status", "relay_state", "roznamcha_remarks"):
            if key in payload:
                setattr(item, key, payload[key])
        item.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()
        db.refresh(item)
        return transit_row(item)
    item = db.query(Asset).filter(Asset.id == record_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Infrastructure record not found")
    for key in ("asset_type", "name", "district", "lat", "lon"):
        if key in payload:
            setattr(item, key, payload[key])
    db.commit()
    db.refresh(item)
    return asset_row(item)


@router.delete("/operations/{resource}/{record_id}")
def delete_operation(resource: str, record_id: int, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    kind = resource_kind(resource)
    model = WeatherStation if kind == "weather" else TransitRoute if kind == "transit" else Asset
    item = db.query(model).filter(model.id == record_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Operations record not found")
    db.delete(item)
    db.commit()
    return {"id": record_id, "resource": resource, "status": "deleted"}
