"""Export the supplied Casa scene to a web GLB without changing the source blend.

Run through scripts/run_blender.mjs with the canonical Casa blend as the input.
The detached cadastral illustration is intentionally excluded; the modeled house,
full site outline, pool, cut walls, furniture references, and plan labels remain.
"""

import bpy
import os
import sys

arguments = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
SOURCE = os.path.abspath(arguments[0] if arguments else "specs/001-initial-imports/casa-2071-revision.blend")
OUTPUT = os.path.abspath(arguments[1] if len(arguments) > 1 else "apps/web/public/models/casa-2071/casa-2071.glb")
INCLUDED_COLLECTIONS = {
    "01 - Terreno y jardin",
    "02 - Ambientes trazados",
    "03 - Muros en corte a 1.10 m",
    "04 - Muros superiores - ocultos en corte",
    "05 - Equipamiento orientativo",
    "06 - Rotulos de planta",
}

bpy.ops.wm.open_mainfile(filepath=SOURCE)

missing = INCLUDED_COLLECTIONS.difference(bpy.data.collections.keys())
if missing:
    raise RuntimeError(f"Casa source is missing expected collections: {sorted(missing)}")

bpy.ops.object.select_all(action="DESELECT")
selected = []
for collection_name in sorted(INCLUDED_COLLECTIONS):
    collection = bpy.data.collections[collection_name]
    # The prior Blender scene hides upper walls in viewport/render because the
    # existing-state camera uses a 1.10 m cut. Export the full upper-wall layer
    # as a separate glTF-extra-tagged group; the web plan view hides that group,
    # while perspective enables it. The source file is never saved.
    if collection_name == "04 - Muros superiores - ocultos en corte":
        collection.hide_render = False
        collection.hide_viewport = False
    for obj in collection.objects:
        if obj.type not in {"MESH", "CURVE", "FONT", "SURFACE", "META"}:
            continue
        # glTF extras let the web viewer preserve the source's semantic layers.
        # This is only an in-memory property on the freshly opened source file;
        # the historical .blend is never saved or modified.
        obj["casaCollection"] = collection_name
        obj["casaHiddenInSourceRender"] = bool(obj.hide_render)
        obj.select_set(True)
        selected.append(obj)

if not selected:
    raise RuntimeError("No Casa model objects selected for GLB export")

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUTPUT,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_cameras=False,
    export_lights=False,
    use_renderable=False,
    export_extras=True,
    export_yup=True,
)
print(f"Exported {len(selected)} Casa source objects to {OUTPUT}")
