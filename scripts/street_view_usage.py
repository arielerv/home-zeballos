"""Persist local counts of Google Street View API requests."""

from __future__ import annotations

import os
import sqlite3
from hashlib import sha256
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

RequestType = Literal["metadata", "image"]
MAX_IMAGES_PER_RESEARCH_SESSION = 10
_DEFAULT_DATABASE = (
    Path(__file__).resolve().parents[1] / "artifacts" / "street-view-usage.sqlite3"
)


def _database_path() -> Path:
    configured_path = os.environ.get("STREET_VIEW_USAGE_DB")
    return Path(configured_path).expanduser() if configured_path else _DEFAULT_DATABASE


def record_request(request_type: RequestType, research_id: str | None = None) -> dict[str, int | str]:
    """Record one outbound API attempt and return local usage totals.

    Only the UTC timestamp and request type are stored; no key, address, or image
    data is written to the usage database.
    """
    if request_type not in ("metadata", "image"):
        raise ValueError("request_type must be 'metadata' or 'image'")
    if request_type == "image" and not (research_id and research_id.strip()):
        raise ValueError("image requests require a non-empty research_id so the 10-image limit can be enforced")

    requested_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    research_hash = sha256(research_id.strip().encode("utf-8")).hexdigest() if research_id else None
    return _record_request(request_type, requested_at, research_hash)


def get_request_counts(research_id: str | None = None) -> dict[str, int | str]:
    """Return lifetime and current UTC-month counts, split by request type."""
    now = datetime.now(timezone.utc)
    month = now.strftime("%Y-%m")
    database_path = _database_path()
    if not database_path.exists():
        counts = _empty_counts(month)
        if research_id:
            counts["research_images"] = 0
        return counts

    with sqlite3.connect(database_path, timeout=10) as connection:
        rows = connection.execute(
            """
            SELECT request_type,
                   COUNT(*) AS total,
                   SUM(CASE WHEN substr(requested_at_utc, 1, 7) = ? THEN 1 ELSE 0 END)
                       AS this_month
            FROM street_view_requests
            GROUP BY request_type
            """,
            (month,),
        ).fetchall()

    counts = {"image": (0, 0), "metadata": (0, 0)}
    for request_type, total, this_month in rows:
        counts[request_type] = (total, this_month)

    image_total, image_month = counts["image"]
    metadata_total, metadata_month = counts["metadata"]
    result: dict[str, int | str] = {
        "month_utc": month,
        "total": image_total + metadata_total,
        "this_month": image_month + metadata_month,
        "image_total": image_total,
        "image_this_month": image_month,
        "metadata_total": metadata_total,
        "metadata_this_month": metadata_month,
    }
    if research_id:
        research_hash = sha256(research_id.strip().encode("utf-8")).hexdigest()
        with sqlite3.connect(database_path, timeout=10) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS street_view_research_images (
                    research_hash TEXT PRIMARY KEY,
                    image_count INTEGER NOT NULL CHECK (image_count BETWEEN 0 AND 10)
                )
                """
            )
            row = connection.execute(
                "SELECT image_count FROM street_view_research_images WHERE research_hash = ?",
                (research_hash,),
            ).fetchone()
        result["research_images"] = int(row[0]) if row else 0
    return result


def _record_request(
    request_type: RequestType, requested_at_utc: str, research_hash: str | None = None
) -> dict[str, int | str]:
    database_path = _database_path()
    database_path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(database_path, timeout=10) as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS street_view_requests (
                id INTEGER PRIMARY KEY,
                requested_at_utc TEXT NOT NULL,
                request_type TEXT NOT NULL
                    CHECK (request_type IN ('metadata', 'image'))
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS street_view_research_images (
                research_hash TEXT PRIMARY KEY,
                image_count INTEGER NOT NULL CHECK (image_count BETWEEN 0 AND 10)
            )
            """
        )
        if request_type == "image":
            cursor = connection.execute(
                """
                INSERT INTO street_view_research_images (research_hash, image_count)
                VALUES (?, 1)
                ON CONFLICT(research_hash) DO UPDATE SET image_count = image_count + 1
                WHERE image_count < ?
                """,
                (research_hash, MAX_IMAGES_PER_RESEARCH_SESSION),
            )
            if cursor.rowcount != 1:
                raise ValueError(
                    "Street View image limit reached (10) for this research session. "
                    "Stop, notify the user, and obtain authorization before continuing with another research session."
                )
        connection.execute(
            """
            INSERT INTO street_view_requests (requested_at_utc, request_type)
            VALUES (?, ?)
            """,
            (requested_at_utc, request_type),
        )

    return get_request_counts()


def _empty_counts(month: str) -> dict[str, int | str]:
    return {
        "month_utc": month,
        "total": 0,
        "this_month": 0,
        "image_total": 0,
        "image_this_month": 0,
        "metadata_total": 0,
        "metadata_this_month": 0,
    }
