from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import Client
from app.db.client import get_supabase_client
from app.core.security import verify_jwt, AuthUser

bearer_scheme = HTTPBearer(auto_error=False)


def get_supabase() -> Client:
    return get_supabase_client()


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    supabase: Annotated[Client, Depends(get_supabase)],
) -> AuthUser:
    """Require authentication — raises 401 if no valid token."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return verify_jwt(credentials.credentials, supabase)


def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    supabase: Annotated[Client, Depends(get_supabase)],
) -> AuthUser | None:
    """Optional authentication — returns None if no token, AuthUser if valid."""
    if not credentials:
        return None
    try:
        return verify_jwt(credentials.credentials, supabase)
    except HTTPException:
        return None


# Type aliases for injection
RequiredUser = Annotated[AuthUser, Depends(get_current_user)]
OptionalUser = Annotated[AuthUser | None, Depends(get_optional_user)]
SupabaseClient = Annotated[Client, Depends(get_supabase)]
