import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.health import router as health_router
from app.api.v1.diagrams import router as diagrams_router
from app.api.v1.share import router as share_router
from app.api.v1.presets import router as presets_router
from app.services import preset_service
from app.db.client import get_supabase_client

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # A transient Supabase outage at boot must not take the whole API down —
    # presets just come up empty until the next restart.
    try:
        preset_service.load_presets(get_supabase_client())
        if not preset_service.list_presets():
            logger.warning("No active presets loaded — is the presets migration applied?")
    except Exception:
        logger.exception("Failed to load presets at startup; /api/v1/presets will be empty")
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="SimuFlow API",
    version="1.0.0",
    docs_url="/docs" if settings.env != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    allow_credentials=True,
)

app.include_router(health_router, tags=["health"])
app.include_router(diagrams_router)
app.include_router(share_router)
app.include_router(presets_router)
