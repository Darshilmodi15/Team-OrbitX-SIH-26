#!/usr/bin/env python3
"""Record local build evidence and validate release paperwork. Never deploys or reads .env."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import subprocess
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_CHECKS = (
    "frontend_tests", "backend_tests", "authenticated_chat", "account_isolation",
    "location_mainland_islands", "pfz_validity", "marine_provenance", "voice",
    "offline_phone_restart", "offline_expiry", "offline_worker_reconnect",
    "language_accessibility", "redis_cross_worker", "database_restore",
    "compatible_rollback", "no_false_sos_delivery",
)

def git(*args):
    return subprocess.check_output(["git", "-C", str(ROOT), *args], text=True).strip()

def fingerprint(folder):
    files = {}
    if not folder.is_dir():
        raise ValueError("Build directory is missing; run the frontend build first")
    for file in sorted(folder.rglob("*")):
        if file.is_file() and not file.is_symlink() and not file.name.startswith(".env") and file.suffix not in {".pem", ".key"}:
            files[file.relative_to(folder).as_posix()] = hashlib.sha256(file.read_bytes()).hexdigest()
    for required in ("index.html", "offline-trip-reader.html", "trip-worker.js"):
        if required not in files:
            raise ValueError("Build lacks a required entry: " + required)
    return files

def record(folder):
    return {
        "schema_version": 1, "recorded_at": datetime.now(timezone.utc).isoformat(),
        "git_commit": git("rev-parse", "HEAD"),
        "working_tree_dirty": bool(git("status", "--porcelain")),
        "build_files_sha256": fingerprint(folder),
        "frontend": {"url": None, "deployment_id": None},
        "backend": {"url": None, "deployment_id": None, "git_commit": None},
        "database": {"revision": None, "compatible_revisions": [], "restore_evidence": None},
        "previous_verified_pair": {"frontend_deployment_id": None, "backend_deployment_id": None, "database_revision": None},
        "checks": {name: {"status": "not_run", "evidence": None} for name in REQUIRED_CHECKS},
        "limitations": ["Build hashes are not proof of provider connectivity, tests, deployment or rollback."],
    }

def validate(data):
    errors = []
    if data.get("schema_version") != 1: errors.append("Unsupported record schema")
    if data.get("working_tree_dirty") is not False: errors.append("Candidate must refer to a clean committed tree")
    if not re.fullmatch(r"[a-f0-9]{40}", str(data.get("git_commit", ""))): errors.append("Missing frontend commit")
    files = data.get("build_files_sha256", {})
    for entry in ("index.html", "offline-trip-reader.html", "trip-worker.js"):
        if not re.fullmatch(r"[a-f0-9]{64}", str(files.get(entry, ""))): errors.append("Missing build hash: " + entry)
    for name in ("frontend", "backend"):
        service = data.get(name) or {}
        parsed = urlsplit(str(service.get("url") or ""))
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
            errors.append(name + " needs a credential-free HTTPS deployment URL")
        if not service.get("deployment_id"): errors.append(name + " needs an immutable deployment ID")
    if not re.fullmatch(r"[a-f0-9]{40}", str((data.get("backend") or {}).get("git_commit", ""))): errors.append("Missing backend commit")
    database = data.get("database") or {}
    if not database.get("revision") or database.get("revision") not in database.get("compatible_revisions", []): errors.append("Database revision compatibility is unverified")
    if not database.get("restore_evidence"): errors.append("Missing database restore evidence")
    previous = data.get("previous_verified_pair") or {}
    if not all(previous.get(key) for key in ("frontend_deployment_id", "backend_deployment_id", "database_revision")): errors.append("Missing verified rollback pair")
    if previous.get("database_revision") not in database.get("compatible_revisions", []): errors.append("Rollback database compatibility is unverified")
    for check in REQUIRED_CHECKS:
        result = (data.get("checks") or {}).get(check) or {}
        if result.get("status") != "passed" or not result.get("evidence"):
            errors.append("Pending or failed check: " + check)
    return errors

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    make = sub.add_parser("record")
    make.add_argument("--build-dir", type=Path, default=ROOT / "frontend/dist")
    make.add_argument("--output", type=Path, required=True)
    check = sub.add_parser("validate")
    check.add_argument("record", type=Path)
    args = parser.parse_args()
    try:
        if args.command == "record":
            data = record(args.build_dir)
            args.output.parent.mkdir(parents=True, exist_ok=True)
            # Do not overwrite earlier evidence accidentally.
            with args.output.open("x") as output: json.dump(data, output, indent=2)
            print("Recorded build hashes. Manual/deployed checks remain not_run.")
            return 0
        errors = validate(json.loads(args.record.read_text()))
        if errors:
            print("NOT READY\n" + "\n".join("- " + message for message in errors))
            return 1
        print("Record is complete. Evidence references still require human review; no deployment performed.")
        return 0
    except (ValueError, OSError, TypeError, AttributeError, subprocess.CalledProcessError):
        print("Release check failed: invalid record, missing build or unreadable output. No deployment performed.")
        return 2

if __name__ == "__main__":
    raise SystemExit(main())
