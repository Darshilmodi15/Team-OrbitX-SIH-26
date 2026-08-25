"""
Authentication and User Profile Router for ORCA Marine AI.
"""
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, status
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

router = APIRouter(prefix="/api/auth", tags=["Authentication & User Management"])


class GoogleLoginRequest(BaseModel):
    google_token: Optional[str] = Field(default=None, description="OAuth ID token from Google")
    email: str = Field(..., description="Google email address")
    name: str = Field(..., description="Google user profile name")
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
    if not payload or "sub" not in payload:
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
    try:
        # Check if already registered
        try:
            profile, token = auth_service.login(request.email, "google_oauth_bypass")
            return AuthResponse(access_token=token, user=profile)
        except ValueError:
            # Register on first Google OAuth login
            reg_req = RegisterRequest(
                name=request.name,
                email=request.email,
                password="google_oauth_secure_" + request.email,
                preferred_language=request.preferred_language or "en",
                role=UserRole.USER,
            )
            profile, token = auth_service.register(reg_req)
            return AuthResponse(access_token=token, user=profile)
    except Exception as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Google auth failed: {err}")


# User profile routes mounted at /api/user
user_router = APIRouter(prefix="/api/user", tags=["User Profile"])


@user_router.get("/profile", response_model=UserProfile)
def get_user_profile(authorization: Optional[str] = Header(None)):
    """
    Retrieves profile for authenticated user or default demo account if unauthenticated.
    """
    if authorization and authorization.startswith("Bearer "):
        return get_current_user_from_header(authorization)
    # Default fallback demo user for testing without token
    demo_user = auth_service.get_user_by_id(list(auth_service._users.keys())[0])
    if demo_user:
        return demo_user
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


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
