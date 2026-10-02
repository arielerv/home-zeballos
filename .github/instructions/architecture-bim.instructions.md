---
applyTo: "**/packages/architecture-*/**, **/scripts/architecture/**, **/scripts/blender/**, **/apps/web/src/components/Casa*.tsx, **/apps/web/src/data/casa-*, **/assets/reference/**, **/specs/**"
description: "Mandatory evidence-first 2D-to-BIM rules for Casa and architectural project changes."
---

# Required architecture workflow

1. Read repository-root `constitutions.md`, `docs/workflows/casa-bim.md`, and the relevant source requirements before editing.
2. Identify the requested final source explicitly. For Casa remodel geometry, the tentative plan is authoritative over contradictory old Blender walls. Do not retain contradicted room geometry as if final.
3. Keep user photos as internal research only. Keep commercial frontage features distinct from adjoining same-block homes; do not render them as neighbors.
4. Do not trace image pixels into meters without reviewed calibration anchors. Printed areas and dimensions are source constraints; never fabricate missing lengths, levels, wall heights, or north.
5. Work 2D-first: reviewed trace → snapping/dimension checks → calibrated canonical parametric BIM → schema/geometry/evidence/code-rule validation → IFC/DXF/DWG/glTF/OBJ adapters → Three.js/Blender render from the same snapshot → solar validation.
6. Treat every feature and gate in the constitution as required. If implementation, dependency, fixture, source, tool, or licensing is missing, report a blocker and do not claim support or ship substituted geometry.
7. Preserve existing workspaces and solar controls. Casa solar uses an explicitly configured local date/timezone/site; do not reuse Quimper coordinates. Do not cast geometrically oriented shadows unless north and model placement are calibrated.
8. Update source-of-truth docs and regression tests when a user corrects a prior assumption. Verify every changed file and run the narrowest relevant checks, then broader available checks.
