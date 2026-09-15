"""
Authentication and User Profile Router for ORCA Marine AI.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field

from app.models.user_models import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UpdateProfileRequest,
    UserProfile,
    UserRole,
)
from app.services.auth import auth_service, decode_token
from app.services.auth.auth_service import session_is_active

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Management"])


class GoogleLoginRequest(BaseModel):
    google_token: str = Field(..., min_length=20, description="OAuth ID token from Google")
    preferred_language: Optional[str] = Field(default="en", description="Default language preference")


def get_current_user_from_header(authorization: Optional[str] = Header(None)) -> UserProfile:
    """Helper dependency extracting user profile from Bearer JWT header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Bearer authorization header.",
        )
    token = authorization.split("Bearer ")[1].strip()
    payload = decode_token(token)
    if not payload or "sub" not in payload or not session_is_active(payload):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        )
    user = auth_service.get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists.",
        )
    return user


def get_optional_current_user(authorization: Optional[str] = Header(None)) -> Optional[UserProfile]:
    """Return the authenticated user when a bearer token is supplied."""
    if not authorization:
        return None
    return get_current_user_from_header(authorization)


def require_roles(*allowed_roles: UserRole):
    """FastAPI dependency enforcing server-side RBAC from the verified JWT user."""
    def dependency(user: UserProfile = Depends(get_current_user_from_header)) -> UserProfile:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions.")
        return user
    return dependency


@router.post("/register", response_model=AuthResponse)
def register_user(request: RegisterRequest):
    """
    Registers a new fisherman, coastal resident, government official, or administrator.
    """
    try:
        profile, token = auth_service.register(request)
        return AuthResponse(access_token=token, user=profile)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.post("/login", response_model=AuthResponse)
def login_user(request: LoginRequest):
    """
    Authenticates user via email/mobile number and password.
    """
    try:
        profile, token = auth_service.login(request.email_or_phone, request.password)
        return AuthResponse(access_token=token, user=profile)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(err))


@router.post("/google", response_model=AuthResponse)
def login_with_google(request: GoogleLoginRequest):
    """
    Handles Google OAuth sign-in / registration for mobile & web.
    """
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Google sign-in is disabled until server-side ID-token verification is configured.",
    )


# User profile routes mounted at /api/user
user_router = APIRouter(prefix="/api/user", tags=["User Profile"])


@user_router.get("/profile", response_model=UserProfile)
def get_user_profile(authorization: Optional[str] = Header(None)):
    """
    Retrieves the authenticated user's profile.
    """
    return get_current_user_from_header(authorization)


@user_router.patch("/profile", response_model=UserProfile)
def update_user_profile(
    request: UpdateProfileRequest,
    authorization: Optional[str] = Header(None),
):
    """
    Updates language preference, notification permissions, or display name.
    """
    user = get_current_user_from_header(authorization)
    updated = auth_service.update_profile(
        user_id=user.id,
        name=request.name,
        preferred_language=request.preferred_language,
        location_permission_status=request.location_permission_status,
        location_sharing_enabled=request.location_sharing_enabled,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Profile update failed")
    return updated


@router.get("/sessions")
def list_sessions(user: UserProfile = Depends(get_current_user_from_header), authorization: str = Header(...)):
    from datetime import datetime, timezone
    from app.db.models import DeviceSession
    from app.db.session import get_db_context
    current = decode_token(authorization.removeprefix("Bearer ").strip())["jti"]
    with get_db_context() as db:
        rows = db.query(DeviceSession).filter(DeviceSession.user_id == user.id,
            DeviceSession.revoked_at.is_(None), DeviceSession.expires_at > datetime.now(timezone.utc)).all()
        return [{"id": row.id, "device_name": row.device_name or "Unknown Device",
                 "user_agent": row.user_agent, "ip_address": row.ip_address,
                 "created_at": row.created_at, "last_seen_at": row.last_seen_at,
                 "expires_at": row.expires_at, "current": row.id == current} for row in rows]


def revoke_sessions(user_id: str, session_id: Optional[str] = None):
    from datetime import datetime, timezone
    from app.db.models import DeviceSession
    from app.db.session import get_db_context
    with get_db_context() as db:
        query = db.query(DeviceSession).filter(DeviceSession.user_id == user_id)
        if session_id is not None:
            query = query.filter(DeviceSession.id == session_id)
        if not query.update({DeviceSession.revoked_at: datetime.now(timezone.utc)}, synchronize_session=False):
            raise HTTPException(status_code=404, detail="Session not found.")
    return {"revoked": True}


@router.post("/logout")
def logout(user: UserProfile = Depends(get_current_user_from_header), authorization: str = Header(...)):
    payload = decode_token(authorization.removeprefix("Bearer ").strip())
    return revoke_sessions(user.id, payload["jti"])


@router.delete("/sessions")
def revoke_all_sessions(user: UserProfile = Depends(get_current_user_from_header)):
    return revoke_sessions(user.id)


@router.delete("/sessions/{session_id}")
def revoke_session(session_id: str, user: UserProfile = Depends(get_current_user_from_header)):
    return revoke_sessions(user.id, session_id)
