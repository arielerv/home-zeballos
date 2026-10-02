"""Run a metered Street View MCP server over stdio for VS Code."""

import io
from typing import Any

import fastmcp
from fastmcp.utilities.types import Image

# Compatibility shim for the pinned upstream package's legacy Image import.
setattr(fastmcp, "Image", Image)

from fastmcp import FastMCP
from PIL import Image as PILImage
from street_view_mcp.street_view import (
    get_panorama_metadata,
    get_street_view_image,
)

from street_view_usage import get_request_counts, record_request

mcp = FastMCP("Street View MCP")


def _parse_location(
    location: str | None, lat_lng: str | None, pano_id: str | None
) -> tuple[str | None, tuple[float, float] | None, str | None]:
    supplied = [value for value in (location, lat_lng, pano_id) if value]
    if len(supplied) != 1:
        raise ValueError("Provide exactly one of: location, lat_lng, or pano_id")

    lat_lng_tuple = None
    if lat_lng:
        try:
            lat, lng = map(float, lat_lng.split(","))
            lat_lng_tuple = (lat, lng)
        except (ValueError, TypeError):
            raise ValueError("Invalid lat_lng format. Use 'latitude,longitude'.") from None

    return location, lat_lng_tuple, pano_id


@mcp.tool()
def get_metadata(
    location: str | None = None,
    lat_lng: str | None = None,
    pano_id: str | None = None,
    radius: int = 50,
    source: str = "default",
) -> dict[str, Any]:
    """Fetch free panorama metadata and include it in the local request count."""
    location, lat_lng_tuple, pano_id = _parse_location(location, lat_lng, pano_id)
    record_request("metadata")
    return get_panorama_metadata(
        location=location,
        lat_lng=lat_lng_tuple,
        pano_id=pano_id,
        radius=radius,
        source=source,
    )


@mcp.tool()
def get_street_view(
    research_id: str,
    location: str | None = None,
    lat_lng: str | None = None,
    pano_id: str | None = None,
    size: str = "600x400",
    heading: int = 0,
    pitch: int = 0,
    fov: int = 90,
    radius: int = 50,
    source: str = "default",
) -> Image:
    """Fetch one Street View image; each call is recorded and may be billable.

    research_id identifies one property-research task (not an address); only its
    SHA-256 hash is stored. At most 10 images are allowed for that task. After
    reaching the cap, stop and notify the user before any further imagery.
    """
    if not research_id.strip():
        raise ValueError("research_id must identify this property-research task")
    location, lat_lng_tuple, pano_id = _parse_location(location, lat_lng, pano_id)
    record_request("image", research_id)
    pil_image: PILImage.Image = get_street_view_image(
        location=location,
        lat_lng=lat_lng_tuple,
        pano_id=pano_id,
        size=size,
        heading=heading,
        pitch=pitch,
        fov=fov,
        radius=radius,
        source=source,
        return_error_code=True,
    )
    buffer = io.BytesIO()
    pil_image.save(buffer, format="JPEG")
    return Image(data=buffer.getvalue(), format="jpeg")


@mcp.tool()
def get_street_view_usage(research_id: str | None = None) -> dict[str, int | str]:
    """Show total/month request counts and, when supplied, a task's image count."""
    return get_request_counts(research_id)


def main() -> None:
    mcp.run(transport="stdio", show_banner=False)


if __name__ == "__main__":
    main()


if __name__ == "__main__":
    main()
