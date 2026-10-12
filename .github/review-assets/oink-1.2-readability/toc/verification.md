# Fixed TOC footer-clearance verification

## Identity and scope

- Theme baseline: `f8f476e660cf053a2645b7b923ae8d08d5448fce` (OINK `v1.2.0`).
- Theme correction: `c8ca7fa9d493f5ed06fcaa5ead4e11b1263084ad`, branch `fix/toc-footer-offset`.
- Documentation-site baseline: `edeb45b31c3b0f38078715d64e6aba43691fe591`.
- Documentation companion: `240f570d72d05a0eb47acf7843ac57612cc8092f`, branch `test/toc-footer-offset`.
- Tools: Hugo `0.165.0+extended`, Go `1.27.0`, Node `24.19.0`, Playwright `1.62.1`, Chromium `155.0.8059.39`.
- Desktop evidence: 1440 × 1000 CSS px, DPR 1, slate preset. Phone check: 390 × 844 CSS px. Final Chinese screenshots use Noto Sans CJK SC and a fresh Chromium process.

The reproduction uses ordinary Markdown, a native fat footer, and native category/series/tag groups. It does not contain HugeGraph templates, render hooks, or CSS. The behavior is therefore reproducible in the theme itself. The patch only connects the fixed right rail to the existing visible-footer offset and permits the offset initializer to run without a left sidebar.

## Measured behavior

Measurements below come from the English light-mode native reproduction after scrolling to the article bottom, then sending a real mouse-wheel event over the right rail. All four disclosure groups are expanded. Coordinates are CSS pixels.

| Measurement | Baseline | Correction |
| --- | ---: | ---: |
| Footer top | 636.640625 | 636.640625 |
| Fixed rail bottom | 1000 | 635.640625 |
| Rail scrollTop after wheel | 0 | 308 |
| Final tag top–bottom | 902–928 | 594–620 |
| Final tag receives pointer hit | false | true |

With the patch, both a real click and Tab → Enter navigate to `/tags/troubleshooting/`. The keyboard run also verifies that the focused link receives the pointer hit at its visible coordinates; focus alone is not treated as proof of visibility. The no-sidebar case similarly moves the rail bottom from 1000 to 635.015625 while the footer starts at 636.015625, and the final link works through both input paths.

Raw measurements, group states, destinations, and page errors are recorded in [metrics-before.json](metrics-before.json) and [metrics-after.json](metrics-after.json). There were no page errors in the four captured cases.

## Visual evidence

| Case | Before | After |
| --- | --- | --- |
| English, light | [before-fixed-light.png](before-fixed-light.png) | [after-fixed-light.png](after-fixed-light.png) |
| English, dark | [before-fixed-dark.png](before-fixed-dark.png) | [after-fixed-dark.png](after-fixed-dark.png) |
| Sidebar disabled | [before-no-sidebar.png](before-no-sidebar.png) | [after-no-sidebar.png](after-no-sidebar.png) |
| Chinese, light | [before-fixed-zh.png](before-fixed-zh.png) | [after-fixed-zh.png](after-fixed-zh.png) |

These are actual browser screenshots. The primary pair uses the same native fixture, viewport, expanded groups, and wheel interaction on both revisions. The corrected screenshot is taken after wheel scrolling reveals the final taxonomy links above the footer.

## Implementation and owning checks

The theme commit contains four files: the fixed TOC inset, the existing footer initializer's optional-rail guard, the shell source checker, and a focused runtime test file. It adds no new observer, scroll listener, public configuration key, or dependency.

| Check | Result |
| --- | --- |
| `node --test tests/js/docs-shell-footer.test.js` | 7 passed |
| `node --test 'tests/js/**/*.test.js'` | 56 passed |
| `HUGO_THEME=oink-toc python3 bin/check-shell.py --hugo <hugo>` | Passed; fixture theme separately verified as `oink-toc` |
| New runtime tests against baseline source | Expected failure in the two TOC-without-sidebar paths |
| New shell source assertion against baseline source | Expected failure for the missing fixed-TOC footer inset |
| Theme and companion `git diff --check` | Passed |
| Companion Markdown style and browser-spec syntax | Passed |

The seven runtime checks cover all combinations of optional rails, the footer entering and leaving the viewport, coalesced scroll events, footer ResizeObserver changes, window and visualViewport changes, and absent footer/rails. The source checker also preserves flow's `position: sticky` and `inset-block-end: auto` boundary. Baseline failures are recorded in [runtime-baseline.log](runtime-baseline.log) and [source-baseline.log](source-baseline.log).

## Native browser acceptance

Strict native builds completed for both the baseline and corrected theme with explicit local module replacements, using the pinned reproduction source. Each produced 35 English and 31 Chinese pages. The native fixture has no external comment widget.

All **8 focused Playwright checks passed** on the corrected native site; see [browser-tests-native.log](browser-tests-native.log). The matrix includes English/Chinese in light/dark modes, the missing-sidebar case, real wheel scrolling, hit testing, clicking, Tab → Enter, footer collapse/expansion, right-rail hide/restore with focus, flow/sticky, no-footer, Print hiding, and the mobile drawer's single relocated aside and usable taxonomy controls.

## Documentation-site acceptance

The companion mounts the fixtures under `/docs/rail-footer/` so that they belong to the real documentation taxonomy root. Both content mounts and the fixture mount explicitly include English and Chinese. The browser suite is connected to `test:responsive-shell`; fixture comments are disabled to avoid unrelated third-party loading during shell tests.

A strict targeted build of the real documentation-site source completed in **24.9 seconds**, with **265 English and 265 Chinese pages**, against theme commit `c8ca7fa`. It used `hugo.yml`, `tests/fixtures/browser.yml`, and an acceptance overlay selecting HTML for home/page/section outputs and disabling backlinks; see [build-docsite-targeted.log](build-docsite-targeted.log) and [docsite-targeted.yaml](docsite-targeted.yaml). Both `/docs/rail-footer/fixed/` and `/zh/docs/rail-footer/fixed/` contain the native taxonomy groups and no Giscus client.

The first documentation browser pass recorded seven successful cases and one setup failure after a footer disclosure changed the document height. Its wheel helper stopped 47 px short of the new document bottom. The helper now continues real wheel input until the document height settles; the targeted footer disclosure check passed on the final built fixtures. No theme change was needed for this setup correction. The final complete matrix passed **all 8 checks in 1.8 minutes** on the final built fixtures; see [browser-tests-docsite-final.log](browser-tests-docsite-final.log).

## Reproduction and companion files

- [native-reproduction.zip](native-reproduction.zip): minimal native site sources, pinned to `github.com/pgsty/oink v1.2.0`. Extract into a new directory; use a local module replacement to compare baseline and candidate. No generated assets are included.
- [docsite-companion.patch](docsite-companion.patch): the canonical bilingual unreleased contract update, mounted fixtures, test script wiring, and browser tests, for the sibling documentation repository. The theme fix branch does not contain a parallel documentation tree.
- [browser-evidence.cjs](browser-evidence.cjs): screenshot and measured-interaction runner used for the native evidence.

For theme comparison, set `GOWORK=off`, `HUGO_MODULE_WORKSPACE=off`, and `HUGO_MODULE_REPLACEMENTS='github.com/pgsty/oink -> /absolute/path/to/theme'` for each build. Use Hugo `0.165.0 Extended` and Go `1.27.0`; build with `--panicOnWarning`. The two local screenshot servers used ports 4523 and 4524. The evidence runner starts its server and Chromium within one process.

## Limits

The separate full documentation-site production/minified build did not finish within the local verification window and was stopped after about 13 minutes. It is not reported as a passing full-site production or release gate. The completed checks above cover the native reproduction, the owning shell checker and runtime suite, and the real-site targeted configuration. Browser interaction coverage here is Chromium; no Firefox, WebKit, release deployment, or HugeGraph adoption is claimed by this report.
