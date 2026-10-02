"""Pixel audit regressions; synthetic checks don't approve the house trace."""

import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SPEC = importlib.util.spec_from_file_location("audit_casa_pixels", ROOT / "scripts/architecture/audit_casa_pixels.py")
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class CasaPixelAuditTests(unittest.TestCase):
    def setUp(self):
        self.trace = json.loads((ROOT / "assets/reference/casa-tentative-trace-draft.json").read_text())
        self.corrections = json.loads((ROOT / "assets/reference/casa-owner-corrections-review.json").read_text())

    def test_current_draft_keeps_pixel_units_and_unresolved_access_findings(self):
        report = MODULE.audit(self.trace, self.corrections)
        self.assertEqual(report["units"], "pixels")
        self.assertEqual(len(report["rooms"]), 11)
        self.assertTrue(any(item["code"] == "room.no_evidenced_exterior_path" for item in report["findings"]))
        self.assertFalse(any(item["code"] == "walls.duplicate_interval" for item in report["findings"]))
        self.assertNotIn("metricAreaM2", report["rooms"][0])

    def test_detects_duplicate_wall_and_invalid_room(self):
        self.corrections["wallSegmentsPixels"].append(self.corrections["wallSegmentsPixels"][0])
        self.trace["rooms"][0]["polygonPixels"] = [[0, 0], [10, 10], [0, 10], [10, 0]]
        # Use no accesses for a synthetic invalid polygon; don't measure against it.
        self.corrections["accessesPixels"] = []
        codes = {item["code"] for item in MODULE.audit(self.trace, self.corrections)["findings"]}
        self.assertIn("walls.duplicate_interval", codes)
        self.assertIn("polygon.invalid", codes)


if __name__ == "__main__":
    unittest.main()