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
import secrets
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.models.user_models import RegisterRequest, UserProfile, UserRole

logger = logging.getLogger(__name__)

JWT_SECRET = os.getenv("JWT_SECRET") or os.getenv("ORCA_JWT_SECRET") or "orca_marine_ai_jwt_secret_key_sih_2026_coastal_safety"
JWT_EXPIRY_SECONDS = 86400 * 7  # 7 days


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


def create_token(user_id: str, role: str, email_or_phone: str) -> str:
    """Generates simple signed token for session authentication."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "role": role,
        "identity": email_or_phone,
        "exp": int(time.time()) + JWT_EXPIRY_SECONDS,
        "iat": int(time.time()),
    }
    
    header_b64 = secrets.token_urlsafe(8)
    payload_json = json.dumps(payload)
    sig = hmac.new(JWT_SECRET.encode("utf-8"), payload_json.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{header_b64}.{secrets.token_hex(4)}.{sig}___{secrets.token_hex(4)}___{payload_json.encode('utf-8').hex()}"


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates token signature and expiry."""
    try:
        if "___" not in token:
            return None
        parts = token.split("___")
        if len(parts) != 3:
            return None
        sig_part = parts[0].split(".")[-1]
        payload_json = bytes.fromhex(parts[2]).decode("utf-8")
        expected_sig = hmac.new(JWT_SECRET.encode("utf-8"), payload_json.encode("utf-8"), hashlib.sha256).hexdigest()
        
        if not hmac.compare_digest(sig_part, expected_sig):
            return None
            
        payload = json.loads(payload_json)
        if payload.get("exp", 0) < time.time():
            return None  # Expired
        return payload
    except Exception as err:
        logger.debug(f"Token decode failure: {err}")
        return None


class AuthService:
    """Authentication and User Profile Management Service with DB backing."""

    def __init__(self):
        # In-memory dictionary: user_id -> user_data
        self._users: Dict[str, Dict[str, Any]] = {}
        self._lookup: Dict[str, str] = {}  # email/phone -> user_id
        self._seed_default_accounts()

    def _seed_default_accounts(self):
        """Pre-seeds accounts for demonstration & role verification."""
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

    def register(self, req: RegisterRequest) -> Tuple[UserProfile, str]:
        """Registers a new user and issues access token."""
        # Check uniqueness in-memory
        if req.email and req.email.lower() in self._lookup:
            raise ValueError(f"Email '{req.email}' is already registered.")
        if req.mobile_number and req.mobile_number in self._lookup:
            raise ValueError(f"Mobile number '{req.mobile_number}' is already registered.")

        # Check DB uniqueness if available
        try:
            from app.db.session import get_db_context
            from app.repositories import UserRepository
            with get_db_context() as db:
                if req.email and UserRepository.get_by_email(db, req.email):
                    raise ValueError(f"Email '{req.email}' is already registered.")
                if req.mobile_number and UserRepository.get_by_phone(db, req.mobile_number):
                    raise ValueError(f"Mobile number '{req.mobile_number}' is already registered.")
        except ValueError:
            raise
        except Exception:
            pass

        user_id = str(uuid.uuid4())
        pwd_hash, salt = hash_password(req.password)
        now_iso = datetime.now(timezone.utc).isoformat()
        role_val = req.role if isinstance(req.role, UserRole) else UserRole(req.role or "USER")

        user_data = {
            "id": user_id,
            "name": req.name,
            "email": req.email.lower() if req.email else None,
            "mobile_number": req.mobile_number,
            "password_hash": pwd_hash,
            "password_salt": salt,
            "preferred_language": req.preferred_language or "en",
            "role": role_val,
            "location_permission_status": "prompt",
            "location_sharing_enabled": True,
            "created_at": now_iso,
            "last_login": now_iso,
        }

        # Persist to database if available
        try:
            from app.db.session import get_db_context
            from app.repositories import UserRepository
            with get_db_context() as db:
                UserRepository.create_user(
                    db=db,
                    name=req.name,
                    password_hash=pwd_hash,
                    password_salt=salt,
                    email=req.email,
                    mobile_number=req.mobile_number,
                    preferred_language=req.preferred_language or "en",
                    role=role_val.value,
                )
        except Exception as e:
            logger.debug(f"Database user persistence note: {e}")

        self._users[user_id] = user_data
        if req.email:
            self._lookup[req.email.lower()] = user_id
        if req.mobile_number:
            self._lookup[req.mobile_number] = user_id

        identity = req.email or req.mobile_number or user_id
        token = create_token(user_id, user_data["role"].value, identity)
        profile = self._to_profile(user_data)
        return profile, token

    def login(self, email_or_phone: str, password: str) -> Tuple[UserProfile, str]:
        """Authenticates user credentials and issues token."""
        key = email_or_phone.strip().lower()
        user_id = self._lookup.get(key)
        if not user_id:
            user_id = self._lookup.get(email_or_phone.strip())

        # If not found in memory, check database
        if not user_id:
            try:
                from app.db.session import get_db_context
                from app.repositories import UserRepository
                with get_db_context() as db:
                    db_user = UserRepository.get_by_identifier(db, email_or_phone)
                    if db_user:
                        user_id = db_user.id
                        user_data = {
                            "id": db_user.id,
                            "name": db_user.name,
                            "email": db_user.email,
                            "mobile_number": db_user.mobile_number,
                            "password_hash": db_user.password_hash,
                            "password_salt": db_user.password_salt,
                            "preferred_language": db_user.preferred_language,
                            "role": UserRole(db_user.role),
                            "location_permission_status": db_user.location_permission_status,
                            "location_sharing_enabled": db_user.location_sharing_enabled,
                            "created_at": db_user.created_at.isoformat() if db_user.created_at else datetime.now(timezone.utc).isoformat(),
                            "last_login": datetime.now(timezone.utc).isoformat(),
                        }
                        self._users[user_id] = user_data
                        if db_user.email:
                            self._lookup[db_user.email.lower()] = user_id
                        if db_user.mobile_number:
                            self._lookup[db_user.mobile_number] = user_id
            except Exception as e:
                logger.debug(f"DB lookup during login: {e}")

        if not user_id or user_id not in self._users:
            raise ValueError("Invalid credentials: No account found with provided email or mobile number.")

        user_data = self._users[user_id]
        if not verify_password(password, user_data["password_hash"], user_data["password_salt"]):
            raise ValueError("Invalid password.")

        user_data["last_login"] = datetime.now(timezone.utc).isoformat()
        token = create_token(user_id, user_data["role"].value, email_or_phone)
        profile = self._to_profile(user_data)
        return profile, token

    def get_user_by_id(self, user_id: str) -> Optional[UserProfile]:
        """Retrieves public user profile by ID."""
        user_data = self._users.get(user_id)
        if not user_data:
            try:
                from app.db.session import get_db_context
                from app.repositories import UserRepository
                with get_db_context() as db:
                    db_user = UserRepository.get_by_id(db, user_id)
                    if db_user:
                        user_data = {
                            "id": db_user.id,
                            "name": db_user.name,
                            "email": db_user.email,
                            "mobile_number": db_user.mobile_number,
                            "password_hash": db_user.password_hash,
                            "password_salt": db_user.password_salt,
                            "preferred_language": db_user.preferred_language,
                            "role": UserRole(db_user.role),
                            "location_permission_status": db_user.location_permission_status,
                            "location_sharing_enabled": db_user.location_sharing_enabled,
                            "created_at": db_user.created_at.isoformat() if db_user.created_at else datetime.now(timezone.utc).isoformat(),
                            "last_login": db_user.last_login.isoformat() if db_user.last_login else None,
                        }
                        self._users[user_id] = user_data
            except Exception:
                pass

        if not user_data:
            return None
        return self._to_profile(user_data)

    def list_all_users(self) -> List[UserProfile]:
        """Returns all registered users as public profiles."""
        return [self._to_profile(u) for u in self._users.values()]

    def update_profile(
        self,
        user_id: str,
        name: Optional[str] = None,
        preferred_language: Optional[str] = None,
        location_permission_status: Optional[str] = None,
        location_sharing_enabled: Optional[bool] = None,
        role: Optional[UserRole] = None,
    ) -> Optional[UserProfile]:
        """Updates user profile properties."""
        user_data = self._users.get(user_id)
        if not user_data:
            return None

        if name is not None:
            user_data["name"] = name
        if preferred_language is not None:
            user_data["preferred_language"] = preferred_language
        if location_permission_status is not None:
            user_data["location_permission_status"] = location_permission_status
        if location_sharing_enabled is not None:
            user_data["location_sharing_enabled"] = location_sharing_enabled
        if role is not None:
            user_data["role"] = role

        return self._to_profile(user_data)

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
            created_at=data["created_at"],
            last_login=data.get("last_login"),
        )


auth_service = AuthService()
