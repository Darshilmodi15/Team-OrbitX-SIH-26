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
        self._seed_default_records()

    def _seed_default_records(self):
        """Seeds realistic Indian maritime circulars and policy documents."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        announcements = [
            GovernmentAnnouncement(
                id="GOV-ANN-2026-01",
                title="Uniform Monsoon Fishing Ban (61 Days) along West Coast EEZ",
                issuing_authority="Department of Fisheries, Ministry of Fisheries, Animal Husbandry & Dairying",
                state_or_national="National (West Coast: Gujarat, Maharashtra, Goa, Karnataka, Kerala)",
                publish_date=today,
                effective_dates="June 1, 2026 to July 31, 2026",
                summary="Annual 61-day fishing ban for all mechanized and motorized fishing vessels in the Exclusive Economic Zone (EEZ) beyond 12 nautical miles to protect pelagic spawning fish stocks.",
                full_text="In exercise of powers conferred under the Marine Fishing Regulation Act, the Central Government hereby imposes a uniform fishing ban for a period of 61 days on the West Coast of India. Traditional non-motorized crafts are exempted from this ban within territorial waters. Strict maritime surveillance will be enforced by the Indian Coast Guard and State Marine Police.",
                category=AnnouncementCategory.SAFETY_BAN,
                reference_number="F.No. 31011/04/2026-Fy(M)",
                document_url="/documents/monsoon_fishing_ban_2026.pdf",
                is_urgent=True,
                is_active=True,
            ),
            GovernmentAnnouncement(
                id="GOV-ANN-2026-02",
                title="Mandatory Two-Way Communication & AIS Transponders for Mechanized Craft",
                issuing_authority="Directorate General of Shipping & Indian Coast Guard",
                state_or_national="National",
                publish_date=today,
                effective_dates="Mandatory with immediate effect",
                summary="All mechanized fishing craft exceeding 12 meters in overall length (OAL) must be fitted with ISRO-approved Two-Way Distress Alert Transponders (DAT-SG) or AIS Class-B transponders for maritime tracking and safety.",
                full_text="Following maritime security council directives, all fishing vessels operating in Indian coastal waters must carry functional vessel tracking devices. Subsidized transponders are available through the District Fisheries Offices under PMMSY. Non-compliance will result in cancellation of fishing permits and impoundment.",
                category=AnnouncementCategory.REGULATION,
                reference_number="DGS/MSN/2026/08",
                document_url="/documents/ais_mandate_fishing_craft.pdf",
                is_urgent=False,
                is_active=True,
            ),
            GovernmentAnnouncement(
                id="GOV-ANN-2026-03",
                title="PMMSY Financial Subsidies for Marine Safety Equipment & VHF Sets",
                issuing_authority="National Fisheries Development Board (NFDB)",
                state_or_national="National",
                publish_date=today,
                effective_dates="Financial Year 2026-27",
                summary="Pradhan Mantri Matsya Sampada Yojana announces 40% capital subsidy (60% for SC/ST and Women beneficiaries) on life jackets, VHF marine radios, GPS chartplotters, and insulated fish holds.",
                full_text="Eligible traditional and small-scale marine fishers can apply through their nearest Matsya Seva Kendra or the ORCA government portal. Applications will be processed on a first-come-first-served basis with direct bank transfer (DBT) of subsidy amounts upon verification.",
                category=AnnouncementCategory.SUBSIDY_SCHEME,
                reference_number="NFDB/PMMSY/SCHEME/2026/12",
                document_url="/documents/pmmsy_marine_safety_guidelines.pdf",
                is_urgent=False,
                is_active=True,
            ),
            GovernmentAnnouncement(
                id="GOV-ANN-2026-04",
                title="Precautionary Squall Advisory — Coastal Port Signal No. 3 (Local Cautionary)",
                issuing_authority="India Meteorological Department & Gujarat Maritime Board",
                state_or_national="Gujarat & Maharashtra",
                publish_date=today,
                effective_dates="Next 48 Hours",
                summary="Under the influence of cyclonic circulation over east-central Arabian Sea, squally winds reaching 45-55 km/h gusting to 65 km/h likely along north Maharashtra and south Gujarat coastlines. Fishermen are advised not to venture into deep sea.",
                full_text="Local Cautionary Signal No. 3 hoisted at Okha, Porbandar, Veraval, and Mumbai ports. Sea conditions will be rough to very rough with wave crests exceeding 2.5 meters. Inshore traditional fishers should exercise extreme caution.",
                category=AnnouncementCategory.CYCLONE_ALERT,
                reference_number="IMD/RSMC/BULLETIN-04",
                document_url="/documents/imd_marine_bulletin.pdf",
                is_urgent=True,
                is_active=True,
            ),
        ]

        for a in announcements:
            self._announcements[a.id] = a

        documents = [
            GovernmentDocument(
                id="DOC-01",
                title="Pradhan Mantri Matsya Sampada Yojana (PMMSY) Operational Guidelines",
                department="Department of Fisheries, GoI",
                category="Government Schemes",
                file_size_kb=820,
                publish_date="2026-01-10",
                description="Comprehensive handbook of beneficiary criteria, subsidy rates, and application workflows.",
                download_url="/downloads/pmmsy_guidelines.pdf",
            ),
            GovernmentDocument(
                id="DOC-02",
                title="Standard Operating Procedure (SOP) for Marine Search & Rescue",
                department="Indian Coast Guard (ICG)",
                category="Maritime Safety",
                file_size_kb=490,
                publish_date="2026-02-01",
                description="Distress beacon verification, VHF emergency channel protocols, and coastal police coordination.",
                download_url="/downloads/icg_sar_sop.pdf",
            ),
            GovernmentDocument(
                id="DOC-03",
                title="Marine Fisheries Regulation Act (MFRA) State Compendium",
                department="Directorate of Fisheries",
                category="Regulations & Laws",
                file_size_kb=650,
                publish_date="2025-11-20",
                description="State-wise demarcation of territorial fishing zones (0-12 NM), mesh size rules, and MPA boundaries.",
                download_url="/downloads/mfra_compendium.pdf",
            ),
            GovernmentDocument(
                id="DOC-04",
                title="INCOIS Ocean State Forecast & PFZ User Manual for Fishers",
                department="INCOIS / MoES",
                category="Oceanographic Data",
                file_size_kb=340,
                publish_date="2026-01-25",
                description="Guide to interpreting sea surface temperature (SST) gradients and chlorophyll fronts.",
                download_url="/downloads/incois_pfz_manual.pdf",
            ),
        ]

        for d in documents:
            self._documents[d.id] = d

    def get_announcements(
        self,
        state: Optional[str] = None,
        category: Optional[str] = None,
        urgent_only: bool = False,
    ) -> List[GovernmentAnnouncement]:
        """Retrieves and filters government announcements."""
        items = list(self._announcements.values())

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
        return self._announcements.get(announcement_id)

    def create_announcement(self, req: CreateAnnouncementRequest) -> GovernmentAnnouncement:
        ann_id = f"GOV-ANN-{uuid.uuid4().hex[:6].upper()}"
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
        self._announcements[ann_id] = ann

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
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                GovernmentAlertRepository.create_alert(db, db_alert)
        except Exception as e:
            logger.debug(f"Government announcement DB persistence: {e}")

        logger.info(f"Published new official government circular: {ann_id} - {ann.title}")
        return ann

    def get_documents(self) -> List[GovernmentDocument]:
        return list(self._documents.values())


government_service = GovernmentService()
