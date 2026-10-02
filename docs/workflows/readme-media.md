# README screenshots and animation

The [README](../../README.md) uses real captures of the browser application in
English and light mode. The screenshots preserve the actual geometry, materials,
controls and source caveats. No illustrative renders or mock interfaces are used.

## Regenerate

Use the repository's Node.js and pnpm versions, Playwright Chromium, and FFmpeg
on `PATH`. The script reuses the web workspace's pinned Playwright dependency.

```sh
pnpm install
pnpm --filter @t3-designer/web exec playwright install chromium
pnpm --filter @t3-designer/web dev --host 127.0.0.1 --port 5173 --strictPort
```

Leave the server running. From the repository root in a second terminal:

```sh
node scripts/capture_readme.mjs
```

The script opens its own temporary Chromium session with WebGL 2 enabled,
selects the unchanged T3 project route, and fixes the study date to
**22 September 2026**. It does not use your personal browser profile or modify
the app, canonical model, snapshots, or Blender files. Chromium needs permission
to launch local processes and connect to the development server.

To review new captures before replacing the checked-in media:

```sh
README_MEDIA_DIR=artifacts/readme-preview node scripts/capture_readme.mjs
```

`README_BASE_URL` overrides the default `http://127.0.0.1:5173` server address.
Paths in `README_MEDIA_DIR` are resolved from the repository root.

## What is captured

| File in `docs/media/` | View |
| --- | --- |
| `apartment-overview.png` | Perspective cutaway at 16:00, existing fixtures and materials, Rooms inspector |
| `building-context.png` | Building cutaway exposing the apartment at 16:00 |
| `property-dossier.png` | Dossier introduction, site map, reported figures and overview cards |
| `sunlight.gif` | Building sun path from 08:15–20:00, then living-room light from 12:00–19:00 |

Still images use a 1440-pixel browser width at twice the pixel density. The GIF
uses a fixed workspace crop, 960-pixel output width, an optimized palette and
8 frames per second. Each sequence samples 56 times through the real time input,
with a one-second hold at each end. The complete loop lasts 18 seconds.

The GIF is an accelerated study of two views, with a deliberate cut between
them. It demonstrates timeline changes, rather than recording the Play button
at its native speed. All displayed times are local to Quimper (`Europe/Paris`).

Raw PNG frames are retained in a unique, ignored `artifacts/readme/capture-*`
directory. The script reports its path and the final GIF size. Only the three
final PNGs and GIF belong in `docs/media/`.

## Review before committing

Open the README preview and the GIF. Confirm that fixtures have loaded, both
scenes render, shadows change, labels are in English, and the frame stays steady.
Keep the animation small enough to load comfortably on the repository page.
Browser tests run with WebGL disabled; they cannot replace this visual review.

```sh
pnpm exec eslint scripts/capture_readme.mjs
node --test scripts/test/documentation.test.ts
git diff --check
```

The stills remain available alongside the animation for readers who prefer a
static overview. Model dimensions and building placement remain approximate;
see [the solar model's limits](../model/solar-model.md).
