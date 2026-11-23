"""
Government Announcements, Policy Circulars, and Maritime Documents Service for ORCA.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.models.government_models import (
    AnnouncementCategory,
    CreateAnnouncementRequest,
    GovernmentAnnouncement,
    GovernmentDocument,
)

logger = logging.getLogger(__name__)


class GovernmentService:
    """Core Government Portal & Announcements Service."""

    def __init__(self):
        self._announcements: Dict[str, GovernmentAnnouncement] = {}
        self._documents: Dict[str, GovernmentDocument] = {}
        # No invented government bulletins are loaded at startup.

    @staticmethod
    def _row_to_announcement(row) -> GovernmentAnnouncement:
        try:
            category = AnnouncementCategory(row.category)
        except ValueError:
            logger.warning("Unknown announcement category %r for %s; falling back to general notice.", row.category, row.id)
            category = AnnouncementCategory.GENERAL_NOTICE
        return GovernmentAnnouncement(
            id=row.id,
            title=row.title,
            issuing_authority=row.issuing_authority,
            state_or_national=row.state_or_national,
            publish_date=row.publish_date,
            effective_dates=row.effective_dates,
            summary=row.summary,
            full_text=row.full_text,
            category=category,
            reference_number=row.reference_number,
            document_url=row.document_url,
            is_urgent=row.is_urgent,
            is_active=row.is_active,
        )

    def get_announcements(
        self,
        state: Optional[str] = None,
        category: Optional[str] = None,
        urgent_only: bool = False,
    ) -> List[GovernmentAnnouncement]:
        """Retrieves and filters government announcements."""
        from fastapi import HTTPException
        from app.db.session import get_db_context
        from app.db.models import GovernmentAlert
        try:
            with get_db_context() as db:
                rows = db.query(GovernmentAlert).filter(GovernmentAlert.is_active.is_(True)).all()
                # Known legacy demonstration bulletins are retained in storage, excluded from public current notices.
                items = [self._row_to_announcement(row) for row in rows if not row.id.startswith("GOV-ANN-2026-")]
        except Exception as e:
            logger.warning("Announcement fetch failed: %s", type(e).__name__)
            raise HTTPException(status_code=503, detail="ANNOUNCEMENT_STORAGE_UNAVAILABLE") from e

        if urgent_only:
            items = [a for a in items if a.is_urgent]

        if category:
            items = [a for a in items if category.lower() in a.category.value.lower()]

        if state and state.lower() != "national":
            items = [
                a for a in items
                if a.state_or_national.lower() == "national" or state.lower() in a.state_or_national.lower()
            ]

        # Sort newest and urgent first
        items.sort(key=lambda x: (x.is_urgent, x.publish_date), reverse=True)
        return items

    def get_announcement_by_id(self, announcement_id: str) -> Optional[GovernmentAnnouncement]:
        from fastapi import HTTPException
        from app.db.session import get_db_context
        from app.repositories import GovernmentAlertRepository
        if announcement_id.startswith("GOV-ANN-2026-"):
            return None
        try:
            with get_db_context() as db:
                row = GovernmentAlertRepository.get_by_id(db, announcement_id)
                if not row or not row.is_active:
                    return None
                return self._row_to_announcement(row)
        except Exception as e:
            logger.warning("Announcement detail lookup failed: %s", type(e).__name__)
            raise HTTPException(status_code=503, detail="ANNOUNCEMENT_STORAGE_UNAVAILABLE") from e

    def create_announcement(self, req: CreateAnnouncementRequest, published_by: Optional[str] = None) -> GovernmentAnnouncement:
        ann_id = f"GOV-ANN-{uuid.uuid4().hex[:12].upper()}"
        pub_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        ann = GovernmentAnnouncement(
            id=ann_id,
            title=req.title,
            issuing_authority=req.issuing_authority,
            state_or_national=req.state_or_national,
            publish_date=pub_date,
            effective_dates=req.effective_dates,
            summary=req.summary,
            full_text=req.full_text,
            category=req.category,
            reference_number=req.reference_number,
            document_url=None,
            is_urgent=req.is_urgent,
            is_active=True,
        )

        # Persist to database if available
        try:
            from app.db.session import get_db_context
            from app.db.models import GovernmentAlert as DBGovernmentAlert
            from app.repositories import GovernmentAlertRepository
            with get_db_context() as db:
                db_alert = DBGovernmentAlert(
                    id=ann_id,
                    title=req.title,
                    issuing_authority=req.issuing_authority,
                    state_or_national=req.state_or_national,
                    publish_date=pub_date,
                    effective_dates=req.effective_dates or "Immediate Effect",
                    summary=req.summary,
                    full_text=req.full_text,
                    category=req.category.value if hasattr(req.category, "value") else str(req.category),
                    reference_number=req.reference_number,
                    document_url=None,
                    severity="CRITICAL" if req.is_urgent else "INFO",
                    is_urgent=req.is_urgent,
                    is_active=True,
                    published_by=published_by,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                GovernmentAlertRepository.create_alert(db, db_alert)
        except Exception as e:
            from fastapi import HTTPException
            logger.warning("Announcement persistence failed: %s", type(e).__name__)
            raise HTTPException(status_code=503, detail="ANNOUNCEMENT_STORAGE_UNAVAILABLE")

        logger.info(f"Published new official government circular: {ann_id} - {ann.title}")
        return ann

    def get_documents(self) -> List[GovernmentDocument]:
        from fastapi import HTTPException
        from app.db.session import get_db_context
        from app.repositories import GovernmentDocumentRepository
        try:
            with get_db_context() as db:
                rows = GovernmentDocumentRepository.list_documents(db)
                return [
                    GovernmentDocument(
                        id=row.id,
                        title=row.title,
                        department=row.department,
                        category=row.category,
                        file_size_kb=row.file_size_kb or 450,
                        publish_date=row.publish_date,
                        description=row.description,
                        download_url=row.download_url or "#",
                    )
                    for row in rows
                ]
        except Exception as e:
            logger.warning("Government documents fetch failed: %s", type(e).__name__)
            raise HTTPException(status_code=503, detail="GOVERNMENT_DOCUMENTS_UNAVAILABLE") from e


government_service = GovernmentService()
