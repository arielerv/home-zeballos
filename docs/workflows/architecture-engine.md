# Architecture engine adapter

Architectural changes are governed by repository-root
[`constitutions.md`](../../constitutions.md) and the mandatory
[`Casa BIM workflow`](./casa-bim.md). This adapter is a required validator, not
an optional authority or a substitute for source evidence.

The renderer-independent Zod architecture model remains canonical.
`archit-app` 0.7.0 is a required isolated Python geometry-validation adapter,
not a source of truth and not a replacement for stable IDs/provenance. The
adapter converts validated metric room, wall and opening geometry to
archit-app, maps stable IDs to deterministic UUIDs, and returns derived room
areas/centroids, wall endpoints/lengths, and structured geometry findings.

## Installation

The tool is installed user-wide with `uv tool install archit-app==0.7.0`; this
provides the `archit-app-export-protocol` executable. To create an isolated Python
runtime for T3 adapter imports, install the pinned dependency file in a project
venv or run the adapter via uv with `scripts/requirements-architecture.txt`.

## Validate a canonical project

First validate the JSON with `ArchitecturalProjectSchema` in the TypeScript
workspace. Then run:

```sh
uv run --with-requirements scripts/requirements-architecture.txt python scripts/architecture/archit_app_adapter.py path/to/validated-project.json
```

The input must already use meters, `local-xz` plan coordinates, explicit levels,
and a `floorToCeiling` for every level. The adapter refuses to invent a floor
height or convert unknown units. It preserves stable source IDs in output and
tags; any lossy semantic mappings are reported as adapter warnings. Missing
inputs block the relevant deliverable.

## Raster-plan limit

archit-app does **not** import or trace raster floorplans. Its PNG module renders
an existing model; the required DXF adapter is `ezdxf` and must consume/emit
checked fixtures independently. A JPEG/PNG
with no calibration cannot yield metric wall lines. Image-derived vertices must
be traced/reviewed and tied to reliable known dimensions and two corresponding
image-to-house control points before converting them to meters. A labeled length
alone provides scale, not alignment with the complete Blender model. The adapter
uses archit-app's `CoordinateConverter` for calibrated points and validates or
calculates supplied geometry; it does not pretend to discover lines from pixels.

Run the required adapter/policy checks with `pnpm architecture:test`. Run
`pnpm architecture:readiness` for the truthful status matrix and
`pnpm architecture:release-gate` before any architecture release. IFC and DXF
use pinned IfcOpenShell and ezdxf adapters; DWG additionally requires a
configured, licensed converter and real fixtures. A missing dependency or
fixture is a release blocker, not an optional integration.
