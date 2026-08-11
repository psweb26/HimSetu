"""Admin-only route namespace backed by the same HimSetu tables and services."""

from fastapi import APIRouter

from .community import router as community_router
from .complaints import router as complaints_router
from .dashboard import router as dashboard_router
from .heritage import router as heritage_router
from .locations import router as locations_router
from .media import router as media_router
from .operations import router as operations_router
from .settings import router as settings_router
from .users import router as users_router

router = APIRouter(prefix="/api/admin", tags=["admin"])
router.include_router(dashboard_router)
router.include_router(complaints_router)
router.include_router(community_router)
router.include_router(users_router)
router.include_router(operations_router)
router.include_router(heritage_router)
router.include_router(locations_router)
router.include_router(media_router)
router.include_router(settings_router)
