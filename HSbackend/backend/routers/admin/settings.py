import os
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Officer
from .dependencies import admin_actor

router = APIRouter()


@router.get("/settings")
def settings(db: Session = Depends(get_db), actor: Officer = Depends(admin_actor)) -> dict[str, Any]:
    return {
        "service": "HimSetu Unified Backend",
        "region": os.getenv("MUNICIPAL_REGION", "HIMACHAL_PRADESH"),
        "monsoon_command_state": os.getenv("MONSOON_COMMAND_STATE", "ACTIVE"),
        "uploads_prefix": "/uploads",
        "authenticated_as": actor.email,
        "role": "admin",
        "api_version": "v1",
    }


@router.get("/health")
def admin_health(db: Session = Depends(get_db), _admin: Officer = Depends(admin_actor)) -> dict[str, str]:
    return {"status": "ok", "service": "HimSetu Admin API namespace", "backend": "shared"}
