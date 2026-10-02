# Project-wide agent rules

- Before architectural/Casa changes, read [constitutions.md](../constitutions.md), [the Casa BIM workflow](../docs/workflows/casa-bim.md), and the current spec. These are binding; do not infer architecture facts from a prior assistant answer.
- User-supplied tentative plans are design authority for the remodel wherever they conflict with the older Blender model. Preserve the prior model/source and unaffected site context, but never pass old geometry off as the requested final design.
- Never invent measurements, north/orientation, wall/floor/roof elevations, parcel boundaries, or same-block neighbor geometry. Track evidence and unknowns. Uncalibrated pixels remain 2D-only and block metric model/export.
- Neighbors are same-block adjoining buildings; businesses across a street/frontage are not neighbors. Do not include user research photos in the published UI.
- Keep the existing Casa and T3 workspaces, especially the visible solar study. Do not remove an existing control or feature unless the user explicitly asks.
- Use the on-demand `casa-bim-workflow` skill for architectural tasks. All pipeline capabilities in the constitution are REQUIRED; incomplete means blocked, never silently optional.
- Before claiming support, locate the implementation, its pinned dependency, fixtures, and passing validation. Report implemented/partial/blocked truthfully.
