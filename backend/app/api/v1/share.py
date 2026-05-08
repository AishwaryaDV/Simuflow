from fastapi import APIRouter
from app.api.deps import RequiredUser, OptionalUser, SupabaseClient
from app.models.diagrams import DiagramResponse, ShareResponse, ForkResponse
from app.services import share_service

router = APIRouter(tags=["share"])


# ── Share management (owner only) ─────────────────────────────────────────────

@router.post("/api/v1/diagrams/{diagram_id}/share", response_model=ShareResponse)
async def generate_share(
    diagram_id: str,
    user: RequiredUser,
    db: SupabaseClient,
):
    return share_service.generate_share(diagram_id, user.user_id, db)


@router.delete("/api/v1/diagrams/{diagram_id}/share", status_code=204)
async def revoke_share(
    diagram_id: str,
    user: RequiredUser,
    db: SupabaseClient,
):
    share_service.revoke_share(diagram_id, user.user_id, db)


# ── Public shared diagram (no auth) ───────────────────────────────────────────

@router.get("/api/v1/shared/{token}", response_model=DiagramResponse)
async def get_shared_diagram(
    token: str,
    db: SupabaseClient,
):
    return share_service.get_by_token(token, db)


# ── Fork (requires auth) ───────────────────────────────────────────────────────

@router.post("/api/v1/shared/{token}/fork", response_model=ForkResponse, status_code=201)
async def fork_diagram(
    token: str,
    user: RequiredUser,
    db: SupabaseClient,
):
    return share_service.fork_diagram(token, user.user_id, db)
