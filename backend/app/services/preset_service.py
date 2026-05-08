from fastapi import HTTPException, status
from supabase import Client
from app.models.diagrams import PresetBlueprint

# In-memory cache — populated at app startup via load_presets()
_cache: list[PresetBlueprint] = []


def load_presets(db: Client) -> None:
    """Called once at startup. Loads all active presets into memory."""
    result = (
        db.table("presets")
        .select("*")
        .eq("is_active", True)
        .order("sort_order")
        .execute()
    )
    _cache.clear()
    for row in (result.data or []):
        _cache.append(PresetBlueprint.model_validate(row))


def list_presets() -> list[PresetBlueprint]:
    return _cache


def get_by_slug(slug: str) -> PresetBlueprint:
    for preset in _cache:
        if preset.slug == slug:
            return preset
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preset not found")
