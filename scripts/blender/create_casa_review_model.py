"""Build a *visual review sketch*, not a calibrated architectural model.

The source coordinates are the owner's clean plan pixels. The 0.01 display factor
is chosen only to fit the web viewer; it is NOT a pixel-to-metre calibration.
This file must never be used as a survey, BIM snapshot, solar-shadow model, or
the source for IFC/DXF/DWG/OBJ interchange. Keep the historic Blender untouched.
"""

import hashlib
import json
import math
import shutil
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
TRACE = ROOT / "assets/reference/casa-tentative-trace-draft.json"
ROOF_TRACE = ROOT / "assets/reference/casa-roof-review-draft.json"
CORRECTIONS = ROOT / "assets/reference/casa-owner-corrections-review.json"
HISTORICAL_SITE = ROOT / "specs/001-initial-imports/casa-2071-revision.blend"
SOURCE = ROOT / "assets/reference/casa-2071-planta-limpia.png"
BLEND = ROOT / "assets/blender/casa-2071-maqueta-revision.blend"
RENDER = ROOT / "assets/blender/casa-2071-maqueta-revision.png"
GLB = ROOT / "apps/web/public/models/casa-2071/casa-2071-maqueta-revision.glb"
trace = json.loads(TRACE.read_text(encoding="utf-8"))
roof_trace = json.loads(ROOF_TRACE.read_text(encoding="utf-8"))
corrections = json.loads(CORRECTIONS.read_text(encoding="utf-8"))
assert trace["source"]["sha256"] == hashlib.sha256(SOURCE.read_bytes()).hexdigest()
assert trace["coordinateSystem"] == "source-image-pixels-origin-top-left"
assert trace["metricCalibration"].startswith("blocked")

# Preserve the prior review separately; never overwrite the historical source.
for previous in (BLEND, RENDER, GLB):
    backup = ROOT / "artifacts/casa-before-owner-wall-review" / previous.name
    if previous.exists() and not backup.exists():
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(previous, backup)

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
scene["roof_note"] = "Exactly three sectors with SIDE-TO-SIDE ridges (source x), not front-to-patio; left PB+P1 highest, centre lowest, right intermediate. All heights ARBITRARY display units, NOT metres. One red/brown material."
scene["site_note"] = "Original contour, paving, pool, garage perimeter and entrance preserved. Only small annex Exterior 11 walls omitted per red point 1. House display placement unreviewed; neighbors are separate web context."
scene["owner_corrections"] = "assets/reference/casa-owner-corrections-review.json"
scene["publication"] = corrections["publication"]
scene["upper_floor_status"] = corrections["upperFloor"]["status"]
scene["pool_rotation_status"] = corrections["pool"]["status"]
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
    "storey": "08 - Planta alta envolvente de revision",
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
tile_material = material(roof_trace["material"]["name"], tuple(roof_trace["material"]["rgba"]))
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
    *(f"Exterior 10 {index}" for index in range(3)),
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
wall_segments = corrections["wallSegmentsPixels"]


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
    # Right body is owner-defined taller than centre, not another storey.
    # Split crossing axes at source x850; never add a partition to kitchen/dining.
    cuts = [0., 1.]
    if start[0] != end[0]:
        fraction = (850 - start[0]) / (end[0] - start[0])
        if 0 < fraction < 1:
            cuts.insert(1, fraction)
    for part, (a, b) in enumerate(zip(cuts, cuts[1:])):
        left = [start[k] + a * (end[k] - start[k]) for k in range(2)]
        right = [start[k] + b * (end[k] - start[k]) for k in range(2)]
        body = roof_trace["volumes"][2 if (left[0] + right[0]) / 2 >= 850 else 1]
        wall = beam(base_name + f" · alto {part}", left, right, .85,
                    body["wallTopDisplay"], .065, "upper", wall_material)
        wall["height_units"] = "arbitrary review display units NOT metres"

# Source-observed stair symbol only, not invented risers or a storey elevation.
stair = corrections["stair"]
for index, (start, end) in enumerate(zip(
        stair["polygonPixels"], stair["polygonPixels"][1:] + stair["polygonPixels"][:1])):
    symbol = beam(f"Escalera exterior · contorno fuente {index + 1}", start, end,
                  .02, .055, .025, "wall", cut_material)
    symbol["stable_id"] = f"STAIR-TRACE-{index + 1}"
    symbol["review_status"] = stair["status"]
for index, station in enumerate(stair["edgeStationsPixels"]):
    symbol = beam(f"Escalera exterior · abanico fuente {index + 1}",
                  stair["centerPixels"], station, .02, .055, .012, "wall", cut_material)
    symbol["review_status"] = stair["status"]


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

# Owner-defined external upper mass only. The separate upper-room source is
# not registered; do NOT duplicate PB partitions, windows or furniture upstairs.
left_body = roof_trace["volumes"][0]
upper_floor = polygon("PA · losa de envolvente · no plano registrado",
                      left_body["footprintPixels"], roof_trace["upperSlabDisplay"],
                      "storey", wall_material)
upper_floor["stable_id"] = "PA-MASS-SLAB"
upper_floor["review_status"] = corrections["upperFloor"]["status"]
upper_floor["height_units"] = "arbitrary review display units NOT metres"
for index, start in enumerate(left_body["footprintPixels"]):
    end = left_body["footprintPixels"][(index + 1) % len(left_body["footprintPixels"])]
    shell = beam(f"PA · envolvente izquierda {index + 1}", start, end,
                 roof_trace["upperSlabDisplay"], left_body["wallTopDisplay"],
                 .065, "storey", wall_material)
    shell["review_status"] = "external-massing-only; upper-room registration blocked"
    shell["height_units"] = "arbitrary review display units NOT metres"


# Three continuous gables. Clip the sloped footprint in SOURCE pixels before
# applying the display transform, retaining the existing diagonal rear-left edge.
def half_footprint(points, split, keep_left, axis):
    output = []
    for index, end in enumerate(points):
        start = points[index - 1]
        inside_start = start[axis] <= split if keep_left else start[axis] >= split
        inside_end = end[axis] <= split if keep_left else end[axis] >= split
        if inside_start != inside_end:
            fraction = (split - start[axis]) / (end[axis] - start[axis])
            output.append([start[k] + fraction * (end[k] - start[k]) for k in range(2)])
        if inside_end:
            output.append(end)
    return output


def roof_plane(name, corners):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(corners, [], [tuple(range(len(corners)))])
    mesh.update()
    obj = link(bpy.data.objects.new(name, mesh), "roof", tile_material)
    obj["pitch_and_ridge"] = "illustrative-unmeasured"
    obj["roof_trace"] = "assets/reference/casa-roof-review-draft.json"
    return obj


for volume in roof_trace["volumes"]:
    x0, y0, x1, y1 = volume["boundsPixels"]
    assert volume["ridgeAxis"] == "x"
    middle = (y0 + y1) / 2
    def roof_height(y):
        return volume["eaveDisplay"] + (volume["ridgeDisplay"] - volume["eaveDisplay"]) * (1 - abs(y - middle) / ((y1 - y0) / 2))
    for index, keep_left in enumerate((True, False), 1):
        plan = half_footprint(volume["footprintPixels"], middle, keep_left, 1)
        face = [(*xy(px, py), roof_height(py)) for px, py in plan]
        roof = roof_plane(f"Tejas · {volume['id']} · faldón {index}", face)
        roof["ridge_axis_plan"] = volume["ridgeAxis"]
        roof["review_status"] = volume["status"]
        roof["roof_body_id"] = volume["id"]
        roof["continuous_span_source_pixels"] = json.dumps([y0, y1])
        roof["ridge_span_source_pixels"] = json.dumps([x0, x1])
        roof["height_units"] = "arbitrary review display units NOT metres"
    # Close lateral gables on the existing polygon edges, including the left
    # diagonal. Split at the y-midpoint so closing faces follow the roof peak.
    for label, is_left in (("lateral izquierdo", True), ("lateral derecho", False)):
        vertices, faces = [], []
        outline = volume["footprintPixels"]
        for index, start in enumerate(outline):
            end = outline[(index + 1) % len(outline)]
            if start[1] == end[1] or ((start[0] + end[0]) / 2 < (x0 + x1) / 2) != is_left:
                continue
            stations = [start]
            if min(start[1], end[1]) < middle < max(start[1], end[1]):
                fraction = (middle - start[1]) / (end[1] - start[1])
                stations.append([start[0] + fraction * (end[0] - start[0]), middle])
            stations.append(end)
            for a, b in zip(stations, stations[1:]):
                offset = len(vertices)
                vertices.extend([(*xy(*a), volume["wallTopDisplay"]),
                                 (*xy(*b), volume["wallTopDisplay"]),
                                 (*xy(*b), roof_height(b[1])), (*xy(*a), roof_height(a[1]))])
                faces.append(tuple(range(offset, offset + 4)))
        mesh = bpy.data.meshes.new(f"Testero · {volume['id']} · {label}")
        mesh.from_pydata(vertices, [], faces)
        mesh.update()
        gable = link(bpy.data.objects.new(mesh.name, mesh), "roof", wall_material)
        gable["roof_body_id"] = volume["id"]
        gable["roof_trace"] = "assets/reference/casa-roof-review-draft.json"
        gable["height_units"] = "arbitrary review display units NOT metres"

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
collections["storey"].hide_render = True
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
collections["storey"].hide_render = False
scene.render.filepath = str(ROOT / "artifacts/casa-local-review/three-gables-exterior.png")
Path(scene.render.filepath).parent.mkdir(parents=True, exist_ok=True)
bpy.ops.render.render(write_still=True)
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