import hashlib
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class ArchitecturePolicyTests(unittest.TestCase):
    def test_every_product_capability_is_a_required_release_gate(self):
        manifest = json.loads((ROOT / "scripts/architecture/capabilities.json").read_text())
        self.assertGreater(len(manifest["capabilities"]), 0)
        for capability in manifest["capabilities"]:
            with self.subTest(capability=capability["id"]):
                self.assertIs(capability["required"], True)
                self.assertIn(capability["status"], {"implemented", "partial", "blocked"})
                self.assertTrue(capability["dependencies"])
                self.assertTrue(capability["gates"])

    def test_tentative_plan_transcription_is_the_design_authority(self):
        source = json.loads((ROOT / "assets/reference/casa-tentative-plan-data.json").read_text())
        self.assertEqual(source["source"]["role"], "user-design-authority")
        self.assertTrue(source["source"]["supersedesConflictingPriorBlender"])
        source_bytes = (ROOT / source["source"]["path"]).read_bytes()
        self.assertEqual(hashlib.sha256(source_bytes).hexdigest(), source["source"]["sha256"])
        self.assertEqual(source["source"]["path"], "assets/reference/casa-2071-planta-limpia.png")
        self.assertEqual(source["source"]["supersedes"]["status"], "archived-only-not-design-authority")
        self.assertEqual(source["ownerProvisional3DInputs2026-10-02"]["wallHeightMetres"], 2.8)
        self.assertEqual(source["ownerProvisional3DInputs2026-10-02"]["leftVolumeLevels"], 1)
        self.assertIn("Google Maps or Street View", source["ownerProvisional3DInputs2026-10-02"]["realPhotosMeaning"])
        self.assertEqual(source["ownerProvisional3DInputs2026-10-02"]["planScale"], "unverified-no-reviewed-horizontal-distance")
        self.assertEqual(source["ownerParcelConfirmation2026-10-02"]["lots"], [8, 10])
        self.assertEqual(source["ownerParcelConfirmation2026-10-02"]["registrationToCleanPlan"], "no reviewed common points")
        self.assertEqual(source["source"]["metricCalibration"], "unverified")
        self.assertIn("Controls the target finished layout", source["designAuthority"]["tentativePlan"])
        self.assertIn("were demolished", source["designAuthority"]["ownerDemolitionCorrection2026-10-02"])
        self.assertIn("corroborated", source["designAuthority"]["retainedExisting"])
        self.assertIn("explicitly supports its height", source["designAuthority"]["heightCarryForward"])
        self.assertEqual(len(source["rooms"]), 11)
        self.assertEqual(
            [room["printedAreaM2"] for room in source["rooms"]],
            [38.35, 3.65, 2.3, 7.27, 15.31, 4.55, 14.54, 28.09, 15.5, 8.11, 4.32],
        )
        self.assertIsNone(source["rooms"][4]["label"])
        self.assertIsNone(source["rooms"][6]["label"])
        self.assertTrue(all(note["parsedMetricValue"] is None for note in source["annotations"]))
        self.assertIs(source["rules"]["userResearchPhotosMayBePublished"], False)
        self.assertIs(source["rules"]["sameBlockAdjoiningHomesOnlyForNeighbors"], True)
        self.assertIs(source["rules"]["crossStreetCommercialFrontageIsNotNeighbor"], True)
        self.assertEqual(source["rules"]["streetViewMcpRecommendedImagesPerHouse"], 5)
        self.assertEqual(source["rules"]["streetViewMcpMaximumImagesBeforeNotice"], 10)
        self.assertIs(source["rules"]["roomDoorAccessAndExteriorEgressAuditRequired"], True)
        self.assertIs(source["rules"]["threeSectionTypesRequired"], True)
        for rule in (
            "buildingAndSunShowsMovingSunPath", "studyCoordinatesAndTimezoneVisible",
            "buildingApartmentCompassAndSunLabelsRequired", "perspectiveCameraIsDiagonal",
            "floorPlanCameraIsTopDown", "manualCameraOrbitPanZoomPreserved",
            "cameraResetReturnsToPreset", "sunRoomsFixturesPanelsPreserved", "noNewTopLevelTabsOrMenus",
        ):
            with self.subTest(rule=rule):
                self.assertIs(source["rules"][rule], True)

    def test_required_architecture_gates_keep_core_solar_and_house_audits(self):
        manifest = json.loads((ROOT / "scripts/architecture/capabilities.json").read_text())
        ids = {capability["id"] for capability in manifest["capabilities"]}
        for required_id in ("solar-study", "room-access-egress", "three-section-cuts", "same-block-neighbors"):
            with self.subTest(capability=required_id):
                self.assertIn(required_id, ids)
                capability = next(item for item in manifest["capabilities"] if item["id"] == required_id)
                self.assertIs(capability["required"], True)

        app = (ROOT / "apps/web/src/App.tsx").read_text()
        self.assertIn("<BuildingExplorer solar={solar}", app)
        self.assertIn("<ApartmentExplorer solar={solar}", app)
        workflow = (ROOT / "docs/workflows/casa-bim.md").read_text()
        self.assertIn("stop at 10", workflow)
        self.assertIn("4–5", workflow)
        self.assertIn("same-block", workflow)

    def test_existing_solar_and_camera_control_semantics_are_binding(self):
        constitution = (ROOT / "constitutions.md").read_text()
        for term in (
            "Cutaway", "Fixtures", "Labels", "Sun / Rooms / Fixtures", "Perspective",
            "Floor plan", "Reset", "altitud", "azimut", "gráfico horario", "No crear tabs",
        ):
            with self.subTest(term=term):
                self.assertIn(term, constitution)

    def test_required_ifc_dxf_and_planar_libraries_are_pinned(self):
        requirements = (ROOT / "scripts/requirements-architecture.txt").read_text().splitlines()
        for package in ("ifcopenshell==0.8.4", "ezdxf==1.4.2", "shapely==2.1.2"):
            with self.subTest(package=package):
                self.assertIn(package, requirements)

        import ezdxf
        import ifcopenshell
        import shapely

        self.assertTrue(ezdxf.__version__)
        self.assertTrue(ifcopenshell.version)
        self.assertTrue(shapely.__version__)


if __name__ == "__main__":
    unittest.main()
