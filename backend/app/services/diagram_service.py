from fastapi import HTTPException, status
from supabase import Client
from app.models.diagrams import (
    DiagramResponse, DiagramSummary, DiagramListResponse,
    CreateDiagramRequest, UpdateDiagramRequest,
)
from app.models.topology import TopologySchema

PAGE_SIZE_DEFAULT = 20
PAGE_SIZE_MAX     = 100


def _to_summary(row: dict) -> DiagramSummary:
    return DiagramSummary.model_validate(row)


def _to_response(row: dict) -> DiagramResponse:
    return DiagramResponse.model_validate(row)


def create_diagram(
    user_id: str,
    body: CreateDiagramRequest,
    db: Client,
) -> DiagramResponse:
    payload = {
        "user_id":  user_id,
        "name":     body.name,
        "topology": body.topology.model_dump(by_alias=True, mode="json"),
    }
    result = db.table("diagrams").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create diagram")
    return _to_response(result.data[0])


def get_diagram(diagram_id: str, user_id: str, db: Client) -> DiagramResponse:
    result = (
        db.table("diagrams")
        .select("*")
        .eq("id", diagram_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagram not found")

    row = result.data[0]
    # Service role bypasses RLS — enforce ownership manually
    if row["user_id"] != user_id and not row["is_public"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagram not found")

    return _to_response(row)


def list_diagrams(
    user_id: str,
    db: Client,
    page: int = 1,
    page_size: int = PAGE_SIZE_DEFAULT,
) -> DiagramListResponse:
    page_size = min(page_size, PAGE_SIZE_MAX)
    offset    = (page - 1) * page_size

    count_result = (
        db.table("diagrams")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .execute()
    )
    total = count_result.count or 0

    result = (
        db.table("diagrams")
        .select("id, name, is_public, fork_count, created_at, updated_at")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .range(offset, offset + page_size - 1)
        .execute()
    )

    return DiagramListResponse(
        items=[_to_summary(r) for r in (result.data or [])],
        total=total,
        page=page,
        page_size=page_size,
    )


def update_diagram(
    diagram_id: str,
    user_id: str,
    body: UpdateDiagramRequest,
    db: Client,
) -> DiagramResponse:
    # Verify ownership first
    existing = (
        db.table("diagrams")
        .select("id, user_id")
        .eq("id", diagram_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagram not found")
    if existing.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagram not found")

    patch: dict = {}
    if body.name is not None:
        patch["name"] = body.name
    if body.topology is not None:
        patch["topology"] = body.topology.model_dump(by_alias=True, mode="json")

    if not patch:
        return get_diagram(diagram_id, user_id, db)

    result = (
        db.table("diagrams")
        .update(patch)
        .eq("id", diagram_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Update failed")
    return _to_response(result.data[0])


def delete_diagram(diagram_id: str, user_id: str, db: Client) -> bool:
    existing = (
        db.table("diagrams")
        .select("id, user_id")
        .eq("id", diagram_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagram not found")
    if existing.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagram not found")

    db.table("diagrams").delete().eq("id", diagram_id).execute()
    return True
