# FileTree fix verification

## Source identity

- Theme baseline: `f8f476e660cf053a2645b7b923ae8d08d5448fce`, the resolved `v1.2.0` release and checked main branch.
- Theme candidate: `466b5eb6a52edebc89bd5540dfe37ca2798f0646` on `fix/filetree-readable-comments`.
- Canonical documentation checkout baseline: `edeb45b`; companion changes are in `filetree-docs-companion.patch` and the isolated `oink-docs-filetree` worktree.
- Final documentation companion commit: `72c21f934c422ba1889bca4fda673319b7f21f26`, including explicit EN/ZH language matrices on both existing browser-fixture mounts. The theme commit is unchanged.
- No remote mutation was performed by this agent.

The production change is 6 added and 5 removed SCSS lines. The complete theme commit includes the owning output checker and two narrow synthetic fixtures. Public bilingual prose and browser integration tests remain in the companion documentation patch.

## Environment and ownership

Hugo Extended 0.165.0, Go 1.27.0, Node 24.19.0, Playwright 1.62.1, Chromium 155.0.8059.39; Slate preset; 100% browser zoom; device scale factor 1. English uses the theme's bundled fonts. Chinese glyphs use Noto Sans CJK SC Regular, installed from the official notofonts/noto-cjk repository.

The documentation site has no FileTree project-style override and loads no HugeGraph templates, hooks, or CSS. Both snapshots use the same documentation content, configuration, and CSS source order; only the selected theme checkout differs.

Initial Chinese captures exposed a missing system CJK font. Those captures and measurements were replaced after installing Noto and restarting Chromium. The delivered Chinese images show actual glyphs and were visually inspected.

## Results

| Gate | Result |
| --- | --- |
| Full `bin/check-content-primitives.py` | Passed with the candidate theme selected explicitly |
| `node --test tests/js/filetree.test.js` | Passed |
| Strict canonical documentation build, baseline | Passed |
| Strict canonical documentation build, candidate | Passed |
| Selected browser regression on baseline | Failed at the expected `comment.clipped` assertion |
| Candidate browser suite after CJK font installation | 14 passed |
| Documentation Markdown style | Passed |
| Documentation translation check | 143/143 files; 1197 source headings checked |
| Default browser mounts, strict segmented production build | Passed; EN/ZH ordinary HTML and Print output verified |

The browser suite covers EN/ZH × 1440/768/390px × light/dark; keyboard Home/End splitter positions; directory collapse with Enter and reopening through a touch tap; actual text-fragment containment; shared comment-column alignment; non-overlapping row boxes; minimum row height and full-height indent guides; an unbroken 64-character comment; document overflow; no JavaScript; and fully expanded static Print output without a divider.

The baseline failure is substantive:

```text
schema store: property keys, vertex/edge/index labels, counters
expect(comment.clipped).toBe(false)
Expected: false
Received: true
```

The rendered `title` and DOM text exist in both builds. The regression therefore measures clipping and the browser Range rectangles, rather than treating DOM presence as evidence of readability.

The final companion makes both existing `tests/fixtures/browser.yml` mounts explicitly select `sites.matrix.languages: [en, zh]`. The earlier full canonical builds and 14 browser cases already reached the real Chinese fixture in this environment; this edit makes the intended mount scope explicit, rather than claiming a newly reproduced missing-language defect. A final strict build used the ordinary `hugo.yml,tests/fixtures/browser.yml` configuration plus `default-mounts-segment.yml`, which only restricts rendering to `/tests/filetree-comments` and does not replace mounts or languages. It passed in 7.269 seconds (3 EN / 3 ZH outputs). All four generated ordinary/Print pages have the correct language and complete three comments, and the Print pages omit the divider. See `default-mounts-build.log` and `default-mounts-html.json`. The already-passing interaction matrix was not repeated for this declarative mount metadata change.

## Main measured comparison

| Case | Before | After |
| --- | --- | --- |
| English 1440px | 441px text in 348px space; clipped in a 30.4px row | 2 lines, full text, 35.5px row |
| English 768px | 441px text in 181px space; clipped in a 30.4px row | 3 lines, full text, 53.2px row |
| Chinese 768px | All 3 comments clipped in 181px space | 2–3 lines; every text fragment inside its row |
| English/Chinese 390px | Existing stacked layout wraps | Full text remains visible |

All screenshots use Home at widths where the divider is displayed. The 8 `*-tree.png` files are direct Playwright element screenshots, suitable for a clear before/after comparison. The 12 other PNGs retain the full 1440/768/390 × 1000 viewport context. `metrics.json` records the corresponding tree widths and individual comment measurements.

Recommended primary images: `before-en-768-tree.png` and `after-en-768-tree.png`. Chinese counterparts: `before-zh-768-tree.png` and `after-zh-768-tree.png`.

## Reproduction commands

Select the candidate for theme-owned checkers explicitly. A sibling worktree named `oink-filetree` otherwise risks resolving the fixture's fixed `theme: oink` name to the separate baseline checkout.

```sh
PATH=/workspace/scratch/8c4592f1f41d/tooling/hugo:/workspace/scratch/8c4592f1f41d/tooling/go/bin:$PATH \
HUGO_THEME=oink-filetree \
HUGO_THEMESDIR=/workspace/scratch/8c4592f1f41d \
GOWORK=off \
python3 bin/check-content-primitives.py

node --test tests/js/filetree.test.js
```

For the canonical documentation site, set the theme module replacement inline and build with `--config hugo.yml,tests/fixtures/browser.yml --environment production --panicOnWarning --printPathWarnings`. The two build logs preserve the actual commands' results.

`run-browser.cjs` starts the two static servers and Chromium/test processes inside the same execution environment. It emits the measurements, viewport screenshots, cropped tree screenshots, baseline failure log, and candidate result log. Run it with the before/after build directories already present.

## Design decisions and limits

Default wrapping avoids introducing an accessibility-only disclosure control, a user setting, per-entry state, or another JavaScript code path. Short desktop rows keep the existing height; long comments use additional vertical space. Names keep their existing truncation behavior. Directory disclosure, the 50–70% splitter bounds, mobile stacking, and the Print template remain unchanged.

This work qualifies Chromium behavior, including touch emulation. It does not claim separate Firefox, WebKit, operating-system screen-reader, or physical-device testing. The unmodified runtime's focused Node checker was also executed. Documentation patch publication and theme release remain separate from this local implementation and validation.
