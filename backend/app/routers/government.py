"""
Government Announcements, Circulars, and Policy Documents REST Router for ORCA.
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.models.government_models import (
    CreateAnnouncementRequest,
    GovernmentAnnouncement,
    GovernmentDocument,
)
from app.services.government import government_service

router = APIRouter(prefix="/api/government", tags=["Government Circulars & Policy Portal"])


@router.get("/announcements", response_model=List[GovernmentAnnouncement])
def list_government_announcements(
    state: Optional[str] = Query(None, description="Filter by coastal state or jurisdiction (e.g. 'Gujarat', 'Maharashtra')"),
    category: Optional[str] = Query(None, description="Filter by announcement category"),
    urgent_only: bool = Query(False, description="Whether to only return urgent high-priority advisories"),
):
    """
    Returns official government announcements from Ministry of Fisheries, Coast Guard, IMD, and State departments.
    """
    return government_service.get_announcements(state=state, category=category, urgent_only=urgent_only)


@router.get("/announcements/{announcement_id}", response_model=GovernmentAnnouncement)
def get_announcement_details(announcement_id: str):
    """
    Retrieves full gazette text and metadata for a specific announcement.
    """
    ann = government_service.get_announcement_by_id(announcement_id)
    if not ann:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")
    return ann


@router.post("/announcements", response_model=GovernmentAnnouncement, status_code=status.HTTP_201_CREATED)
def publish_government_announcement(request: CreateAnnouncementRequest):
    """
    Publishes a new official government circular (Available to Government Officers & Administrators).
    """
    return government_service.create_announcement(request)


@router.get("/documents", response_model=List[GovernmentDocument])
def list_government_documents():
    """
    Returns official guidelines, PMMSY policy handbooks, and maritime regulations.
    """
    return government_service.get_documents()
