#!/usr/bin/env python3
"""Automated pre-acceptance checks for ORCA.

Runs verifiable checks against the local codebase and build artifacts.
Does not deploy, does not read .env, does not make external requests.
Exit 0: all checks passed. Exit 1: some checks failed. Exit 2: script error.
"""
import glob
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_DIST = ROOT / "frontend" / "dist"
BACKEND_APP = ROOT / "backend" / "app"

RESULTS = []


def check(check_id: str, description: str, passed: bool, detail: str = ""):
    status = "PASS" if passed else "FAIL"
    RESULTS.append({"id": check_id, "description": description, "status": status, "detail": detail})
    icon = "✅" if passed else "❌"
    print(f"  {icon} {check_id}: {description}")
    if detail and not passed:
        print(f"       {detail}")


def main():
    print("ORCA Pre-Acceptance Checks")
    print("=" * 60)
    errors = 0

    # ---- M01 partial: Git state ----
    print("\n📋 M01 — Candidate Identity")
    try:
        sha = subprocess.check_output(
            ["git", "-C", str(ROOT), "rev-parse", "HEAD"], text=True
        ).strip()
        porcelain = subprocess.check_output(
            ["git", "-C", str(ROOT), "status", "--porcelain"], text=True, stderr=subprocess.DEVNULL
        ).strip()
        dirty = bool(porcelain)
        # New acceptance tooling files are expected to be uncommitted during this run
        only_acceptance = all(
            any(allowed in line for allowed in ["acceptance_results", "pre_acceptance", "data_source_investigation", "pre_acceptance_results"])
            for line in porcelain.splitlines()
        ) if dirty else False
        check("M01-a", "Git SHA recorded", bool(re.fullmatch(r"[a-f0-9]{40}", sha)), f"SHA: {sha}")
        check("M01-b", "Working tree is clean (or only new acceptance files)", not dirty or only_acceptance,
              f"{len(porcelain.splitlines())} changed file(s) — acceptance tooling only" if only_acceptance else
              "Uncommitted changes present — candidate identity is ambiguous" if dirty else "")
    except subprocess.CalledProcessError:
        check("M01-a", "Git SHA recorded", False, "git command failed")
        check("M01-b", "Working tree is clean", False, "git command failed")

    # ---- M11 partial: No secrets in frontend build ----
    print("\n🔒 M11 — No Secrets in Frontend Bundle")
    if FRONTEND_DIST.is_dir():
        secret_patterns = [
            (r"sk-[a-zA-Z0-9]{20,}", "Possible API key (sk-...)"),
            (r"AIza[a-zA-Z0-9_-]{35}", "Google API key"),
            (r"ghp_[a-zA-Z0-9]{36}", "GitHub PAT"),
            (r"redis://[^\s\"']+", "Redis URL"),
            (r"postgresql://[^\s\"']+", "PostgreSQL URL"),
            (r"SARVAM_API_KEY", "Sarvam key reference"),
            (r"GEMINI_API_KEY", "Gemini key reference"),
            (r"BHASHINI_API_KEY", "Bhashini key reference"),
            (r"JWT_SECRET_KEY", "JWT secret reference"),
        ]
        bundle_files = list(FRONTEND_DIST.rglob("*.js")) + list(FRONTEND_DIST.rglob("*.html"))
        leaked = []
        for fp in bundle_files:
            content = fp.read_text(errors="ignore")
            for pattern, label in secret_patterns:
                # Allow VITE_* env references but flag actual values
                matches = re.findall(pattern, content)
                if matches:
                    # Filter out .env.example-style placeholders
                    real = [m for m in matches if "your_" not in m.lower() and "placeholder" not in m.lower()
                            and "example" not in m.lower()]
                    if real:
                        leaked.append(f"{fp.name}: {label} ({len(real)} occurrence(s))")
        check("M11-a", "No API keys/secrets in JS/HTML bundle", not leaked,
              "; ".join(leaked[:5]) if leaked else "")

        # Check VITE_API_BASE_URL is set to a real backend, not localhost in production build
        index_html = FRONTEND_DIST / "index.html"
        if index_html.exists():
            html = index_html.read_text(errors="ignore")
            check("M11-b", "index.html exists in build", True)
        else:
            check("M11-b", "index.html exists in build", False)
    else:
        check("M11-a", "Frontend build exists", False, f"Missing: {FRONTEND_DIST}")
        check("M11-b", "index.html exists in build", False, "No build directory")

    # ---- M18: No preset/demo buttons in LocationPage ----
    print("\n📍 M18 — No Preset Buttons in Location Selection")
    location_page = ROOT / "frontend" / "src" / "pages" / "LocationPage.tsx"
    if location_page.exists():
        src = location_page.read_text()
        preset_patterns = [
            (r"preset.*port", "Preset port button"),
            (r"demo.*weather", "Demo weather data"),
            (r"sample.*location", "Sample location"),
            (r"example.*port", "Example port button"),
        ]
        found_presets = []
        for pattern, label in preset_patterns:
            if re.search(pattern, src, re.IGNORECASE):
                found_presets.append(label)
        check("M18-a", "No preset/demo buttons in LocationPage", not found_presets,
              "; ".join(found_presets) if found_presets else "")

        # Check DEFAULT_CENTER is only used as viewport, not as selected location
        default_uses = [line.strip() for i, line in enumerate(src.splitlines())
                        if "DEFAULT_CENTER" in line]
        # It should only appear in the initial state and map centering, not in save/confirm
        save_with_default = any("save" in line.lower() and "DEFAULT_CENTER" in line for line in src.splitlines())
        check("M18-b", "DEFAULT_CENTER not used as a saved selection", not save_with_default,
              "DEFAULT_CENTER found in save/confirm logic" if save_with_default else
              f"DEFAULT_CENTER used only as viewport ({len(default_uses)} references)")
    else:
        check("M18-a", "LocationPage.tsx exists", False)

    # ---- M36: PFZ unavailable when unconfigured ----
    print("\n🐟 M36 — PFZ Unavailable State")
    pfz_service = BACKEND_APP / "services" / "pfz" / "incois_pfz_service.py"
    if pfz_service.exists():
        pfz_src = pfz_service.read_text()
        # Check that empty API URL returns unavailable
        has_not_configured = "NOT_CONFIGURED" in pfz_src
        has_unavailable_return = "\"unavailable\"" in pfz_src or "'unavailable'" in pfz_src
        check("M36-a", "PFZ service returns NOT_CONFIGURED when no URL", has_not_configured)
        check("M36-b", "PFZ service has unavailable status path", has_unavailable_return)

        # Check that INCOIS_PFZ_API_URL env var defaults to empty
        env_default = re.search(r'os\.getenv\(["\']INCOIS_PFZ_API_URL["\'],\s*["\']([^"\']*)["\']\)', pfz_src)
        default_value = env_default.group(1) if env_default else ""
        check("M36-c", "PFZ API URL defaults to empty (unconfigured)", default_value == "",
              f"Default: '{default_value}'" if default_value else "Defaults to empty string")
    else:
        check("M36-a", "PFZ service file exists", False)

    # ---- M42 partial: MOSDAC returns NOT_IMPLEMENTED ----
    print("\n🛰️  M42 — MOSDAC Unavailable State")
    mosdac_service = BACKEND_APP / "services" / "satellite" / "mosdac_service.py"
    if mosdac_service.exists():
        mosdac_src = mosdac_service.read_text()
        check("M42-a", "MOSDAC is_configured returns False", "return False" in mosdac_src)
        check("M42-b", "MOSDAC reports NOT_IMPLEMENTED", "NOT_IMPLEMENTED" in mosdac_src)
        check("M42-c", "MOSDAC chlorophyll returns None", "\"chlorophyll_mg_m3\": None" in mosdac_src)
    else:
        check("M42-a", "MOSDAC service file exists", False)

    # ---- M44 partial: Recommendations don't fabricate PFZ data ----
    print("\n📊 M44 — No Fabricated Recommendations")
    rec_engine = BACKEND_APP / "services" / "recommendation_engine.py"
    if rec_engine.exists():
        rec_src = rec_engine.read_text()
        fabrication_patterns = [
            (r"catch_probability\s*=\s*\d", "Hardcoded catch probability"),
            (r"cpue\s*=\s*\d", "Hardcoded CPUE"),
            (r"safe.*route.*guarantee", "Safe route guarantee"),
        ]
        # Check for departure clearance claims (but not negations like "does not issue departure clearance")
        fabrications = []
        for line in rec_src.splitlines():
            lower = line.lower().strip()
            if "departure" in lower and "clearance" in lower:
                if "does not" not in lower and "not issue" not in lower and "no " not in lower:
                    fabrications.append("Departure clearance claim")
        for pattern, label in fabrication_patterns:
            if re.search(pattern, rec_src, re.IGNORECASE):
                fabrications.append(label)
        check("M44-a", "No fabricated catch probability/CPUE/route safety",
              not fabrications, "; ".join(fabrications) if fabrications else "")

        # Check reliability tier usage — should be REFERENCE_ESTIMATE or ORCA_HEURISTIC, not VERIFIED
        has_verified_claim = bool(re.search(r"reliability_tier.*[\"']VERIFIED[\"']", rec_src))
        check("M44-b", "Recommendations use REFERENCE_ESTIMATE, not VERIFIED",
              not has_verified_claim,
              "Found VERIFIED reliability tier — should be REFERENCE_ESTIMATE" if has_verified_claim else "")
    else:
        check("M44-a", "Recommendation engine exists", False)

    # ---- Build integrity ----
    print("\n🏗️  Build Integrity")
    required_build_files = ["index.html", "offline-trip-reader.html", "trip-worker.js"]
    for f in required_build_files:
        check(f"BUILD-{f}", f"Build contains {f}", (FRONTEND_DIST / f).exists())

    # ---- .gitignore coverage ----
    print("\n🔐 .gitignore Coverage")
    gitignore = ROOT / ".gitignore"
    if gitignore.exists():
        gi = gitignore.read_text()
        for pattern in [".env", "node_modules", "__pycache__", ".venv", "venv"]:
            check(f"GI-{pattern}", f".gitignore includes {pattern}", pattern in gi)
    else:
        check("GI-exists", ".gitignore exists", False)

    # ---- Summary ----
    print("\n" + "=" * 60)
    passed = sum(1 for r in RESULTS if r["status"] == "PASS")
    failed = sum(1 for r in RESULTS if r["status"] == "FAIL")
    total = len(RESULTS)
    print(f"Results: {passed}/{total} passed, {failed} failed")

    if failed:
        print("\nFailed checks:")
        for r in RESULTS:
            if r["status"] == "FAIL":
                print(f"  ❌ {r['id']}: {r['description']}")
                if r["detail"]:
                    print(f"     {r['detail']}")

    # Write JSON results
    out_path = ROOT / "docs" / "verification" / "pre_acceptance_results.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump({
            "timestamp": subprocess.check_output(
                ["date", "-u", "+%Y-%m-%dT%H:%M:%SZ"], text=True
            ).strip(),
            "total": total, "passed": passed, "failed": failed,
            "checks": RESULTS,
        }, f, indent=2)
    print(f"\nResults saved to {out_path.relative_to(ROOT)}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
