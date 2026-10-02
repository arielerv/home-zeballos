import unittest

from scripts.architecture.archit_app_adapter import analyze_project, calibrated_image_points, to_archit_building


class ArchitAppAdapterTests(unittest.TestCase):
    def test_calibrated_pixels_map_to_house_plan_coordinates(self):
        calibration = {
            "knownLengthMeters": 2,
            "fromImage": [10, 20],
            "toImage": [20, 20],
            "fromWorld": [2, 3],
            "toWorld": [4, 3],
        }
        mapped = calibrated_image_points([[10, 20], [20, 20], [15, 25]], calibration)
        for actual, expected in zip(mapped, [[2, 3], [4, 3], [3, 2]], strict=True):
            for actual_coordinate, expected_coordinate in zip(actual, expected, strict=True):
                self.assertAlmostEqual(actual_coordinate, expected_coordinate)

    def test_validated_metric_project_preserves_ids_and_exact_plan_metrics(self):
        project = {
            "id": "fixture-project",
            "name": "Synthetic adapter test",
            "units": "meters",
            "coordinateSystem": {"plan": "local-xz", "vertical": "y-up"},
            "targetBuildingId": "finished-house",
            "buildings": [{
                "id": "finished-house",
                "name": "Finished house",
                "levels": [{
                    "id": "ground",
                    "name": "Ground",
                    "index": 0,
                    "elevation": 0,
                    "floorToCeiling": 2.8,
                }],
                "rooms": [{
                    "id": "room-living",
                    "levelId": "ground",
                    "name": "Living",
                    "polygon": [[0, 0], [4, 0], [4, 3], [0, 3]],
                    "designState": "modified",
                }],
                "walls": [
                    {"id": "wall-south", "levelId": "ground", "from": [0, 0], "to": [4, 0], "thickness": 0.15, "height": 2.8, "kind": "exterior", "designState": "retained"},
                    {"id": "wall-east", "levelId": "ground", "from": [4, 0], "to": [4, 3], "thickness": 0.15, "height": 2.8, "kind": "exterior", "designState": "retained"},
                    {"id": "wall-north", "levelId": "ground", "from": [4, 3], "to": [0, 3], "thickness": 0.15, "height": 2.8, "kind": "exterior", "designState": "retained"},
                    {"id": "wall-west", "levelId": "ground", "from": [0, 3], "to": [0, 0], "thickness": 0.15, "height": 2.8, "kind": "exterior", "designState": "retained"},
                ],
                "openings": [],
            }],
        }

        result = analyze_project(project)
        self.assertTrue(result["valid"])
        self.assertEqual(result["findings"], [])
        self.assertEqual(result["geometry"][0]["rooms"][0]["id"], "room-living")
        self.assertEqual(result["geometry"][0]["rooms"][0]["areaM2"], 12)
        self.assertEqual(result["geometry"][0]["walls"][0]["lengthM"], 4)

    def test_refuses_to_guess_missing_floor_height(self):
        project = {
            "units": "meters",
            "coordinateSystem": {"plan": "local-xz", "vertical": "y-up"},
            "targetBuildingId": "building",
            "buildings": [{"id": "building", "levels": [{"id": "ground"}]}],
        }
        with self.assertRaisesRegex(ValueError, "floorToCeiling"):
            to_archit_building(project)


if __name__ == "__main__":
    unittest.main()
