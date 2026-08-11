from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import CulturalAsset, Officer
from .dependencies import admin_actor
from .serializers import serialize_heritage

router = APIRouter()


def get_asset(asset_id: str, db: Session) -> CulturalAsset:
    asset = db.query(CulturalAsset).filter(CulturalAsset.id == asset_id).first()
    if asset is None:
        raise HTTPException(status_code=404, detail="Heritage card not found")
    return asset


@router.get("/heritage")
def list_heritage(db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> list[dict[str, Any]]:
    return [serialize_heritage(item) for item in db.query(CulturalAsset).order_by(CulturalAsset.id.asc()).all()]


@router.get("/heritage/categories")
def heritage_categories(db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> list[str]:
    return [row[0] for row in db.query(CulturalAsset.pillar_category).distinct().order_by(CulturalAsset.pillar_category.asc()).all()]


@router.get("/heritage/{asset_id}")
def heritage_detail(asset_id: str, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    return serialize_heritage(get_asset(asset_id, db))


@router.post("/heritage", status_code=201)
def create_heritage(payload: dict[str, Any] = Body(default={}), db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    if not payload.get("id") or not payload.get("title"):
        raise HTTPException(status_code=422, detail="id and title are required")
    item = CulturalAsset(
        id=str(payload["id"]),
        pillar_category=payload.get("pillar_category", payload.get("category", "General")),
        title=payload["title"],
        description=payload.get("description", ""),
        specification=payload.get("specification", payload.get("metadata", {}).get("specification", "")),
        icon=payload.get("icon", "Landmark"),
        image_url=payload.get("image_url") or (payload.get("images") or [None])[0],
        sub_items=payload.get("sub_items", []),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return serialize_heritage(item)


@router.put("/heritage/{asset_id}")
@router.patch("/heritage/{asset_id}")
def update_heritage(asset_id: str, payload: dict[str, Any] = Body(default={}), db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    item = get_asset(asset_id, db)
    for key in ("pillar_category", "title", "description", "specification", "icon", "image_url", "sub_items"):
        if key in payload:
            setattr(item, key, payload[key])
    metadata = payload.get("metadata") or {}
    if metadata.get("specification"):
        item.specification = metadata["specification"]
    if "category" in payload:
        item.pillar_category = payload["category"]
    if "images" in payload and payload["images"]:
        item.image_url = payload["images"][0]
    db.commit()
    db.refresh(item)
    return serialize_heritage(item)


@router.post("/heritage/{asset_id}/hide")
def hide_heritage(asset_id: str, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    get_asset(asset_id, db)
    raise HTTPException(
        status_code=409,
        detail="Heritage hide state has no representation in the existing CulturalAsset schema.",
    )


@router.post("/heritage/{asset_id}/feature")
def feature_heritage(asset_id: str, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    get_asset(asset_id, db)
    raise HTTPException(
        status_code=409,
        detail="Heritage feature state has no representation in the existing CulturalAsset schema.",
    )


@router.delete("/heritage/{asset_id}")
def delete_heritage(asset_id: str, db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    item = get_asset(asset_id, db)
    db.delete(item)
    db.commit()
    return {"id": asset_id, "status": "deleted"}


@router.post("/heritage/{asset_id}/images")
def add_heritage_image(asset_id: str, payload: dict[str, Any] = Body(default={}), db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, Any]:
    item = get_asset(asset_id, db)
    image_url = payload.get("image_url") or payload.get("url")
    if not image_url:
        raise HTTPException(status_code=422, detail="image_url is required")
    item.image_url = image_url
    db.commit()
    return serialize_heritage(item)
