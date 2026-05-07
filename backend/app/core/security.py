from pydantic import BaseModel
from supabase import Client
from fastapi import HTTPException, status


class AuthUser(BaseModel):
    user_id: str
    email: str | None = None


def verify_jwt(token: str, supabase: Client) -> AuthUser:
    """
    Validates token against Supabase's live keys.
    Never decode manually — supabase.auth.get_user handles revocation correctly.
    """
    try:
        response = supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
            )
        return AuthUser(
            user_id=response.user.id,
            email=response.user.email,
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
