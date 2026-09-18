from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user_models import UserProfile
from app.routers.auth import get_current_user_from_header
from app.services.marine_snapshot_service import marine_snapshot_service
from app.services.species import species_service
from app.services.earth_observation import earth_observation_service
from app.services.rate_limit import rate_limiter

router = APIRouter(prefix="/api/intelligence", tags=["Optional evidence"])


def location(snapshot_id, user, db):
    rate_limiter.check("optional_evidence", f"user:{user.id}", limit=12, window_seconds=60)
    snapshot = marine_snapshot_service.get_by_id(db, user.id, snapshot_id)
    db.commit()  # No database transaction held during upstream requests.
    return snapshot.location


@router.get("/species")
def species(snapshot_id: str = Query(min_length=1, max_length=128), user: UserProfile = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    point = location(snapshot_id, user, db)
    return species_service.get(point.lat, point.lon)


@router.get("/earth-observation")
def earth_observation(snapshot_id: str = Query(min_length=1, max_length=128), user: UserProfile = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    point = location(snapshot_id, user, db)
    return earth_observation_service.get(point.lat, point.lon)
