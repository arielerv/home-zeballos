# Architecture validation

`@t3-designer/architecture-validation` turns canonical-model parse errors into
stable structured findings, checks simple polygon boundaries and opening
intervals on each wall, and adds project-quality and evidence warnings. Findings
include a category (`schema`, `geometry`, `quality`, or `evidence`) as well as
severity, stable code, affected IDs, and a model path. It is deterministic and
renderer-independent.

Schema and invalid-geometry findings are fatal (`severity: "error"`). Missing
full-site boundaries, open assumptions, provenance without linked evidence, and
pixel scopes without calibration are warnings (`severity: "warning"`). An
uncalibrated scope remains image evidence and is never converted to metric
geometry. This is not a complete topology/overlap solver and does not certify
building-code compliance, cadastral boundaries, or survey accuracy.
