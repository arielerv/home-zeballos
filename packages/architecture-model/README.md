# Architecture model

`@t3-designer/architecture-model` is a renderer-independent, versioned Zod
contract for architectural projects. It is the first implementation slice of
`specs/002-libs-refactor/TASKS.md`; it does not replace the existing T3 scene schema or its
version-1 snapshots.

The scene-schema package also exposes an architecture snapshot envelope at
snapshot version 2. It embeds this model directly and does not require an
`Apartment` or Quimper site; its versioned reader accepts both the unchanged T3
v1 contract and the architecture v2 contract. This envelope is a persistence
contract only; renderer/export integration remains a separate step.

Use `pnpm architecture:snapshot -- --input project.json --output snapshot.json`
to validate and export v2, or add `--check` to compare without writing. The
command is ready for canonical architecture JSON but does not fabricate or
populate Casa geometry.

## Renovation semantics

A project contains one complete finished building, selected by
`targetBuildingId`. Each room, wall, opening, slab, roof, and site feature is
tagged `retained`, `new`, or `modified`; renovation records identify changed
elements and keep source evidence. This records how the final design relates to
the built house without creating a second building state or a before/after view.

The site is independent of either building representation. Its optional
`propertyBoundary` is the complete property boundary. Existing patio, yard, pool,
and access features can be marked `retained` and referenced by the renovation's
`preservedSiteFeatureIds`. Cadastral description is metadata on the property,
not an implicit parcel subdivision.

## Coordinates and evidence

All architectural model lengths and local plan coordinates are in meters. Plan
coordinates use local X/Z and vertical elevations use Y-up. The model does not
assume a geographic north direction; `northAzimuth` is optional.

A tentative area traced from an uncalibrated image is represented as
`scopeImageRegion.polygonPixels`, with the image's evidence ID and dimensions.
Those pixel coordinates are not a metric polygon and are not fed into the
building geometry. Converting traced points to meters requires explicit evidence
calibration: a known length plus corresponding image-pixel and house-plan
control points. A length alone cannot align the image to the complete house.

Every building/site element carries `provenance`: its origin category,
confidence in the range $0$–$1$, and references to project evidence. Validation
checks those references, level membership, stable unique IDs, openings against
host walls, assumptions and renovation/preserved-feature relationships.

## Tooling boundary

The TypeScript/Zod contract is canonical. `archit-app` + Shapely are required
isolated geometry-validation adapters, not browser dependencies. IFC exchange
uses a required IfcOpenShell adapter; DXF uses required ezdxf. DWG requires a
separately configured and licensed converter/SDK. Every adapter must pass
fixtures and round-trip checks before its format is called supported. See
[`constitutions.md`](../../../constitutions.md) and the mandatory
[`Casa BIM workflow`](../../../docs/workflows/casa-bim.md).

## Current limits

This contract is intentionally an MVP. It does not yet implement constraints/
solvers, mutation history, geometry generation, IFC/DXF/DWG adapters, site
georeferencing, or a canonical Casa instance. These are required delivery gates,
not optional scope. For Casa, the tentative plan is the authority for the
requested final remodel wherever it conflicts with the prior Blender geometry;
the Blender file is preserved as earlier-state evidence and must not be shown as
the completed remodel. Do not convert the image to metric geometry without
reviewed calibration. The existing site/Blender data is not a verified survey.
