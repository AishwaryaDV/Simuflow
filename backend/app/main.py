from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.health import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: warm preset cache (added in Phase 4)
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
