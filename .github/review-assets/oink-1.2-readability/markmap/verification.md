# Markmap fix verification

## Revisions and tools

- Baseline: `f8f476e660cf053a2645b7b923ae8d08d5448fce`; the fetched annotated `v1.2.0` tag resolves to this commit. Parent independently verified fork and upstream `main` at this same commit.
- Theme implementation: `40617887df2cc0fb0a3705c24a83c08916358cdc`, branch `fix/markmap-theme-text`.
- Documentation source baseline: `edeb45b`, isolated worktree `oink-docs-markmap`.
- Final documentation companion: `79db861b41ebd9d1c44fc8578dae00839f61f6f4`, including an explicit EN/ZH language matrix on both existing `tests/fixtures/browser.yml` mounts. The theme commit remains unchanged.
- Hugo: `v0.165.0-76a5e1880ab46688155b02e99bab9be2a6134492+extended`, Linux amd64.
- Go: 1.27.0; Node: 24.19.0; Chromium: 155.0.8059.39; Playwright: 1.62.1.
- Chinese screenshot font: Noto Sans CJK SC Regular. Chinese captures were repeated in a new Chromium process after installing the font, and the desktop pair was visually inspected.

## Passed checks

1. `bin/check-namespace.py` built a fresh strict fixture with `HUGO_THEME=oink-markmap`, using the worktree theme. A second run against the explicitly identified patched native output also passed (`namespace-check.log`).
2. Native baseline and patched consumers both built in production with `--printPathWarnings --panicOnWarning`. Both preserve the same minimal outline and native OINK templates/assets; neither loads HugeGraph overrides.
3. The targeted canonical documentation-site build passed with its original `hugo.yml` plus a content-mount overlay containing the actual two browser fixtures and two component-contract pages. The local module replacement points to `oink-markmap`; no replacement was committed. Result: 29 EN / 27 ZH pages, no image operations, 8.0 seconds.
4. All four new documentation-owned Playwright tests passed in 1.9 minutes. Scope: EN/ZH × 390/1440; each covers four presets × light/dark, persistent SVG identity, saved preferences, real fold/reopen, real wheel zoom, browser print media, dedicated Print output, and a later site CSS token override. There were no page errors.
5. Markdown style checker passed. The rendered EN/ZH component contracts share all ten stable heading IDs in the same order.
6. Eight native screenshots and browser-derived `metrics.json` verify the defect and correction. At both widths and languages, seven labels change from `#333333` to `#e8eef6` on an unchanged `#0b1119` canvas: **1.4995:1 → 16.2315:1**. Document width equals viewport width in all eight samples.
7. Checked the default Playwright configuration's actual content mounts separately from the earlier targeted content overlay. Before the explicit matrix change, `hugo list all --config hugo.yml,tests/fixtures/browser.yml` already listed both fixtures in this environment (`default-mounts-before.csv`); no missing-ZH reproduction is claimed. Both mounts now explicitly select `[en, zh]`, matching the root site's mount policy. A strict production build using `hugo.yml,tests/fixtures/browser.yml,default-mounts-segment.yml` retained those original content mounts and only limited rendering to `/tests/markmap-theme` with Hugo's segment feature. It passed in **6.127 seconds**, rendering 3 EN / 3 ZH outputs and processing no images (`default-mounts-build.log`). The generated English and Chinese ordinary HTML and dedicated Print HTML each have the correct language and one seven-node Markmap source block (`default-mounts-html.json`). The Markdown style checker and `git diff --check` passed again; already-passing browser interactions and whole-site gates were not repeated.

## Default-mount verification command

Run from the documentation worktree with Hugo 0.165.0 Extended and Go 1.27.0 on `PATH`:

```sh
GOMAXPROCS=2 GOTOOLCHAIN=local GOWORK=off HUGO_MODULE_WORKSPACE=off \
HUGO_MODULE_REPLACEMENTS='github.com/pgsty/oink -> /workspace/scratch/8c4592f1f41d/oink-markmap' \
hugo --config hugo.yml,tests/fixtures/browser.yml,/workspace/scratch/8c4592f1f41d/evidence/markmap/default-mounts-segment.yml \
  --renderSegments markmap-fixture \
  --destination /workspace/scratch/8c4592f1f41d/evidence/markmap/default-mounts-public \
  --environment production --printPathWarnings --panicOnWarning
```

`default-mounts-segment.yml` only sets `segments.markmap-fixture.includes[0].path` to `/tests/markmap-theme`; it does not set `module`, mounts, or languages. This follows [Hugo's documented segmented rendering](https://gohugo.io/configuration/segments/), preserving the complete site content graph while avoiding unrelated image processing. Actual generated paths:

- `/tests/markmap-theme/index.html` (`en-US`)
- `/zh/tests/markmap-theme/index.html` (`zh-CN`)
- `/_print/tests/markmap-theme/index.html` (`en-US`)
- `/zh/_print/tests/markmap-theme/index.html` (`zh-CN`)

## Material limits

- A full canonical documentation-site production build was attempted and failed after 158 seconds on a pre-existing image resize timeout for `content/case/silo/featured.webp` while several agents were building. It is not reported as a whole-site pass; the targeted build identifies exactly what was validated.
- These runs used Chromium on Linux. No Firefox, Safari/WebKit, physical printer, or physical mobile device was tested. The browser print-media and Print-output checks verify actual computed label contrast on the white print canvas.
- The first desktop browser attempt selected the autohiding navbar after taking a scrolling SVG screenshot; its interception blocked the click. The regression test now uses OINK's normal footer Appearance entry, which exercises the same controls and avoids testing unrelated navbar behavior.
- No JavaScript runtime or vendored dependency changed. The fix addresses ordinary Markmap label text; it does not claim to audit every authored link, highlight, or embedded code palette.
- Theme, documentation companion, and evidence remain separate artifacts. No remote mutation was performed by this subagent.

## Design choice

The screen-only `.td-content .markmap` rule covers both wrapper and generated SVG. Its two-class specificity beats the vendor's late `.markmap` declaration, while normal site overrides remain possible without `!important`. The existing body color token already responds to preset and mode changes, so a new event listener or Markmap rerender would add maintenance cost without changing the result. Print deliberately retains the vendor's dark text because the dark screen body token does not become dark merely when the print canvas turns white.
