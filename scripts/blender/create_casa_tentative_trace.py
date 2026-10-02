"""Create a review-only, unscaled 2D trace scene from Casa's tentative plan.

This is deliberately not a 3D house model. All trace coordinates are source-image
pixels, room outlines are approximate and unreviewed, and no walls are extruded.
The prior Casa .blend is never opened or modified.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
SOURCE_IMAGE = ROOT / "assets/reference/casa-2071-planta-limpia.png"
TRACE_DATA = ROOT / "assets/reference/casa-tentative-trace-draft.json"
OUTPUT_BLEND = ROOT / "assets/blender/casa-2071-tentative-trace-review.blend"
OUTPUT_RENDER = ROOT / "assets/blender/casa-2071-tentative-trace-review.png"
WEB_OUTPUT_BLEND = ROOT / "apps/web/public/models/casa-2071/casa-2071-tentative-trace-review.blend"

with TRACE_DATA.open(encoding="utf-8") as stream:
    trace = json.load(stream)

source = trace["source"]
width = int(source["widthPixels"])
height = int(source["heightPixels"])
if not SOURCE_IMAGE.is_file():
    raise FileNotFoundError(SOURCE_IMAGE)
if not TRACE_DATA.is_file():
    raise FileNotFoundError(TRACE_DATA)

# Start with a clean, separate scene. Never open or save the historical Casa blend.
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = "Casa 2071 · traza tentativa 2D · sin escala"
scene["project_id"] = "casa-2071"
scene["artifact_status"] = "draft-unreviewed"
scene["coordinate_system"] = "source-image-pixels-origin-top-left"
scene["metric_calibration"] = "blocked"
scene["source_image"] = source["path"]
scene["source_sha256"] = source["sha256"]
scene["warning"] = "No es un modelo 3D, mensura ni plano aprobado. Revisar trazas 2D antes de calibrar/extruir."
scene.render.resolution_x = width
scene.render.resolution_y = height
scene.render.resolution_percentage = 100


def new_collection(name: str) -> bpy.types.Collection:
    collection = bpy.data.collections.new(name)
    scene.collection.children.link(collection)
    return collection


reference_collection = new_collection("00 · FUENTE ORIGINAL · píxeles")
room_collection = new_collection("01 · TRAZA DE AMBIENTES · BORRADOR")
label_collection = new_collection("02 · IDs y áreas fuente · BORRADOR")


def emission_material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    emission = nodes.new("ShaderNodeEmission")
    color_input = next(socket for socket in emission.inputs if socket.type == "RGBA")
    emission_output = next(socket for socket in emission.outputs if socket.type == "SHADER")
    color_input.default_value = color
    output = nodes.new("ShaderNodeOutputMaterial")
    surface_input = next(socket for socket in output.inputs if socket.type == "SHADER")
    material.node_tree.links.new(emission_output, surface_input)
    return material


trace_material = emission_material("Traza provisional · cian", (0.0, 0.72, 0.95, 1.0))
label_material = emission_material("Etiquetas de revisión · amarillo", (1.0, 0.66, 0.04, 1.0))

# Reference plane is exactly width x height in source pixels, centered on origin.
image = bpy.data.images.load(str(SOURCE_IMAGE), check_existing=True)
image.pack()
image_material = bpy.data.materials.new("Plano tentativa original · raster intacto")
image_material.diffuse_color = (1.0, 1.0, 1.0, 1.0)
image_material.use_nodes = True
nodes = image_material.node_tree.nodes
nodes.clear()
texture = nodes.new("ShaderNodeTexImage")
texture.image = image
image_emission = nodes.new("ShaderNodeEmission")
output = nodes.new("ShaderNodeOutputMaterial")
texture_color = next(socket for socket in texture.outputs if socket.type == "RGBA")
emission_color = next(socket for socket in image_emission.inputs if socket.type == "RGBA")
image_shader = next(socket for socket in image_emission.outputs if socket.type == "SHADER")
surface_input = next(socket for socket in output.inputs if socket.type == "SHADER")
image_material.node_tree.links.new(texture_color, emission_color)
image_material.node_tree.links.new(image_shader, surface_input)

vertices = [
    (-width / 2, -height / 2, 0.0),
    (width / 2, -height / 2, 0.0),
    (width / 2, height / 2, 0.0),
    (-width / 2, height / 2, 0.0),
]
mesh = bpy.data.meshes.new("Raster source · 1158 × 852 px")
mesh.from_pydata(vertices, [], [(0, 1, 2, 3)])
mesh.update()
uv_layer = mesh.uv_layers.new(name="Source image UV")
for loop, uv in zip(uv_layer.data, ((0, 0), (1, 0), (1, 1), (0, 1)), strict=True):
    loop.uv = uv
raster = bpy.data.objects.new("SOURCE · planta limpia · sin modificar", mesh)
raster.data.materials.append(image_material)
raster["source_path"] = trace["source"]["path"]
raster["source_sha256"] = trace["source"]["sha256"]
raster["coordinate_units"] = "pixels"
raster["metric_calibration"] = "blocked"
reference_collection.objects.link(raster)


def pixel_to_scene(point: list[float], z: float) -> tuple[float, float, float]:
    x_px, y_px = point
    return (x_px - width / 2, height / 2 - y_px, z)


def add_outline(room: dict) -> None:
    curve = bpy.data.curves.new(f"{room['id']} · contorno tentativo en px", "CURVE")
    curve.resolution_u = 1
    curve.bevel_depth = 1.35
    curve.bevel_resolution = 0
    spline = curve.splines.new("POLY")
    points = room["polygonPixels"]
    spline.points.add(len(points) - 1)
    for point, pixel in zip(spline.points, points, strict=True):
        point.co = (*pixel_to_scene(pixel, 2.0), 1.0)
    spline.use_cyclic_u = True
    obj = bpy.data.objects.new(f"{room['id']} · contorno aproximado · REVISAR", curve)
    obj.data.materials.append(trace_material)
    obj["stable_id"] = room["id"]
    obj["source_room_id"] = room["sourceRoomId"]
    obj["source_label"] = room["label"] or ""
    obj["printed_area_m2_constraint_only"] = room["printedAreaM2"]
    obj["polygon_pixels_top_left_origin"] = json.dumps(points, separators=(",", ":"))
    obj["provenance"] = "approximate visual trace from supplied raster"
    obj["review_status"] = "unreviewed-draft"
    obj["metric_geometry"] = False
    room_collection.objects.link(obj)

    # Place a small ID near the trace's upper-left extent, away from the source
    # area text where possible. It is not a measured room centroid.
    min_x = min(point[0] for point in points)
    min_y = min(point[1] for point in points)
    text_data = bpy.data.curves.new(f"{room['id']} · etiqueta fuente", "FONT")
    text_data.body = room["id"]
    text_data.size = 9.0
    text_obj = bpy.data.objects.new(f"{room['id']} · etiqueta · REVISAR", text_data)
    text_obj.location = pixel_to_scene([min_x + 8.0, min_y + 16.0], 3.0)
    text_obj.data.materials.append(label_material)
    text_obj["source_label"] = room["label"] or "unlabeled in source"
    text_obj["printed_area_m2_constraint_only"] = room["printedAreaM2"]
    text_obj["provenance"] = "transcribed from source register; area is not a calibration"
    label_collection.objects.link(text_obj)


for room in trace["rooms"]:
    add_outline(room)

# Orthographic top view; no artificial heights, levels, site edges or north.
camera_data = bpy.data.cameras.new("Cámara · planta en coordenadas de píxel")
ortho_type = next(
    item.identifier for item in camera_data.bl_rna.properties["type"].enum_items
    if item.name.lower() == "orthographic"
)
camera_data.type = ortho_type
camera_data.ortho_scale = max(width, height) * 1.04
camera_data.clip_end = 5000.0
camera = bpy.data.objects.new("Camera · source pixels", camera_data)
camera.location = (0.0, 0.0, 2000.0)
camera.rotation_euler = (0.0, 0.0, 0.0)
scene.collection.objects.link(camera)
scene.camera = camera
scene.render.filepath = str(OUTPUT_RENDER)
file_format = next(
    item.identifier for item in scene.render.image_settings.bl_rna.properties["file_format"].enum_items
    if "png" in item.name.lower()
)
scene.render.image_settings.file_format = file_format

# Keep the viewport in a readable, editable top view when the file is opened.
from mathutils import Vector

for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == "VIEW_3D":
            space = area.spaces.active
            space.region_3d.view_rotation = Vector((0, 0, -1)).to_track_quat("-Z", "Y")
            perspective_property = space.region_3d.bl_rna.properties["view_perspective"]
            orthographic_id = next(item.identifier for item in perspective_property.enum_items if item.name.lower() == "orthographic")
            space.region_3d.view_perspective = orthographic_id
            space.region_3d.view_distance = float(max(width, height) * 1.3)
            space.region_3d.view_location = (0.0, 0.0, 0.0)
            space.overlay.show_floor = False
            space.overlay.show_axis_x = False
            space.overlay.show_axis_y = False

os.makedirs(OUTPUT_BLEND.parent, exist_ok=True)
os.makedirs(WEB_OUTPUT_BLEND.parent, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0
backup_path = OUTPUT_BLEND.with_suffix(OUTPUT_BLEND.suffix + "1")
if backup_path.exists():
    backup_path.unlink()
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
bpy.ops.wm.save_as_mainfile(filepath=str(WEB_OUTPUT_BLEND))
bpy.ops.render.render(write_still=True)
print(f"Saved review-only 2D trace scene: {OUTPUT_BLEND}")
print(f"Saved downloadable review-only scene: {WEB_OUTPUT_BLEND}")
print(f"Saved source overlay render: {OUTPUT_RENDER}")
print("Status: unreviewed pixel-space trace; no 3D geometry or metric calibration created.")
