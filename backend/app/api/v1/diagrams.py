from fastapi import APIRouter, Query
from app.api.deps import RequiredUser, SupabaseClient
from app.models.diagrams import (
    DiagramResponse, DiagramListResponse,
    CreateDiagramRequest, UpdateDiagramRequest,
)
from app.services import diagram_service

router = APIRouter(prefix="/api/v1/diagrams", tags=["diagrams"])


@router.get("", response_model=DiagramListResponse)
async def list_diagrams(
    user: RequiredUser,
    db: SupabaseClient,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    return diagram_service.list_diagrams(user.user_id, db, page, page_size)


@router.post("", response_model=DiagramResponse, status_code=201)
async def create_diagram(
    body: CreateDiagramRequest,
    user: RequiredUser,
    db: SupabaseClient,
):
    return diagram_service.create_diagram(user.user_id, body, db)


@router.get("/{diagram_id}", response_model=DiagramResponse)
async def get_diagram(
    diagram_id: str,
    user: RequiredUser,
    db: SupabaseClient,
):
    return diagram_service.get_diagram(diagram_id, user.user_id, db)


@router.put("/{diagram_id}", response_model=DiagramResponse)
async def update_diagram(
    diagram_id: str,
    body: UpdateDiagramRequest,
    user: RequiredUser,
    db: SupabaseClient,
):
    return diagram_service.update_diagram(diagram_id, user.user_id, body, db)


@router.delete("/{diagram_id}", status_code=204)
async def delete_diagram(
    diagram_id: str,
    user: RequiredUser,
    db: SupabaseClient,
):
    diagram_service.delete_diagram(diagram_id, user.user_id, db)
