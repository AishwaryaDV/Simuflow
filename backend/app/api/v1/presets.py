from fastapi import APIRouter
from app.models.diagrams import PresetBlueprint
from app.services import preset_service

router = APIRouter(prefix="/api/v1/presets", tags=["presets"])


@router.get("", response_model=list[PresetBlueprint])
async def list_presets():
    return preset_service.list_presets()


@router.get("/{slug}", response_model=PresetBlueprint)
async def get_preset(slug: str):
    return preset_service.get_by_slug(slug)
