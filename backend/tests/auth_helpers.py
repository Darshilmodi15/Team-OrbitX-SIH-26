import uuid
from app.services.auth.auth_service import auth_service, create_token
from app.models.user_models import UserRole
from app.db.session import get_db_context
from app.db.models import User

def authenticate_client(client, role: UserRole = UserRole.USER):
    from app.db.base import Base
    from app.db.session import engine
    Base.metadata.create_all(bind=engine)
    email = f"test-{uuid.uuid4()}@example.com"
    response = client.post("/api/auth/register", json={"name": "Test User", "email": email, "password": "safe-password-123", "preferred_language": "en"})
    assert response.status_code == 200, response.text
    body = response.json(); user_id = body["user"]["id"]
    token = body["access_token"]
    if role != UserRole.USER:
        auth_service._users[user_id]["role"] = role
        with get_db_context() as db: db.query(User).filter(User.id == user_id).update({"role": role.value})
        token = create_token(user_id, role.value, email)
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client
