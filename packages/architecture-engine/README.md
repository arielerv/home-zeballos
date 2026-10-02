# Architecture geometry adapter

`@t3-designer/architecture-engine` adapts the canonical architectural room and
wall shapes to the repository's existing pure geometry operations. Areas,
centroids, bounds, wall lengths, centers, and plan rotations therefore share the
same implementations used by existing T3 features.

This package does not create Casa geometry, calibrate images, or infer
dimensions. It is not a substitute for validating source evidence. The
isolated `archit-app` + Shapely validation adapter is required by the
architecture release gate and is not installed into the web workspace. IFC,
DXF and DWG are separate required interoperability adapters with their own
fixtures and licensing gates.

Coordinate helpers implement the explicit local plan `[X, Z]` → site
`[east, south]` rigid placement and site → Blender `[X, Y, Z]` mapping. The
inverse helper is provided for round-trip checks. A caller must supply an
evidence-backed origin and rotation; these utilities do not infer Casa placement
or survey alignment.
