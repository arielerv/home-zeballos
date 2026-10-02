"""Tests for the persistent Street View API request counter."""

import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from scripts.street_view_usage import MAX_IMAGES_PER_RESEARCH_SESSION, get_request_counts, record_request


class StreetViewUsageTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        database_path = Path(self.temp_dir.name) / "usage.sqlite3"
        self.env = patch.dict(os.environ, {"STREET_VIEW_USAGE_DB": str(database_path)})
        self.env.start()

    def tearDown(self) -> None:
        self.env.stop()
        self.temp_dir.cleanup()

    def test_counts_persist_and_separate_metadata_from_images(self) -> None:
        record_request("metadata")
        image_counts = record_request("image", "fixture-research")
        persisted_counts = get_request_counts()

        self.assertEqual(image_counts, persisted_counts)
        self.assertEqual(persisted_counts["total"], 2)
        self.assertEqual(persisted_counts["this_month"], 2)
        self.assertEqual(persisted_counts["metadata_total"], 1)
        self.assertEqual(persisted_counts["image_total"], 1)
        self.assertEqual(persisted_counts["metadata_this_month"], 1)
        self.assertEqual(persisted_counts["image_this_month"], 1)

    def test_rejects_unknown_request_type(self) -> None:
        with self.assertRaises(ValueError):
            record_request("other")  # type: ignore[arg-type]

    def test_limits_each_research_session_to_ten_images_and_stores_no_raw_id(self) -> None:
        research_id = "property-address-research-secret"
        for _ in range(MAX_IMAGES_PER_RESEARCH_SESSION):
            record_request("image", research_id)
        self.assertEqual(get_request_counts(research_id)["research_images"], 10)
        with self.assertRaisesRegex(ValueError, r"limit reached \(10\).*notify the user"):
            record_request("image", research_id)

        other_session = "different-property-research"
        self.assertEqual(record_request("image", other_session)["image_total"], 11)
        self.assertEqual(get_request_counts(other_session)["research_images"], 1)

        database_path = Path(os.environ["STREET_VIEW_USAGE_DB"])
        with sqlite3.connect(database_path) as connection:
            identifiers = connection.execute("SELECT research_hash FROM street_view_research_images").fetchall()
        self.assertNotIn(research_id, repr(identifiers))
        self.assertEqual(len(identifiers[0][0]), 64)


if __name__ == "__main__":
    unittest.main()
