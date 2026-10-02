"""Audit owner-review traces in source PIXELS; not raster recognition or BIM.

Uses pinned Shapely 2.1.2 for polygon validity, overlaps, source-boundary access
checks and wall-obstruction intervals. Keeps printed m² separate from pixel².
Only confirmed unblocked traced accesses enter the review connectivity graph.
"""

import html
import json
from importlib.metadata import version
from pathlib import Path

from shapely.geometry import LineString, Polygon
from shapely.validation import explain_validity

ROOT = Path(__file__).resolve().parents[2]


def audit(trace, corrections):
    rooms = {room["id"]: Polygon(room["polygonPixels"]) for room in trace["rooms"]}
    walls = [LineString(segment) for segment in corrections["wallSegmentsPixels"]]
    findings = []
    for room_id, polygon in rooms.items():
        if not polygon.is_valid or polygon.is_empty:
            findings.append({"code": "polygon.invalid", "rooms": [room_id],
                             "detail": explain_validity(polygon)})
    pairs = list(rooms.items())
    for index, (left_id, left) in enumerate(pairs):
        for right_id, right in pairs[index + 1:]:
            if not left.is_valid or not right.is_valid:
                continue
            area = left.intersection(right).area
            if area > 1e-6:
                findings.append({"code": "rooms.overlap", "rooms": [left_id, right_id],
                                 "overlapAreaPixels2": area})
    for index, left in enumerate(walls):
        for other, right in enumerate(walls[index + 1:], index + 1):
            length = left.intersection(right).length
            if length > 1e-6:
                findings.append({"code": "walls.duplicate_interval", "walls": [index, other],
                                 "lengthPixels": length})
    graph = {room_id: set() for room_id in rooms}
    exterior = set()
    accesses = []
    # Explicit pixel-picking tolerance, not metres or snapping the actual geometry.
    tolerance = 8
    for access in corrections["accessesPixels"]:
        line = LineString(access["segment"])
        obstruction = sum(line.intersection(wall).length for wall in walls)
        hosted = all(line.difference(rooms[room_id].boundary.buffer(tolerance)).length < 1e-6
                     for room_id in access["rooms"])
        usable = obstruction < 1e-6 and hosted
        accesses.append({"id": access["id"], "rooms": access["rooms"],
                         "wallObstructionPixels": obstruction,
                         "onTracedRoomBoundaries": hosted, "graphUsable": usable})
        if not usable:
            findings.append({"code": "access.obstructed_or_unregistered", "access": access["id"],
                             "rooms": access["rooms"], "obstructionPixels": obstruction,
                             "onTracedRoomBoundaries": hosted})
            continue
        for room_id in access["rooms"]:
            graph[room_id].update(set(access["rooms"]) - {room_id})
            if access["exterior"]:
                exterior.add(room_id)
    for room_id in rooms:
        reached, queue = {room_id}, [room_id]
        while queue:
            for target in graph[queue.pop()] - reached:
                reached.add(target)
                queue.append(target)
        if not reached.intersection(exterior):
            findings.append({"code": "room.no_evidenced_exterior_path", "rooms": [room_id]})
    upper = corrections["upperFloor"]
    for room in upper["rooms"]:
        polygon = Polygon(room["polygonPixels"])
        if not polygon.is_valid:
            findings.append({"code": "upper.polygon.invalid", "rooms": [room["id"]]})
    return {
        "status": "pixel-review-findings-not-metric-validation",
        "recognition": "manual source/owner trace; NO automatic raster room recognition",
        "dependencies": {"shapely": version("shapely")},
        "coordinateSystem": trace["coordinateSystem"], "units": "pixels",
        "accessPickingTolerancePixels": tolerance,
        "rooms": [{"id": room["id"], "areaPixels2": rooms[room["id"]].area,
                   "printedAreaM2ReferenceOnly": room["printedAreaM2"]} for room in trace["rooms"]],
        "accesses": accesses, "findings": findings,
        "upperFloorStatus": upper["status"], "poolStatus": corrections["pool"]["status"],
        "publication": corrections["publication"],
        "limits": ["Not a reviewed/calibrated BIM", "No inferred upstairs rooms or elevations",
                   "No certified door/access/egress dimensions", "Source-room polygons remain draft",
                   "Marked screenshot correspondences are visually inferred; owner review required"],
    }


def points(vertices):
    return " ".join(f"{x},{y}" for x, y in vertices)


def render_overlay(corrections):
    body = ['<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1158 852">',
            '<image href="../../assets/reference/casa-2071-planta-limpia.png" width="1158" height="852"/>']
    for segment in corrections["wallSegmentsPixels"]:
        body.append(f'<polyline points="{points(segment)}" fill="none" stroke="#003c78" stroke-width="4"/>')
    for change in corrections["changes"]:
        color = "#e82222" if change["kind"] == "remove-wall" else "#090909"
        for segment in change.get("segments", []):
            body.append(f'<polyline points="{points(segment)}" fill="none" stroke="{color}" stroke-width="6"><title>{html.escape(change["id"])}</title></polyline>')
    stair = corrections["stair"]
    body.append(f'<polygon points="{points(stair["polygonPixels"])}" fill="none" stroke="#8b21ba" stroke-width="4"/>')
    body.append('</svg>')
    return "\n".join(body)


def render_upper(corrections):
    upper = corrections["upperFloor"]
    body = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1075 860">',
            '<image href="../../assets/reference/1er%20piso.webp" width="1075" height="860"/>']
    for room in upper["rooms"]:
        body.append(f'<polygon points="{points(room["polygonPixels"])}" fill="#1685bb" fill-opacity="0.15" stroke="#1685bb" stroke-width="3"><title>{room["id"]}</title></polygon>')
    body.append(f'<polygon points="{points(upper["footprintPixels"])}" fill="none" stroke="#8b21ba" stroke-width="4"/>')
    body.append('</svg>')
    return "\n".join(body)


def render_roofs(roofs):
    body = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1158 852">',
            '<image href="../../assets/reference/casa-2071-planta-limpia.png" width="1158" height="852"/>']
    for volume, color in zip(roofs["volumes"], ["#91462e", "#dd9c49", "#b96a43"]):
        x0, y0, x1, y1 = volume["boundsPixels"]
        ridge = (y0 + y1) / 2
        body.append(f'<polygon points="{points(volume["footprintPixels"])}" fill="{color}" fill-opacity="0.28" stroke="{color}" stroke-width="5"><title>{volume["id"]}: {volume["status"]}</title></polygon>')
        # The left footprint has a diagonal; at this ridge y its edge is x163.
        ridge_left = x0 if len(volume["footprintPixels"]) == 4 else volume["footprintPixels"][-2][0]
        body.append(f'<path d="M {ridge_left},{ridge} H {x1}" stroke="{color}" stroke-width="6" stroke-dasharray="14 6"/>')
        body.append(f'<text x="{(x0 + x1) / 2}" y="{y0 + 65}" text-anchor="middle" font-size="22">{volume["id"]} · {volume["storeys"]} plantas</text>')
    body.append('</svg>')
    return "\n".join(body)


def main():
    trace = json.loads((ROOT / "assets/reference/casa-tentative-trace-draft.json").read_text())
    corrections = json.loads((ROOT / "assets/reference/casa-owner-corrections-review.json").read_text())
    roofs = json.loads((ROOT / "assets/reference/casa-roof-review-draft.json").read_text())
    result = audit(trace, corrections)
    output = ROOT / "artifacts/casa-local-review"
    output.mkdir(parents=True, exist_ok=True)
    (output / "pixel-audit.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    (output / "ground-overlay.svg").write_text(render_overlay(corrections))
    (output / "upper-overlay.svg").write_text(render_upper(corrections))
    (output / "roof-overlay.svg").write_text(render_roofs(roofs))
    (output / "index.html").write_text(
        '<!doctype html><html lang="es"><meta charset="utf-8"><title>Casa — revisión local</title>'
        '<style>body{font:16px system-ui;max-width:1158px;margin:32px auto;padding:24px;background:#eee;color:#16303b}img{width:100%}pre{white-space:pre-wrap}h1,h2{color:#16303b}</style>'
        '<h1>Casa 2071 · revisión sin escala</h1><p><b>Preview autorizado para publicación; no es BIM.</b> Azul: ejes propuestos; rojo: retiro; negro: pared añadida; violeta: escalera trazada de fuente.</p>'
        '<h2>Planta baja: superposición para revisión</h2><img src="ground-overlay.svg" alt="Correcciones sobre planta limpia">'
        '<h2>Tres sectores, cumbreras de lado a lado: propuesta 2D sin escala</h2><p>Corrección posterior del propietario: NO frente→patio. Izquierda PB+P1, central baja, derecha intermedia. Colores del overlay distinguen bloques; el render usa UNA teja rojo/marrón. Métrica y límites sobre retranqueos pendientes de revisión.</p><img src="roof-overlay.svg" alt="Tres sectores con cumbreras transversales sobre planta limpia">'
        '<h2>Envolvente externa de revisión</h2><img src="three-gables-exterior.png" alt="Tres techos y masa de planta alta izquierda">'
        '<h2>Planta alta: fuente separada, no registrada a PB</h2><p>PB + P1 izquierda confirmado por propietario. Envolvente externa ilustrativa con alturas ARBITRARIAS, no metros. No se duplican ambientes de PB ni se inventa registro interior. Pileta: falta sentido/ángulo; se conserva hasta revisión.</p>'
        '<img src="upper-overlay.svg" alt="Traza pixelar de planta alta">'
        '<h2>Auditoría real de trazas en píxeles</h2><p>No es segmentación automática del raster, validación métrica ni certificación de egreso. Los hallazgos se conservan, no se ocultan con paredes o puertas inventadas.</p><pre>'
        + html.escape(json.dumps(result, indent=2, ensure_ascii=False)) + '</pre></html>')
    print(json.dumps({"report": str(output / "index.html"), "findings": len(result["findings"]),
                      "roomCount": len(result["rooms"]), "status": result["status"]}))


if __name__ == "__main__":
    main()