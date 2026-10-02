export type Point2 = [number, number]
export type Affine2 = [Point2, Point2, Point2]

/** Least-squares affine fit. Translation centering improves conditioning for raster coordinates. */
export function fitAffine(pairs: Array<{ source: Point2; target: Point2 }>) {
  if (pairs.length < 3) throw new Error('At least three non-collinear controls required')
  const mean = pairs.reduce<Point2>((sum, pair) => [sum[0] + pair.source[0] / pairs.length, sum[1] + pair.source[1] / pairs.length], [0, 0])
  const rows = pairs.map(pair => ({ source: [pair.source[0] - mean[0], pair.source[1] - mean[1], 1], target: pair.target }))
  const matrix = Array.from({ length: 3 }, (_, j) => [
    ...Array.from({ length: 3 }, (_, k) => rows.reduce((sum, row) => sum + row.source[j] * row.source[k], 0)),
    ...[0, 1].map(k => rows.reduce((sum, row) => sum + row.source[j] * row.target[k], 0)),
  ])
  for (let column = 0; column < 3; column++) {
    let pivot = column
    for (let row = column + 1; row < 3; row++) if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row
    ;[matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]]
    const divisor = matrix[column][column]
    if (Math.abs(divisor) < 1e-10) throw new Error('Collinear or singular controls')
    matrix[column] = matrix[column].map(value => value / divisor)
    for (let row = 0; row < 3; row++) if (row !== column) {
      const factor = matrix[row][column]
      matrix[row] = matrix[row].map((value, k) => value - factor * matrix[column][k])
    }
  }
  const coefficients: Affine2 = [
    [matrix[0][3], matrix[0][4]], [matrix[1][3], matrix[1][4]],
    [matrix[2][3] - mean[0] * matrix[0][3] - mean[1] * matrix[1][3], matrix[2][4] - mean[0] * matrix[0][4] - mean[1] * matrix[1][4]],
  ]
  const residuals = pairs.map(pair => {
    const point = applyAffine(coefficients, pair.source)
    return Math.hypot(point[0] - pair.target[0], point[1] - pair.target[1])
  })
  return { coefficients, residuals, rms: Math.sqrt(residuals.reduce((sum, value) => sum + value ** 2, 0) / residuals.length), max: Math.max(...residuals) }
}

export function applyAffine([a, b, c]: Affine2, [x, y]: Point2): Point2 {
  return [a[0] * x + b[0] * y + c[0], a[1] * x + b[1] * y + c[1]]
}

export function signedArea(points: Point2[]) {
  return points.reduce((sum, point, i) => {
    const next = points[(i + 1) % points.length]
    return sum + point[0] * next[1] - next[0] * point[1]
  }, 0) / 2
}

/** Offset an open frontage to its left, in SOURCE coordinates, not metres.
 * Shared miter intersections keep adjacent strips connected at corners.
 * Reject reversals/degenerate edges instead of drawing spikes.
 */
export function offsetFrontage(points: Point2[], distance: number): Point2[] {
  if (points.length < 2 || !Number.isFinite(distance) || distance < 0) throw new Error('Invalid frontage offset')
  const normals = points.slice(1).map((p, i): Point2 => {
    const dx = p[0] - points[i][0], dy = p[1] - points[i][1]
    const length = Math.hypot(dx, dy)
    if (length < 1e-8) throw new Error('Duplicate frontage vertex')
    return [-dy / length, dx / length]
  })
  return points.map((p, i) => {
    const before = normals[Math.max(0, i - 1)], after = normals[Math.min(i, normals.length - 1)]
    const denominator = 1 + before[0] * after[0] + before[1] * after[1]
    if (denominator < .1) throw new Error('Frontage reversal would create an unbounded miter')
    return [p[0] + distance * (before[0] + after[0]) / denominator, p[1] + distance * (before[1] + after[1]) / denominator]
  })
}

export function frontageStrip(inner: Point2[], outer: Point2[], start = 0, end = inner.length - 1): Point2[] {
  if (inner.length !== outer.length || start < 0 || end >= inner.length || start >= end) throw new Error('Invalid strip range')
  return [...inner.slice(start, end + 1), ...outer.slice(start, end + 1).reverse()]
}

/** Simple polygon check for source traces and transformed review contours. */
export function isSimplePolygon(points: Point2[]): boolean {
  if (points.length < 3 || points.some(p => p.some(v => !Number.isFinite(v))) || Math.abs(signedArea(points)) < 1e-8) return false
  const cross = (a: Point2, b: Point2, c: Point2) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const on = (a: Point2, b: Point2, c: Point2) => Math.abs(cross(a, b, c)) < 1e-8 && c[0] >= Math.min(a[0], b[0]) - 1e-8 && c[0] <= Math.max(a[0], b[0]) + 1e-8 && c[1] >= Math.min(a[1], b[1]) - 1e-8 && c[1] <= Math.max(a[1], b[1]) + 1e-8
  return points.every((a, i) => {
    const b = points[(i + 1) % points.length]
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-8) return false
    return points.every((c, j) => {
      if (j === i || j === (i + 1) % points.length || i === (j + 1) % points.length) return true
      const d = points[(j + 1) % points.length]
      const proper = cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0
      return !proper && !on(a, b, c) && !on(a, b, d) && !on(c, d, a) && !on(c, d, b)
    })
  })
}

/** Sutherland-Hodgman intersection. Lot boundaries must be convex (validated in tests). */
export function clipToLot(subject: Point2[], clip: Point2[]): Point2[] {
  let output = subject
  const sign = Math.sign(signedArea(clip))
  clip.forEach((a, i) => {
    const b = clip[(i + 1) % clip.length]
    const side = (p: Point2) => sign * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]))
    const input = output
    output = []
    input.forEach((end, j) => {
      const start = input[(j + input.length - 1) % input.length]
      const startSide = side(start), endSide = side(end)
      if ((startSide >= -1e-8) !== (endSide >= -1e-8)) {
        const fraction = startSide / (startSide - endSide)
        output.push([start[0] + fraction * (end[0] - start[0]), start[1] + fraction * (end[1] - start[1])])
      }
      if (endSide >= -1e-8) output.push(end)
    })
  })
  return output
}

/** Minimum source-pixel translation placing an unchanged roof inside a convex lot.
 * Solve the 2D convex half-plane constraints, not a guessed offset or parcel-shaped roof.
 * The caller must enforce an independently declared uncertainty limit.
 */
export function fitRoofTranslation(sourceRoof: Point2[], lot: Point2[], transform: Affine2): Point2 | null {
  const roof = sourceRoof.map(p => applyAffine(transform, p))
  const sign = Math.sign(signedArea(lot))
  const constraints = lot.map((a, i) => {
    const b = lot[(i + 1) % lot.length]
    const normal: Point2 = [-sign * (b[1] - a[1]), sign * (b[0] - a[0])]
    const sourceNormal: Point2 = [normal[0] * transform[0][0] + normal[1] * transform[0][1], normal[0] * transform[1][0] + normal[1] * transform[1][1]]
    const length = Math.hypot(...sourceNormal)
    if (length < 1e-10) throw new Error('Singular edge or transform')
    const distance = Math.min(...roof.map(p => normal[0] * (p[0] - a[0]) + normal[1] * (p[1] - a[1])))
    return { normal: sourceNormal.map(n => n / length) as Point2, minimum: -distance / length }
  })
  const candidates: Point2[] = [[0, 0]]
  constraints.forEach((constraint, i) => {
    const [x, y] = constraint.normal
    candidates.push([x * constraint.minimum, y * constraint.minimum])
    constraints.slice(i + 1).forEach(other => {
      const [u, v] = other.normal
      const determinant = x * v - y * u
      if (Math.abs(determinant) < 1e-10) return
      candidates.push([(constraint.minimum * v - y * other.minimum) / determinant, (x * other.minimum - constraint.minimum * u) / determinant])
    })
  })
  return candidates.filter(p => constraints.every(c => c.normal[0] * p[0] + c.normal[1] * p[1] >= c.minimum - 1e-8))
    .sort((a, b) => Math.hypot(...a) - Math.hypot(...b))[0] ?? null
}