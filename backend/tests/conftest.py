"""
Pytest configuration and fixtures for ORCA Marine AI tests.
Provides isolated in-memory test database and resets AuthService/services state between test runs.
"""
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set in-memory sqlite test database for pytest execution
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.db.base import Base
from app.db.session import engine, init_db
from app.services.auth.auth_service import auth_service
from app.services.emergency.emergency_service import emergency_service
from app.services.government.government_service import government_service
from app.services.notifications.notification_service import notification_service


@pytest.fixture(autouse=True)
def reset_services_and_db():
    """Resets in-memory state and test database tables before each test."""
    Base.metadata.create_all(bind=engine)
    
    # Reset in-memory services to fresh seed state
    auth_service._users.clear()
    auth_service._lookup.clear()
    auth_service._seed_default_accounts()
    
    emergency_service._active_sos_records.clear()
    
    yield
    
    # Cleanup tables
    Base.metadata.drop_all(bind=engine)
