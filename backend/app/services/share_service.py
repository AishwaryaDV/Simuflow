import secrets
from fastapi import HTTPException, status
from supabase import Client
from app.models.diagrams import DiagramResponse, ShareResponse, ForkResponse
from app.core.config import settings


def generate_share(diagram_id: str, user_id: str, db: Client) -> ShareResponse:
    existing = (
        db.table("diagrams")
        .select("id, user_id, share_token")
        .eq("id", diagram_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagram not found")
    if existing.data[0]["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diagram not found")

    # Reuse existing token if already shared
    token = existing.data[0]["share_token"] or secrets.token_urlsafe(16)

    db.table("diagrams").update({
        "share_token": token,
        "is_public": True,
    }).eq("id", diagram_id).execute()

    return ShareResponse(
        share_token=token,
        share_url=f"{settings.frontend_url}/shared/{token}",
        is_public=True,
    )


def revoke_share(diagram_id: str, user_id: str, db: Client) -> bool:
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

    db.table("diagrams").update({
        "share_token": None,
        "is_public": False,
    }).eq("id", diagram_id).execute()
    return True


def get_by_token(token: str, db: Client) -> DiagramResponse:
    result = (
        db.table("diagrams")
        .select("*")
        .eq("share_token", token)
        .eq("is_public", True)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared diagram not found")
    return DiagramResponse.model_validate(result.data[0])


def fork_diagram(token: str, user_id: str, db: Client) -> ForkResponse:
    # Read the public diagram
    result = (
        db.table("diagrams")
        .select("*")
        .eq("share_token", token)
        .eq("is_public", True)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared diagram not found")

    source = result.data[0]
    forked_name = f"{source['name']} (fork)"

    # Insert copy into the requesting user's account
    new_row = db.table("diagrams").insert({
        "user_id":  user_id,
        "name":     forked_name,
        "topology": source["topology"],
    }).execute()

    if not new_row.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Fork failed")

    # Increment fork_count on the original
    db.table("diagrams").update({
        "fork_count": source["fork_count"] + 1,
    }).eq("id", source["id"]).execute()

    return ForkResponse(
        diagram_id=new_row.data[0]["id"],
        name=forked_name,
    )
