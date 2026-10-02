"""Build a *visual review sketch*, not a calibrated architectural model.

The source coordinates are the owner's clean plan pixels. The 0.01 display factor
is chosen only to fit the web viewer; it is NOT a pixel-to-metre calibration.
This file must never be used as a survey, BIM snapshot, solar-shadow model, or
the source for IFC/DXF/DWG/OBJ interchange. Keep the historic Blender untouched.
"""

import hashlib
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
TRACE = ROOT / "assets/reference/casa-tentative-trace-draft.json"
ROOF_TRACE = ROOT / "assets/reference/casa-roof-review-draft.json"
HISTORICAL_SITE = ROOT / "specs/001-initial-imports/casa-2071-revision.blend"
SOURCE = ROOT / "assets/reference/casa-2071-planta-limpia.png"
BLEND = ROOT / "assets/blender/casa-2071-maqueta-revision.blend"
RENDER = ROOT / "assets/blender/casa-2071-maqueta-revision.png"
GLB = ROOT / "apps/web/public/models/casa-2071/casa-2071-maqueta-revision.glb"
trace = json.loads(TRACE.read_text(encoding="utf-8"))
roof_trace = json.loads(ROOF_TRACE.read_text(encoding="utf-8"))
assert trace["source"]["sha256"] == hashlib.sha256(SOURCE.read_bytes()).hexdigest()
assert trace["coordinateSystem"] == "source-image-pixels-origin-top-left"
assert trace["metricCalibration"].startswith("blocked")

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.name = "Casa 2071 · MAQUETA VISUAL SIN ESCALA"
scene["project_id"] = "casa-2071"
scene["artifact_status"] = "visual-review-only-not-BIM"
scene["source_image"] = trace["source"]["path"]
scene["source_sha256"] = trace["source"]["sha256"]
scene["coordinate_system"] = "source-image-pixels-scaled-for-display-NOT-metres"
scene["metric_calibration"] = "blocked"
scene["height_note"] = "2.8 m owner-authorized provisional intent; illustrative vertical display only"
scene["roof_note"] = "Multiple pitched roof volumes for visual review. Left-wing ridge axis owner-corrected; extents, pitch and eaves unverified; see casa-roof-review-draft.json"
scene["site_note"] = "Original Blender site contour, paving, pool, garage and entrance are retained verbatim as prior-state context. New house is visually positioned, not cadastral registration. Neighbors NOT modeled."
scene["site_source"] = "specs/001-initial-imports/casa-2071-revision.blend"
scene["validation"] = "Owner authorized 2D then illustrative 3D for feedback; wall vertices and all metric BIM/release gates unreviewed/BLOCKED"

GROUPS = {
    "site": "01 - Terreno y jardin",
    "room": "02 - Ambientes trazados",
    "wall": "03 - Muros en corte a 1.10 m",
    "upper": "04 - Muros superiores - ocultos en corte",
    "fixtures": "05 - Equipamiento orientativo",
    "labels": "06 - Rotulos de planta",
    "roof": "07 - Cubierta ilustrativa",
}
collections = {}
for role, name in GROUPS.items():
    collection = bpy.data.collections.new(name)
    scene.collection.children.link(collection)
    collections[role] = collection


def material(name, rgba):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = rgba
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    next(socket for socket in shader.inputs if socket.type == "RGBA").default_value = rgba
    output = nodes.new("ShaderNodeOutputMaterial")
    mat.node_tree.links.new(
        next(socket for socket in shader.outputs if socket.type == "SHADER"),
        next(socket for socket in output.inputs if socket.type == "SHADER"),
    )
    return mat


wall_material = material("Muros · blanco cálido · borrador", (0.92, 0.9, 0.84, 1))
cut_material = material("Corte · grafito · borrador", (0.43, 0.47, 0.46, 1))
tile_material = material("Teja · referencia visual", (0.65, 0.29, 0.18, 1))
label_material = material("Rótulos independientes", (0.15, 0.25, 0.30, 1))
garden_material = material("Exterior visible en planta", (0.50, 0.62, 0.40, 1))
furniture_material = material("Muebles dibujados · posición visual", (0.48, 0.34, 0.22, 1))
floor_materials = [
    material(f"Ambiente {i+1:02} · piso de revisión", (r, g, b, 1))
    for i, (r, g, b) in enumerate([
        (.83, .77, .65), (.65, .73, .71), (.72, .75, .72),
        (.79, .75, .69), (.72, .75, .68), (.66, .77, .73),
        (.75, .76, .72), (.86, .82, .73), (.74, .76, .81),
        (.78, .74, .65), (.75, .74, .72),
    ])
]


def xy(px, py):
    """Position new house on the old site's former house area for visual review.

    This is an UNREVIEWED display-only registration, never metres or survey.
    The original site's own mesh and transform remain completely unchanged.
    """
    return (6.9 + (px - 620) * .0135, 5.25 + (450 - py) * .0135)


def link(obj, role, mat):
    collections[role].objects.link(obj)
    obj["casaCollection"] = GROUPS[role]
    obj["source_sha256"] = trace["source"]["sha256"]
    obj["metric_geometry"] = False
    obj.data.materials.append(mat)
    return obj


def polygon(name, pixels, level, role, mat):
    verts = [(*xy(*point), level) for point in pixels]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], [tuple(range(len(verts)))])
    mesh.update()
    return link(bpy.data.objects.new(name, mesh), role, mat)


for index, room in enumerate(trace["rooms"]):
    poly = room["polygonPixels"]
    floor = polygon(room["id"] + " · planta limpia · suelo", poly, .015, "room", floor_materials[index])
    floor["stable_id"] = room["id"]
    floor["printed_area_constraint_only"] = room["printedAreaM2"]
    floor["source_polygon_pixels"] = json.dumps(poly)
    if room["label"]:
        text = bpy.data.curves.new(room["id"] + " · rótulo", "FONT")
        text.body = room["label"]
        text.size = .15
        text.align_x = "CENTER"
        label = bpy.data.objects.new(room["id"] + " · rótulo independiente", text)
        center_x = sum(p[0] for p in poly) / len(poly)
        center_y = sum(p[1] for p in poly) / len(poly)
        label.location = (*xy(center_x, center_y), .04)
        label["stable_id"] = room["id"]
        link(label, "labels", label_material)

# Only site-specific original objects are imported. In particular, do NOT copy
# any original interior room, furniture, or house wall: those were demolished.
site_names = {
    "Contorno trazado de la planta - no mensura", "Solado alrededor de pileta",
    "Acceso Zeballos", "Pileta - borde", "Pileta - espejo de agua",
    "GARAJE / SALIDA",
    *(f"Limite de plano {index}" for index in range(7)),
    *(f"Exterior {part} {index}" for part in (10, 11) for index in range(3)),
}
with bpy.data.libraries.load(str(HISTORICAL_SITE), link=False) as (source_data, dest_data):
    missing = site_names - set(source_data.objects)
    if missing:
        raise RuntimeError(f"Original site objects missing: {sorted(missing)}")
    dest_data.objects = sorted(site_names)

historical_hash = hashlib.sha256(HISTORICAL_SITE.read_bytes()).hexdigest()
for obj in dest_data.objects:
    # Original pool boundaries are Blender curves; make exportable meshes without
    # moving vertices or changing their original coordinates.
    collections["site"].objects.link(obj)
    if obj.type == "CURVE":
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target="MESH")
        obj = bpy.context.view_layer.objects.active
    obj["casaCollection"] = GROUPS["site"]
    obj["source_blend"] = "specs/001-initial-imports/casa-2071-revision.blend"
    obj["source_sha256"] = historical_hash
    obj["metric_geometry"] = False
    obj["provenance"] = "unaltered prior-state exterior context; not a cadastral survey"

# Coordinates below are approximate visual axes read on the clean drawing.
# Door gaps are left where the source depicts doors; kitchen and dining have NO
# separating wall. No historical tabique is imported from the previous Blender.
wall_segments = [
    ((111, 122), (330, 122)), ((610, 122), (1140, 122)),
    ((111, 122), (163, 314)), ((163, 314), (163, 837)),
    ((1140, 122), (1140, 837)),
    ((163, 470), (318, 470)), ((369, 470), (728, 470)),
    ((729, 470), (771, 470)), ((850, 470), (882, 470)), ((935, 470), (1140, 470)),
    ((369, 507), (369, 535)), ((369, 535), (369, 741)),
    ((369, 790), (369, 837)), ((163, 507), (320, 507)),
    ((369, 507), (369, 710)), ((163, 710), (369, 710)),
    ((369, 741), (489, 741)), ((540, 741), (540, 837)),
    ((369, 837), (425, 837)), ((477, 837), (540, 837)),
    ((540, 772), (850, 772)),
    ((850, 470), (850, 497)), ((850, 545), (850, 715)),
    ((850, 769), (850, 837)), ((850, 701), (1140, 701)),
    ((850, 837), (939, 837)), ((1072, 837), (1140, 837)),
    ((730, 122), (730, 219)), ((730, 219), (730, 255)),
    ((730, 318), (730, 470)), ((607, 278), (662, 278)),
    ((607, 278), (607, 470)), ((730, 219), (915, 219)),
    ((915, 122), (915, 257)), ((915, 318), (915, 470)),
    ((844, 219), (844, 376)), ((844, 376), (915, 376)),
]


def beam(name, a, b, bottom, top, width, role, mat):
    ax, ay = xy(*a)
    bx, by = xy(*b)
    length = math.hypot(bx - ax, by - ay)
    if length < .01:
        return
    # Locally oriented cuboid, centered between the two plan endpoints.
    vx = (bx - ax) / length
    vy = (by - ay) / length
    nx, ny = -vy * width / 2, vx * width / 2
    points = [
        (ax + nx, ay + ny, bottom), (ax - nx, ay - ny, bottom),
        (bx - nx, by - ny, bottom), (bx + nx, by + ny, bottom),
        (ax + nx, ay + ny, top), (ax - nx, ay - ny, top),
        (bx - nx, by - ny, top), (bx + nx, by + ny, top),
    ]
    faces = [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4),
             (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], faces)
    mesh.update()
    return link(bpy.data.objects.new(name, mesh), role, mat)


for index, (start, end) in enumerate(wall_segments):
    base_name = f"MURO VISUAL {index + 1:02} · eje en píxeles"
    beam(base_name + " · corte", start, end, .04, .85, .065, "wall", cut_material)
    beam(base_name + " · alto", start, end, .85, 2.65, .065, "upper", wall_material)


# Optional fixtures are simple silhouettes of furniture actually visible in the
# clean source, not furniture specifications or inferred room dimensions.
for name, start, end, width in [
    ("Mesa comedor", (370, 223), (470, 223), .62),
    ("Sofá sala", (205, 250), (305, 250), .42),
    ("Cama habitación superior derecha", (957, 231), (957, 325), .56),
    ("Cama habitación 3", (192, 605), (295, 605), .67),
    ("Mesa living", (660, 640), (735, 640), .43),
]:
    fixture = beam(name + " · silueta orientativa", start, end, .06, .25, width, "fixtures", furniture_material)
    fixture["provenance"] = "visible approximate position on the clean source plan"

# Review-only roofs: the owner corrected the left-wing ridge direction. The
# aerial shows multiple roof masses but does not register them to plan pixels.
# Each 2D extent/axis is recorded separately for review; no patio roofs.
def roof_plane(name, corners):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(corners, [], [(0, 1, 2, 3)])
    mesh.update()
    obj = link(bpy.data.objects.new(name, mesh), "roof", tile_material)
    obj["pitch_and_ridge"] = "illustrative-unmeasured"
    obj["roof_trace"] = "assets/reference/casa-roof-review-draft.json"
    return obj


for volume in roof_trace["volumes"]:
    x0, y0, x1, y1 = volume["boundsPixels"]
    left, far = xy(x0, y0)
    right, near = xy(x1, y1)
    if volume["ridgeAxis"] == "y":
        middle = (left + right) / 2
        faces = [
            [(left, far, 2.72), (left, near, 2.72), (middle, near, 3.32), (middle, far, 3.32)],
            [(middle, far, 3.32), (middle, near, 3.32), (right, near, 2.72), (right, far, 2.72)],
        ]
    else:
        middle = (far + near) / 2
        faces = [
            [(left, far, 2.72), (right, far, 2.72), (right, middle, 3.32), (left, middle, 3.32)],
            [(left, middle, 3.32), (right, middle, 3.32), (right, near, 2.72), (left, near, 2.72)],
        ]
    for index, face in enumerate(faces, 1):
        roof = roof_plane(f"Tejas · {volume['id']} · faldón {index}", face)
        roof["ridge_axis_plan"] = volume["ridgeAxis"]
        roof["review_status"] = volume["status"]

# Neutral studio illumination: this is NOT a georeferenced sun simulation.
world = bpy.data.worlds.new("Iluminación de maqueta · no estudio solar")
scene.world = world
world.use_nodes = True
background = next(node for node in world.node_tree.nodes if node.type == "BACKGROUND")
next(socket for socket in background.inputs if socket.type == "RGBA").default_value = (.40, .46, .50, 1)
light_data = bpy.data.lights.new("Luz de estudio sin norte", "AREA")
light = bpy.data.objects.new("Luz de estudio sin norte", light_data)
scene.collection.objects.link(light)
light.location = (1, 0, 12)
light_data.energy = 700
light_data.shape = next(item.identifier for item in light_data.bl_rna.properties["shape"].enum_items if item.name.lower() == "disk")
light_data.size = 14
camera_data = bpy.data.cameras.new("Perspectiva de revisión")
camera = bpy.data.objects.new("Perspectiva de revisión", camera_data)
scene.collection.objects.link(camera)
camera.location = (24, -18, 31)
camera.rotation_euler = (Vector((8, 12, .2)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = next(item.identifier for item in camera_data.bl_rna.properties["type"].enum_items if item.name.lower() == "orthographic")
camera_data.ortho_scale = 42
scene.camera = camera
scene.render.resolution_x = 1400
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = next(item.identifier for item in scene.render.image_settings.bl_rna.properties["file_format"].enum_items if "png" in item.name.lower())
scene.render.filepath = str(RENDER)

# Blender's saved default view is perspective and the roof is hidden in this
# preview only to expose rooms. It remains a toggleable collection for 3D review.
collections["roof"].hide_render = True
collections["upper"].hide_render = True
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == "VIEW_3D":
            area.spaces.active.region_3d.view_location = (8, 12, 0)
            area.spaces.active.region_3d.view_distance = 37
            area.spaces.active.region_3d.view_rotation = camera.rotation_euler.to_quaternion()

BLEND.parent.mkdir(parents=True, exist_ok=True)
GLB.parent.mkdir(parents=True, exist_ok=True)
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(BLEND))
bpy.ops.render.render(write_still=True)

collections["roof"].hide_render = False
collections["upper"].hide_render = False
bpy.ops.object.select_all(action="DESELECT")
for collection in collections.values():
    for obj in collection.objects:
        obj.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=str(GLB), use_selection=True,
    export_apply=True, export_cameras=False, export_lights=False,
    use_renderable=False, export_extras=True, export_yup=True,
)
if GLB.read_bytes()[:4] != b"glTF":
    raise RuntimeError("The review export was not a binary glTF file")
print(f"Visual-review Blender: {BLEND}")
print(f"Visual-review still: {RENDER}")
print(f"Visual-review GLB, NOT an architectural interchange export: {GLB}")