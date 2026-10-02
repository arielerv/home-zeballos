---
name: casa-bim-workflow
description: 'Mandatory for any Casa 2071 or architectural-model work: tentative floor plans, geometry, Blender, Three.js, neighbors, solar/shadows, BIM, IFC, DXF/DWG, glTF/OBJ, prompt-to-project, or building-code validation. Enforces evidence-first 2D-to-BIM delivery and blocks guesses.'
user-invocable: true
---

# Casa BIM workflow (required)

Read repository-root `constitutions.md` and `docs/workflows/casa-bim.md` first. They override assumptions inherited from previous work.

## Before any edit or model operation

1. Restate internally the user's requested **final** design and identify which source controls each fact.
2. Inspect the current code, canonical model, source plans, Blender file, snapshot, tests, and any earlier generated asset. Record conflicts; never assume the latest GLB is correct because it exists.
3. Classify every value as measured, explicitly specified, observed, inferred, estimated, generated, or unknown. Unknown geometry stays unknown.
4. For Casa, treat the tentative plan as the remodel design authority wherever it disagrees with the existing Blender plan. Keep the old Blender as untouched evidence/baseline, not as the final remodeled model.
5. The tentative image's printed areas/annotations are constraints; do not invent unshown dimensions. Preserve pixel coordinates and stop metric conversion until calibration points/known lengths are reviewed.
6. Neighbor geometry means same-block buildings sharing/abutting the site. Exclude minimarket, gas station, canopy, and across-street objects; don't make substitutes. No verified footprint = no rendered neighbor.
7. Do not expose research-only photos in the product.
8. Preserve all existing project tabs, tools, and the solar study unless the user explicitly requests removal.

## Required delivery sequence

1. Add/update a versioned source register with exact file IDs, image dimensions, raw labels/areas, provenance, and uncertainty. Preserve originals.
2. Produce/review a 2D trace with editable wall/room geometry, grid, snapping, and linked dimensions; visually compare the trace to the source. No 3D generation before this review gate.
3. Calibrate image-to-plan using reviewed corresponding control points and verified lengths. Enforce unit, scale, rotation, translation, and residual/tolerance checks. If unavailable, leave metric geometry blocked.
4. Convert the approved trace into the canonical parametric BIM model (levels, rooms, walls, doors, windows, slabs, roofs), with stable IDs, constraints, evidence and mutation history. Apply typed operations only; obtain human confirmation for generated changes.
5. Run required schema, topology, dimensions/areas, snapping, wall-opening, overlap, connectivity, provenance, uncertainty, preserved-site, and jurisdictional rule checks. Normative results need a cited, versioned, locally applicable rule set and reviewer; otherwise mark compliance blocked.
6. Run IFC (IfcOpenShell), DXF (ezdxf), DWG (configured converter/SDK), glTF/GLB and OBJ adapters against checked-in fixtures. Verify round-trip IDs, units, levels, geometry bounds, and declared loss. A missing DWG tool/license or fixture blocks release; DXF is not DWG.
7. Generate Web/Three.js and Blender output from the same validated snapshot. Compare model IDs/counts/bounds and capture a render through the appropriate Blender MCP/automated Blender background path; never write back to the user's source .blend.
8. Validate solar calculations with Casa's declared local timezone and coordinate source. Preserve the date/time controls. The sun path can be shown astronomically without model shadow placement; shadows require calibrated north and site transform.
9. Run unit, integration, round-trip, accessibility, and visual regression tests. Report PASS/BLOCKED per gate and cite the evidence. Do not describe incomplete capabilities as optional or supported.

## Existing workspace controls are protected behavior

- Keep the current three tabs and the T3/Quimper route. Do not add top-level tabs or replace the existing solar workspace with a new landing page.
- Preserve layer semantics: cutaway controls walls, fixtures controls furniture/equipment, and labels controls room-name labels. Building-context toggles affect building/nearby context only; never show unverified buildings as neighbors.
- Preserve the right inspector's Sun / Rooms / Fixtures switch and room focus from both the selector and room list.
- Preserve solar date, four seasonal presets, local-time input, scrubber/play, altitude, azimuth, and hourly path chart.
- Preserve camera presets: perspective is diagonal; floor plan is top-down; users can freely orbit/pan/zoom; reset returns to the selected preset without disabling navigation.
- Building-and-sun retains the whole building, moving 3D sun/path, visible site coordinates/timezone, compass/building/apartment/sun labels, and source-backed nearby buildings. Hiding context visually must not change physical shadow casters if the existing study intentionally retains them.

## Response protocol

- Report concrete edits and checks, not promises.
- Name the one real blocker and the minimum missing evidence if a gate cannot pass.
- Never ask the user to repeat an already-stated preference; encode corrections in docs/tests.
- Never replace the requested final plan with an old Blender model, cross-street OSM footprint, generic proxy, or generated guess.
