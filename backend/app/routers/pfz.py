"""Router for Potential Fishing Zone (PFZ) data endpoints."""
import json
from pathlib import Path
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, status

router = APIRouter(prefix="/api", tags=["PFZ"])


def _find_pfz_file() -> Path:
    """Locate the PFZ dataset file reliably across different working directories."""
    current_dir = Path(__file__).resolve().parent
    candidates = [
        current_dir.parent.parent.parent / "data" / "pfz" / "pfz_maharashtra.json",  # repo_root/data/pfz/...
        current_dir.parent.parent / "data" / "pfz" / "pfz_maharashtra.json",
        Path.cwd() / "data" / "pfz" / "pfz_maharashtra.json",
        Path.cwd() / "Team-OrbitX-SIH-26" / "data" / "pfz" / "pfz_maharashtra.json",
    ]
    for p in candidates:
        if p.is_file():
            return p
    return candidates[0]


@router.get("/pfz", summary="Retrieve Potential Fishing Zones dataset")
def get_pfz_dataset() -> Dict[str, Any]:
    """
    Load and return the INCOIS Potential Fishing Zones (PFZ) dataset for Maharashtra.
    """
    file_path = _find_pfz_file()
    if not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PFZ dataset file not found at expected path: {file_path.name}",
        )

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse PFZ dataset: {str(exc)}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading PFZ dataset: {str(exc)}",
        )
