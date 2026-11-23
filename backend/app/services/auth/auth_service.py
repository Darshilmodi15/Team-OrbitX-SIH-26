"""
Authentication and Role-Based Access Control (RBAC) Service for ORCA.

Supports:
- User registration (Email/Phone + Password + Role) with password salt + hashing
- User login & Bearer JWT token generation
- Role verification (USER, GOVERNMENT, SUPER_ADMIN)
- Synchronized database persistence (PostgreSQL/SQLite) with in-memory caching
"""
import hashlib
import hmac
import json
import logging
import os
import base64
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.models.user_models import RegisterRequest, UserProfile, UserRole

logger = logging.getLogger(__name__)

ENVIRONMENT = (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT", "development")).lower()
JWT_SECRET = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET") or os.getenv("ORCA_JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRY_SECONDS = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")) * 60

if JWT_ALGORITHM != "HS256":
    raise RuntimeError("ORCA currently supports JWT_ALGORITHM=HS256 only.")
if not JWT_SECRET:
    if ENVIRONMENT in {"production", "prod"}:
        raise RuntimeError("JWT_SECRET_KEY is required in production.")
    JWT_SECRET = "development-only-change-me"
    logger.warning("JWT_SECRET_KEY is not set; using a development-only secret.")


import bcrypt


def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    """
    Hashes password using Bcrypt with 12 adaptive work factor rounds.
    Returns (bcrypt_hash_str, salt_str).
    """
    pwd_bytes = password.encode("utf-8")
    if salt:
        try:
            salt_bytes = salt.encode("utf-8")
        except Exception:
            salt_bytes = bcrypt.gensalt(rounds=12)
    else:
        salt_bytes = bcrypt.gensalt(rounds=12)

    hashed = bcrypt.hashpw(pwd_bytes, salt_bytes)
    return hashed.decode("utf-8"), salt_bytes.decode("utf-8")


def verify_password(password: str, hashed: str, salt: str) -> bool:
    """
    Verifies candidate password against stored Bcrypt hash with legacy SHA-256 fallback.
    """
    try:
        pwd_bytes = password.encode("utf-8")
        hashed_bytes = hashed.encode("utf-8")
        if hashed.startswith("$2b$") or hashed.startswith("$2a$") or hashed.startswith("$2y$"):
            return bcrypt.checkpw(pwd_bytes, hashed_bytes)
        
        # Legacy fallback if existing SHA-256 hash was stored
        legacy_hash = hashlib.sha256((password + salt).encode("utf-8")).hexdigest()
        return hmac.compare_digest(legacy_hash, hashed)
    except Exception:
        return False


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_token(user_id: str, role: str, email_or_phone: str = "", user_agent: str = "", ip_address: str = "") -> str:
    """Generate a standards-compliant, minimal HS256 JWT."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "role": role,
        "exp": int(time.time()) + JWT_EXPIRY_SECONDS,
        "iat": int(time.time()),
        "jti": str(uuid.uuid4()),
    }
    header_b64 = _b64url(json.dumps(header, separators=(",", ":")).encode())
    payload_b64 = _b64url(json.dumps(payload, separators=(",", ":")).encode())
    signing_input = f"{header_b64}.{payload_b64}".encode()
    signature = _b64url(hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest())
    from app.db.models import DeviceSession
    from app.db.session import get_db_context
    # Derive a friendly device name from User-Agent
    device_name = ""
    if user_agent:
        ua_lower = user_agent.lower()
        if "iphone" in ua_lower or "ipad" in ua_lower:
            device_name = "iOS Device"
        elif "android" in ua_lower:
            device_name = "Android Device"
        elif "windows" in ua_lower:
            device_name = "Windows Browser"
        elif "macintosh" in ua_lower or "mac os" in ua_lower:
            device_name = "macOS Browser"
        elif "linux" in ua_lower:
            device_name = "Linux Browser"
        else:
            device_name = "Web Browser"
    now_utc = datetime.fromtimestamp(payload["iat"], timezone.utc)
    with get_db_context() as db:
        db.add(DeviceSession(id=payload["jti"], user_id=user_id,
            user_agent=user_agent[:512] if user_agent else None,
            device_name=device_name or None,
            ip_address=ip_address[:45] if ip_address else None,
            created_at=now_utc,
            last_seen_at=now_utc,
            expires_at=datetime.fromtimestamp(payload["exp"], timezone.utc)))
    return f"{header_b64}.{payload_b64}.{signature}"


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates token signature and expiry."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        signing_input = f"{parts[0]}.{parts[1]}".encode()
        expected_sig = _b64url(hmac.new(JWT_SECRET.encode(), signing_input, hashlib.sha256).digest())
        if not hmac.compare_digest(parts[2], expected_sig):
            return None
        header = json.loads(_b64url_decode(parts[0]))
        if header.get("alg") != JWT_ALGORITHM:
            return None
        payload = json.loads(_b64url_decode(parts[1]))
        if payload.get("exp", 0) < time.time():
            return None  # Expired
        return payload
    except Exception as err:
        logger.debug(f"Token decode failure: {err}")
        return None


def session_is_active(payload: Dict[str, Any]) -> bool:
    jti = payload.get("jti")
    if not jti:
        return False
    try:
        from app.db.models import DeviceSession
        from app.db.session import get_db_context
        with get_db_context() as db:
            session = db.get(DeviceSession, jti)
            if not session:
                return False
            if session.user_id != payload.get("sub"):
                return False
            if session.revoked_at is not None:
                return False
            expires_at = session.expires_at
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            return expires_at > datetime.now(timezone.utc)
    except Exception as err:
        logger.warning("DeviceSession verification unavailable: %s", type(err).__name__)
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="AUTH_STORAGE_UNAVAILABLE") from err


class AuthService:
    """Authentication and User Profile Management Service with DB backing."""

    def __init__(self):
        # In-memory dictionary: user_id -> user_data
        self._users: Dict[str, Dict[str, Any]] = {}
        self._lookup: Dict[str, str] = {}  # email/phone -> user_id
        self._seed_default_accounts()

    @staticmethod
    def _runtime_environment() -> str:
        return (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or ENVIRONMENT or "development").lower()

    def _seed_default_accounts(self):
        """Pre-seeds accounts for demonstration & role verification."""
        if self._runtime_environment() in {"production", "prod"}:
            return
        demo_accounts = [
            {
                "id": "USR-DEMO-01",
                "name": "Captain Ramesh Koli",
                "email": "fisherman@orca.marine",
                "phone": "9876543210",
                "password": "password123",
                "role": UserRole.USER,
                "preferred_language": "gu",
            },
            {
                "id": "USR-DEMO-02",
                "name": "Officer Priya Sharma (Fisheries Dept)",
                "email": "officer@fisheries.gov.in",
                "phone": "9123456780",
                "password": "govpassword123",
                "role": UserRole.GOVERNMENT,
                "preferred_language": "hi",
            },
            {
                "id": "USR-DEMO-03",
                "name": "Super Admin OrbitX",
                "email": "admin@orca.marine",
                "phone": "9999999999",
                "password": "adminpassword123",
                "role": UserRole.SUPER_ADMIN,
                "preferred_language": "en",
            },
        ]

        for acc in demo_accounts:
            user_id = acc.get("id") or str(uuid.uuid4())
            pwd_hash, salt = hash_password(acc["password"])
            now_iso = datetime.now(timezone.utc).isoformat()
            
            user_data = {
                "id": user_id,
                "name": acc["name"],
                "email": acc["email"],
                "mobile_number": acc["phone"],
                "password_hash": pwd_hash,
                "password_salt": salt,
                "preferred_language": acc["preferred_language"],
                "role": acc["role"],
                "location_permission_status": "granted",
                "location_sharing_enabled": True,
                "created_at": now_iso,
                "last_login": now_iso,
            }
            self._users[user_id] = user_data
            self._lookup[acc["email"].lower()] = user_id
            self._lookup[acc["phone"]] = user_id

    def register(self, req: RegisterRequest, user_agent: str = "", ip_address: str = "") -> Tuple[UserProfile, str]:
        """Registers a new user and issues access token."""
        from fastapi import HTTPException
        from sqlalchemy.exc import IntegrityError
        email_norm = req.email.strip().lower() if req.email else None
        phone_norm = req.mobile_number.strip() if req.mobile_number else None

        # Check uniqueness in-memory for non-production demo accounts
        if self._runtime_environment() not in {"production", "prod"}:
            if email_norm and email_norm in self._lookup:
                raise ValueError(f"Email '{email_norm}' is already registered.")
            if phone_norm and phone_norm in self._lookup:
                raise ValueError(f"Mobile number '{phone_norm}' is already registered.")

        # Check DB uniqueness
        try:
            from app.db.session import get_db_context
            from app.repositories import UserRepository
            with get_db_context() as db:
                if email_norm and UserRepository.get_by_email(db, email_norm):
                    raise ValueError(f"Email '{email_norm}' is already registered.")
                if phone_norm and UserRepository.get_by_phone(db, phone_norm):
                    raise ValueError(f"Mobile number '{phone_norm}' is already registered.")
        except ValueError:
            raise
        except Exception as e:
            logger.warning("Account uniqueness check failed: %s", type(e).__name__)
            raise HTTPException(status_code=503, detail="ACCOUNT_STORAGE_UNAVAILABLE")

        user_id = str(uuid.uuid4())
        pwd_hash, salt = hash_password(req.password)
        now_iso = datetime.now(timezone.utc).isoformat()
        # Public registration can never grant a privileged role.
        role_val = UserRole.USER

        user_data = {
            "id": user_id,
            "name": req.name.strip(),
            "email": email_norm,
            "mobile_number": phone_norm,
            "password_hash": pwd_hash,
            "password_salt": salt,
            "preferred_language": req.preferred_language or "en",
            "role": role_val,
            "location_permission_status": "prompt",
            "location_sharing_enabled": True,
            "created_at": now_iso,
            "last_login": now_iso,
        }

        # Persist to database
        try:
            from app.db.session import get_db_context
            from app.repositories import UserRepository
            with get_db_context() as db:
                db_user = UserRepository.create_user(
                    db=db,
                    name=user_data["name"],
                    password_hash=pwd_hash,
                    password_salt=salt,
                    email=email_norm,
                    mobile_number=phone_norm,
                    preferred_language=req.preferred_language or "en",
                    role=role_val.value,
                )
                user_id = db_user.id
                user_data["id"] = user_id
        except IntegrityError as e:
            logger.info("Duplicate registration rejected by DB constraint: %s", type(e).__name__)
            raise ValueError("An account with this email or mobile number is already registered.")
        except Exception as e:
            logger.warning("Account persistence failed: %s", type(e).__name__)
            raise HTTPException(status_code=503, detail="ACCOUNT_STORAGE_UNAVAILABLE")

        self._users[user_id] = user_data
        if email_norm:
            self._lookup[email_norm] = user_id
        if phone_norm:
            self._lookup[phone_norm] = user_id

        identity = email_norm or phone_norm or user_id
        token = create_token(user_id, user_data["role"].value, identity, user_agent=user_agent, ip_address=ip_address)
        profile = self._to_profile(user_data)
        return profile, token

    def login(self, email_or_phone: str, password: str, user_agent: str = "", ip_address: str = "") -> Tuple[UserProfile, str]:
        """Authenticates user credentials and issues token."""
        from fastapi import HTTPException
        ident = email_or_phone.strip()
        key = ident.lower()
        db_user = None
        user_data: Optional[Dict[str, Any]] = None

        try:
            from app.db.session import get_db_context
            from app.repositories import UserRepository
            with get_db_context() as db:
                db_user = UserRepository.get_by_identifier(db, ident)
                if db_user:
                    if not db_user.is_active:
                        raise HTTPException(status_code=403, detail="This account is disabled.")
                    if not verify_password(password, db_user.password_hash, db_user.password_salt):
                        raise ValueError("Invalid email/phone or password.")
                    now_utc = datetime.now(timezone.utc)
                    db_user.last_login = now_utc
                    user_data = {
                        "id": db_user.id,
                        "name": db_user.name,
                        "email": db_user.email,
                        "mobile_number": db_user.mobile_number,
                        "password_hash": db_user.password_hash,
                        "password_salt": db_user.password_salt,
                        "preferred_language": db_user.preferred_language,
                        "role": UserRole(db_user.role),
                        "operational_region": db_user.government_profile.jurisdiction_region if db_user.government_profile else None,
                        "location_permission_status": db_user.location_permission_status,
                        "location_sharing_enabled": db_user.location_sharing_enabled,
                        "vessel_class": db_user.preferences.vessel_class if db_user.preferences else None,
                        "created_at": db_user.created_at.isoformat() if db_user.created_at else now_utc.isoformat(),
                        "last_login": now_utc.isoformat(),
                    }
        except (HTTPException, ValueError):
            raise
        except Exception as e:
            logger.warning("DB lookup during login failed: %s", type(e).__name__)
            raise HTTPException(status_code=503, detail="AUTH_STORAGE_UNAVAILABLE") from e

        if user_data is None:
            # Development/test demo accounts may exist only in memory.
            if self._runtime_environment() not in {"production", "prod"}:
                demo_uid = self._lookup.get(key) or self._lookup.get(ident)
                if demo_uid and demo_uid.startswith("USR-DEMO-") and demo_uid in self._users:
                    demo_data = dict(self._users[demo_uid])
                    if not verify_password(password, demo_data["password_hash"], demo_data["password_salt"]):
                        raise ValueError("Invalid email/phone or password.")
                    demo_data["last_login"] = datetime.now(timezone.utc).isoformat()
                    self._users[demo_uid] = demo_data
                    user_data = demo_data
            if user_data is None:
                raise ValueError("Invalid email/phone or password.")
        else:
            uid = user_data["id"]
            self._users[uid] = user_data
            if user_data.get("email"):
                self._lookup[user_data["email"].lower()] = uid
            if user_data.get("mobile_number"):
                self._lookup[user_data["mobile_number"]] = uid

        token = create_token(
            user_data["id"],
            user_data["role"].value,
            ident,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        profile = self._to_profile(user_data)
        return profile, token

    def login_or_register_google(
        self, subject: str, email: str, name: str,
        authoritative_email: bool, preferred_language: str = "en",
        user_agent: str = "", ip_address: str = "",
    ) -> Tuple[UserProfile, str]:
        """Bind verified Google subjects to durable accounts; never mint fallback users."""
        from fastapi import HTTPException
        from sqlalchemy.exc import IntegrityError
        from sqlalchemy import func
        from app.db.session import get_db_context
        from app.db.models import User
        from app.repositories import UserRepository
        email_clean = email.strip().lower()
        try:
            with get_db_context() as db:
                db_user = db.query(User).filter(User.google_subject == subject).with_for_update().first()
                if db_user is None:
                    db_user = db.query(User).filter(func.lower(User.email) == email_clean).with_for_update().first()
                    if db_user is not None:
                        if db_user.google_subject or not authoritative_email:
                            raise HTTPException(status_code=409, detail="Sign in with your existing ORCA credentials to use this account.")
                    else:
                        pwd_hash, salt = hash_password(uuid.uuid4().hex + uuid.uuid4().hex)
                        db_user = UserRepository.create_user(
                            db=db, name=name, email=email_clean,
                            password_hash=pwd_hash, password_salt=salt,
                            preferred_language=preferred_language, role=UserRole.USER.value,
                        )
                    db_user.google_subject = subject
                if not db_user.is_active:
                    raise HTTPException(status_code=403, detail="This account is disabled.")
                db_user.last_login = datetime.now(timezone.utc)
                db.flush()
                user_id = db_user.id
                role = db_user.role
                identity = db_user.email or user_id
        except HTTPException:
            raise
        except IntegrityError as exc:
            raise HTTPException(status_code=409, detail="Account sign-in changed. Please retry.") from exc
        except Exception as exc:
            logger.warning("Google account persistence failed: %s", type(exc).__name__)
            raise HTTPException(status_code=503, detail="ACCOUNT_STORAGE_UNAVAILABLE") from exc
        profile = self.get_user_by_id(user_id)
        if profile is None:
            raise HTTPException(status_code=503, detail="ACCOUNT_STORAGE_UNAVAILABLE")
        token = create_token(user_id, role, identity, user_agent, ip_address)
        return profile, token

    def get_user_by_id(self, user_id: str) -> Optional[UserProfile]:
        """Retrieves a profile, preferring current database role/account state."""
        user_data = None
        database_checked = False
        try:
            from app.db.session import get_db_context
            from app.repositories import UserRepository
            with get_db_context() as db:
                db_user = UserRepository.get_by_id(db, user_id)
                database_checked = True
                if db_user and db_user.is_active:
                    user_data = {
                            "id": db_user.id,
                            "name": db_user.name,
                            "email": db_user.email,
                            "mobile_number": db_user.mobile_number,
                            "password_hash": db_user.password_hash,
                            "password_salt": db_user.password_salt,
                            "preferred_language": db_user.preferred_language,
                            "role": UserRole(db_user.role),
                            "operational_region": db_user.government_profile.jurisdiction_region if db_user.government_profile else None,
                            "location_permission_status": db_user.location_permission_status,
                            "location_sharing_enabled": db_user.location_sharing_enabled,
                            "vessel_class": db_user.preferences.vessel_class if db_user.preferences else None,
                            "created_at": db_user.created_at.isoformat() if db_user.created_at else datetime.now(timezone.utc).isoformat(),
                            "last_login": db_user.last_login.isoformat() if db_user.last_login else None,
                    }
                    self._users[user_id] = user_data
        except Exception as exc:
            logger.warning("DB profile lookup failed: %s", type(exc).__name__)
            from fastapi import HTTPException
            raise HTTPException(status_code=503, detail="AUTH_STORAGE_UNAVAILABLE") from exc

        # Development/test demo identities may exist only in memory. Once the
        # database answered, a missing/inactive account must not fall back.
        if self._runtime_environment() not in {"production", "prod"} and user_id.startswith("USR-DEMO-") and user_data is None and not database_checked:
            user_data = self._users.get(user_id)

        if not user_data:
            return None
        return self._to_profile(user_data)

    def list_all_users(self) -> List[UserProfile]:
        """Returns all registered users as public profiles."""
        try:
            from sqlalchemy.orm import joinedload
            from app.db.session import get_db_context
            from app.db.models import User
            with get_db_context() as db:
                rows = (
                    db.query(User)
                    .options(joinedload(User.government_profile), joinedload(User.preferences))
                    .filter(User.is_active.is_(True))
                    .all()
                )
                return [
                    UserProfile(
                        id=u.id,
                        name=u.name,
                        email=u.email,
                        mobile_number=u.mobile_number,
                        preferred_language=u.preferred_language,
                        role=UserRole(u.role),
                        operational_region=u.government_profile.jurisdiction_region if u.government_profile else None,
                        location_permission_status=u.location_permission_status,
                        location_sharing_enabled=u.location_sharing_enabled,
                        vessel_class=u.preferences.vessel_class if u.preferences else None,
                        created_at=u.created_at.isoformat() if u.created_at else datetime.now(timezone.utc).isoformat(),
                        last_login=u.last_login.isoformat() if u.last_login else None,
                    )
                    for u in rows
                ]
        except Exception as exc:
            from fastapi import HTTPException
            logger.warning("Account listing failed: %s", type(exc).__name__)
            raise HTTPException(status_code=503, detail="ACCOUNT_STORAGE_UNAVAILABLE") from exc

    def update_profile(
        self,
        user_id: str,
        name: Optional[str] = None,
        preferred_language: Optional[str] = None,
        location_permission_status: Optional[str] = None,
        location_sharing_enabled: Optional[bool] = None,
        vessel_class: Optional[str] = None,
        role: Optional[UserRole] = None,
    ) -> Optional[UserProfile]:
        """Updates user profile properties."""
        try:
            from sqlalchemy.orm import joinedload
            from app.db.session import get_db_context
            from app.db.models import User, UserPreference
            with get_db_context() as db:
                db_user = (
                    db.query(User)
                    .options(joinedload(User.government_profile), joinedload(User.preferences))
                    .filter(User.id == user_id)
                    .first()
                )
                if not db_user or not db_user.is_active:
                    return None
                if name is not None:
                    db_user.name = name
                if preferred_language is not None:
                    db_user.preferred_language = preferred_language
                pref = db_user.preferences or db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
                if pref is None and (preferred_language is not None or vessel_class is not None):
                    pref = UserPreference(
                        id=str(uuid.uuid4()),
                        user_id=user_id,
                        preferred_language=preferred_language or db_user.preferred_language or "en",
                        vessel_class=vessel_class,
                    )
                    db.add(pref)
                else:
                    if pref and preferred_language is not None:
                        pref.preferred_language = preferred_language
                    if pref and vessel_class is not None:
                        pref.vessel_class = vessel_class
                if location_permission_status is not None:
                    db_user.location_permission_status = location_permission_status
                if location_sharing_enabled is not None:
                    db_user.location_sharing_enabled = location_sharing_enabled
                if role is not None:
                    db_user.role = role.value
                db.flush()
                resolved_vessel = pref.vessel_class if pref else None
                profile = UserProfile(
                    id=db_user.id,
                    name=db_user.name,
                    email=db_user.email,
                    mobile_number=db_user.mobile_number,
                    preferred_language=db_user.preferred_language,
                    role=UserRole(db_user.role),
                    operational_region=db_user.government_profile.jurisdiction_region if db_user.government_profile else None,
                    location_permission_status=db_user.location_permission_status,
                    location_sharing_enabled=db_user.location_sharing_enabled,
                    vessel_class=resolved_vessel,
                    created_at=db_user.created_at.isoformat() if db_user.created_at else datetime.now(timezone.utc).isoformat(),
                    last_login=db_user.last_login.isoformat() if db_user.last_login else None,
                )
        except Exception as exc:
            logger.warning("DB profile update failed: %s", type(exc).__name__)
            from fastapi import HTTPException
            raise HTTPException(status_code=503, detail="PROFILE_SAVE_FAILED") from exc

        if user_id in self._users:
            cached = self._users[user_id]
            cached["name"] = profile.name
            cached["preferred_language"] = profile.preferred_language
            cached["location_permission_status"] = profile.location_permission_status
            cached["location_sharing_enabled"] = profile.location_sharing_enabled
            cached["vessel_class"] = profile.vessel_class
            cached["role"] = profile.role

        return profile

    def request_password_reset(self, email_or_phone: str) -> None:
        """Generates a hashed single-use reset code and delivers it via configured email or SMS."""
        import secrets
        from datetime import timedelta
        from fastapi import HTTPException
        from app.db.models import PasswordResetToken
        from app.db.session import get_db_context
        from app.repositories import UserRepository
        from app.services.email import get_email_transport, is_email_configured
        from app.services.sms import get_sms_transport, is_sms_configured

        ident = email_or_phone.strip()
        is_email = "@" in ident
        if is_email and not is_email_configured():
            raise HTTPException(status_code=503, detail="PASSWORD_RESET_DELIVERY_UNCONFIGURED")
        if not is_email and not is_sms_configured():
            raise HTTPException(status_code=503, detail="PASSWORD_RESET_DELIVERY_UNCONFIGURED")

        raw_token: Optional[str] = None
        target_email: Optional[str] = None
        target_phone: Optional[str] = None

        try:
            with get_db_context() as db:
                db_user = UserRepository.get_by_identifier(db, ident)
                if not db_user or not db_user.is_active:
                    return
                now_utc = datetime.now(timezone.utc)
                db.query(PasswordResetToken).filter(
                    PasswordResetToken.user_id == db_user.id,
                    PasswordResetToken.used_at.is_(None),
                ).update({PasswordResetToken.used_at: now_utc}, synchronize_session=False)
                raw_token = secrets.token_urlsafe(24)
                token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
                db.add(PasswordResetToken(
                    user_id=db_user.id,
                    token_hash=token_hash,
                    expires_at=now_utc + timedelta(minutes=15),
                ))
                target_email = db_user.email
                target_phone = db_user.mobile_number
        except HTTPException:
            raise
        except Exception as exc:
            logger.warning("Password reset token persistence failed: %s", type(exc).__name__)
            raise HTTPException(status_code=503, detail="AUTH_STORAGE_UNAVAILABLE") from exc

        if not raw_token:
            return
        if is_email and target_email:
            get_email_transport().send(
                target_email,
                "ORCA Marine AI Password Reset Code",
                f"Use this single-use reset code within 15 minutes to reset your ORCA password:\n\n{raw_token}\n",
            )
        elif not is_email and target_phone:
            get_sms_transport().send(
                target_phone,
                f"ORCA password reset code (valid 15 min): {raw_token}",
            )

    def confirm_password_reset(self, token: str, new_password: str) -> None:
        """Verifies reset token hash, updates bcrypt password, and revokes active sessions."""
        from app.db.models import DeviceSession, PasswordResetToken, User
        from app.db.session import get_db_context

        cleaned = token.strip()
        if not cleaned:
            raise ValueError("Invalid or expired password reset code.")
        token_hash = hashlib.sha256(cleaned.encode("utf-8")).hexdigest()
        now_utc = datetime.now(timezone.utc)

        with get_db_context() as db:
            row = (
                db.query(PasswordResetToken)
                .filter(PasswordResetToken.token_hash == token_hash, PasswordResetToken.used_at.is_(None))
                .first()
            )
            if not row:
                raise ValueError("Invalid or expired password reset code.")
            exp = row.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if exp <= now_utc:
                raise ValueError("Invalid or expired password reset code.")

            user = db.query(User).filter(User.id == row.user_id).first()
            if not user or not user.is_active:
                raise ValueError("Account not found or inactive.")

            pwd_hash, salt = hash_password(new_password)
            user.password_hash = pwd_hash
            user.password_salt = salt
            row.used_at = now_utc
            db.query(DeviceSession).filter(
                DeviceSession.user_id == user.id,
                DeviceSession.revoked_at.is_(None),
            ).update({DeviceSession.revoked_at: now_utc}, synchronize_session=False)
            self._users.pop(user.id, None)

    def update_role_safely(self, user_id: str, role: UserRole) -> Optional[UserProfile]:
        """Atomically changes a role while preserving at least one administrator."""
        from sqlalchemy import and_, or_
        from app.db.session import get_db_context
        from app.db.models import User
        with get_db_context() as db:
            locked_rows = (
                db.query(User)
                .filter(
                    or_(
                        User.id == user_id,
                        and_(User.role == UserRole.SUPER_ADMIN.value, User.is_active.is_(True)),
                    )
                )
                .order_by(User.id)
                .with_for_update()
                .all()
            )
            target = next((u for u in locked_rows if u.id == user_id), None)
            if not target:
                return None
            if target.is_active and target.role == UserRole.SUPER_ADMIN.value and role != UserRole.SUPER_ADMIN:
                active_admins = sum(
                    1 for u in locked_rows if u.role == UserRole.SUPER_ADMIN.value and u.is_active
                )
                if active_admins <= 1:
                    raise ValueError("Cannot remove the last administrator")
            target.role = role.value
        if user_id in self._users:
            self._users[user_id]["role"] = role
        return self.get_user_by_id(user_id)

    def _to_profile(self, data: Dict[str, Any]) -> UserProfile:
        return UserProfile(
            id=data["id"],
            name=data["name"],
            email=data.get("email"),
            mobile_number=data.get("mobile_number"),
            preferred_language=data.get("preferred_language", "en"),
            role=data.get("role", UserRole.USER),
            location_permission_status=data.get("location_permission_status", "prompt"),
            location_sharing_enabled=data.get("location_sharing_enabled", True),
            vessel_class=data.get("vessel_class"),
            created_at=data["created_at"],
            last_login=data.get("last_login"),
            operational_region=data.get("operational_region"),
        )


auth_service = AuthService()
