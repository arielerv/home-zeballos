"""Map a validated T3 architectural JSON project into archit-app for analysis.

This adapter accepts metric geometry only. It does not trace or calibrate images.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections.abc import Mapping, Sequence
from importlib.metadata import version
from pathlib import Path
from typing import Any
from uuid import NAMESPACE_URL, UUID, uuid5

from archit_app.analysis.validate import validate
from archit_app.building.building import Building, BuildingMetadata
from archit_app.building.level import Level
from archit_app.elements.opening import Opening, OpeningKind
from archit_app.elements.room import Room
from archit_app.elements.wall import Wall, WallType
from archit_app.geometry.converter import CoordinateConverter
from archit_app.geometry.crs import IMAGE, WORLD
from archit_app.geometry.point import Point2D
from archit_app.geometry.polygon import Polygon2D
from archit_app.geometry.transform import Transform2D


def _stable_uuid(t3_id: str) -> UUID:
    return uuid5(NAMESPACE_URL, f"t3-designer:architecture:{t3_id}")


def _polygon(points: Sequence[Sequence[float]]) -> Polygon2D:
    return Polygon2D(exterior=tuple(Point2D(x=float(point[0]), y=float(point[1])) for point in points))


def calibrated_image_points(
    points: Sequence[Sequence[float]], calibration: Mapping[str, Any]
) -> list[list[float]]:
    """Transform traced image pixels to metric house-plan [X, Z] coordinates.

    Requires two image control points and their corresponding model coordinates.
    Image Y-down is reflected into archit-app's WORLD Y-up convention.
    """
    image_from, image_to = calibration["fromImage"], calibration["toImage"]
    world_from, world_to = calibration["fromWorld"], calibration["toWorld"]
    pixel_dx = float(image_to[0]) - float(image_from[0])
    pixel_dy = -(float(image_to[1]) - float(image_from[1]))
    world_dx = float(world_to[0]) - float(world_from[0])
    world_dy = float(world_to[1]) - float(world_from[1])
    pixel_length = math.hypot(pixel_dx, pixel_dy)
    world_length = math.hypot(world_dx, world_dy)
    known_length = float(calibration["knownLengthMeters"])
    if pixel_length <= 1e-8 or world_length <= 1e-8:
        raise ValueError("Image and world calibration control points must differ")
    if abs(world_length - known_length) > max(0.01, known_length * 0.001):
        raise ValueError("World control-point distance does not match knownLengthMeters")

    scale = world_length / pixel_length
    angle = math.atan2(world_dy, world_dx) - math.atan2(pixel_dy, pixel_dx)
    cosine, sine = math.cos(angle) * scale, math.sin(angle) * scale
    tx = float(world_from[0]) - cosine * float(image_from[0]) - sine * float(image_from[1])
    ty = float(world_from[1]) - sine * float(image_from[0]) + cosine * float(image_from[1])
    transform = Transform2D([
        [cosine, sine, tx],
        [sine, -cosine, ty],
        [0.0, 0.0, 1.0],
    ])
    converter = CoordinateConverter()
    converter.register(IMAGE, WORLD, transform)
    mapped = converter.convert(points, IMAGE, WORLD)
    return [[float(point[0]), float(point[1])] for point in mapped]


def to_archit_building(project: Mapping[str, Any]) -> tuple[Building, dict[str, str], list[dict[str, str]]]:
    """Convert one Zod-validated T3 project into an archit-app building."""
    if project.get("units") != "meters":
        raise ValueError("archit-app adapter requires T3 units='meters'")
    coordinates = project.get("coordinateSystem", {})
    if coordinates.get("plan") != "local-xz" or coordinates.get("vertical") != "y-up":
        raise ValueError("archit-app adapter requires plan=local-xz and vertical=y-up")

    target_id = project.get("targetBuildingId")
    target = next((item for item in project.get("buildings", []) if item.get("id") == target_id), None)
    if target is None:
        raise ValueError("targetBuildingId must resolve to a finished building")

    identity_map: dict[str, str] = {}
    adapter_warnings: list[dict[str, str]] = []
    levels: list[Level] = []

    for source_level in target.get("levels", []):
        level_id = str(source_level["id"])
        floor_height = source_level.get("floorToCeiling")
        if floor_height is None:
            raise ValueError(f"level {level_id!r} needs floorToCeiling before archit-app validation")

        rooms: list[Room] = []
        for source_room in target.get("rooms", []):
            if source_room["levelId"] != level_id:
                continue
            room_id = str(source_room["id"])
            mapped_id = _stable_uuid(room_id)
            identity_map[str(mapped_id)] = room_id
            tags = {"t3_element_id": room_id, "design_state": source_room["designState"]}
            if source_room.get("reportedAreaM2") is not None:
                tags["reported_area_m2"] = source_room["reportedAreaM2"]
            rooms.append(Room(
                id=mapped_id,
                tags=tags,
                boundary=_polygon(source_room["polygon"]),
                name=source_room["name"],
                level_index=int(source_level["index"]),
            ))

        walls_by_id: dict[str, Wall] = {}
        for source_wall in target.get("walls", []):
            if source_wall["levelId"] != level_id:
                continue
            wall_id = str(source_wall["id"])
            mapped_id = _stable_uuid(wall_id)
            identity_map[str(mapped_id)] = wall_id
            kind = source_wall["kind"]
            wall_types = {
                "exterior": WallType.EXTERIOR,
                "interior": WallType.INTERIOR,
                "party": WallType.PARTY,
                "structural": WallType.SHEAR,
                "other": WallType.INTERIOR,
            }
            if kind == "other":
                adapter_warnings.append({
                    "code": "wall_kind_approximated",
                    "elementId": wall_id,
                    "message": "archit-app has no 'other' wall type; mapped to interior and preserved the T3 kind in tags.",
                })
            start, end = source_wall["from"], source_wall["to"]
            walls_by_id[wall_id] = Wall.straight(
                float(start[0]), float(start[1]), float(end[0]), float(end[1]),
                thickness=float(source_wall["thickness"]),
                height=float(source_wall["height"]),
                wall_type=wall_types[kind],
                id=mapped_id,
                tags={"t3_element_id": wall_id, "design_state": source_wall["designState"], "t3_wall_kind": kind},
            )

        openings: list[Opening] = []
        for source_opening in target.get("openings", []):
            if source_opening["levelId"] != level_id:
                continue
            opening_id = str(source_opening["id"])
            wall_id = str(source_opening["wallId"])
            wall = walls_by_id.get(wall_id)
            if wall is None:
                raise ValueError(f"opening {opening_id!r} references a wall outside level {level_id!r}")
            length = wall.length
            width = float(source_opening["width"])
            offset = float(source_opening["offset"])
            if length <= 0 or offset < 0 or offset + width > length + 1e-8:
                raise ValueError(f"opening {opening_id!r} is outside its host wall")
            center_fraction = (offset + width / 2) / length
            kind = {"door": OpeningKind.DOOR, "window": OpeningKind.WINDOW, "other": OpeningKind.PASS_THROUGH}[source_opening["kind"]]
            if source_opening["kind"] == "other":
                adapter_warnings.append({
                    "code": "opening_kind_approximated",
                    "elementId": opening_id,
                    "message": "archit-app has no generic 'other' opening type; mapped to pass_through.",
                })
            mapped_id = _stable_uuid(opening_id)
            identity_map[str(mapped_id)] = opening_id
            opening = Opening.on_wall(
                wall,
                kind=kind,
                position_along_wall=center_fraction,
                width=width,
                height=float(source_opening["height"]),
                sill_height=float(source_opening.get("sillHeight") or 0),
                id=mapped_id,
                tags={"t3_element_id": opening_id, "design_state": source_opening["designState"]},
            )
            openings.append(opening)
            walls_by_id[wall_id] = walls_by_id[wall_id].add_opening(opening)

        levels.append(Level(
            index=int(source_level["index"]),
            elevation=float(source_level["elevation"]),
            floor_height=float(floor_height),
            name=source_level["name"],
            rooms=tuple(rooms),
            walls=tuple(walls_by_id.values()),
            openings=tuple(openings),
        ))

    building = Building(
        metadata=BuildingMetadata(name=str(project["name"])),
        levels=tuple(levels),
    )
    return building, identity_map, adapter_warnings


def analyze_project(project: Mapping[str, Any]) -> dict[str, Any]:
    building, identity_map, adapter_warnings = to_archit_building(project)
    findings = sorted(
        validate(building),
        key=lambda finding: (
            -1 if finding.level_index is None else finding.level_index,
            finding.severity,
            finding.code,
            finding.element_id or "",
        ),
    )
    records = []
    for finding in findings:
        record = finding.to_dict()
        original_id = identity_map.get(record["element_id"])
        record["t3_element_id"] = original_id
        records.append(record)
    geometry = []
    for level in building.levels:
        geometry.append({
            "index": level.index,
            "name": level.name,
            "rooms": [{
                "id": identity_map.get(str(room.id)),
                "areaM2": room.area,
                "centroid": [room.centroid.x, room.centroid.y],
            } for room in level.rooms],
            "walls": [{
                "id": identity_map.get(str(wall.id)),
                "from": list(wall.start_point) if wall.start_point is not None else None,
                "to": list(wall.end_point) if wall.end_point is not None else None,
                "lengthM": wall.length,
                "heightM": wall.height,
                "thicknessM": wall.thickness,
            } for wall in level.walls],
        })
    return {
        "engine": {"name": "archit-app", "version": version("archit-app")},
        "projectId": project.get("id"),
        "targetBuildingId": project.get("targetBuildingId"),
        "valid": not any(finding.severity == "error" for finding in findings),
        "geometry": geometry,
        "adapterWarnings": adapter_warnings,
        "findings": records,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate T3 architectural geometry with archit-app.")
    parser.add_argument("input", type=Path, help="JSON exported from the validated T3 ArchitecturalProject model")
    args = parser.parse_args()
    try:
        project = json.loads(args.input.read_text(encoding="utf-8"))
        if not isinstance(project, dict):
            raise ValueError("the project JSON root must be an object")
        result = analyze_project(project)
    except (OSError, json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
        print(json.dumps({"valid": False, "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
