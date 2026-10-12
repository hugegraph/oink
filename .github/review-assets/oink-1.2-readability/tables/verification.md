# Technical table verification

## Identity and scope

- Baseline: `f8f476e660cf053a2645b7b923ae8d08d5448fce` (resolved v1.2.0 and checked main). The relevant CSS also exists in v1.1.
- Tested local theme: `67911bf840b54aba48e4cf28b0952b67fdf641e3`.
- Published fork commit: `db7a5cb5bfc26176900ff89ca4483e81330b60ac`; matching tree `8598790aba3e71679d627a0188a521d44df68dbe`.
- Change: 28 added lines in `assets/scss/td/_content.scss`; no runtime JavaScript change.
- Tools: Hugo 0.165.0 Extended, Go 1.27.0, Playwright 1.62.1, Chrome for Testing 155.0.8059.39, Firefox 153.0; Linux, 100% zoom, device scale factor 1.

## Recorded results

| Surface | Result | Evidence |
| --- | --- | --- |
| Native candidate | 20 passed, no skipped/flaky/unexpected; 98.939s | [JSON](browser-tests.json) |
| Targeted canonical docsite | 20 passed, no skipped/flaky/unexpected; 121.456s | [JSON](docsite-tests.json) |
| Baseline English 1440px | Both engines fail key-width >150px: Chromium 56.375px, Firefox 56.717px | [JSON](baseline-tests.json) |
| Owning content-primitives checker | Passed, including static output checks | [Log](content-primitives-check.log) |
| Targeted strict docsite build | 29 EN / 27 ZH, 6.064s, zero image operations | [Log](docs-build.log) |

The ten cases per engine cover EN/ZH at 1440/768/390px, keyboard scrolling, rail resizing, short/prose/long-token tables, captions, matrix/full-width, light/dark presets, browser/dedicated Print, and no JavaScript. The no-JavaScript case polls synchronous `document.fonts.status`. Markdown and bilingual source checks passed: 143/143 files and 1,197 headings. Ordinary browser content indexing includes both languages; the companion explicitly declares EN/ZH mounts.

[Before](metrics-before.json) and [after](metrics-after.json) retain exact geometry: at 1440px, the configuration table stays 772px wide; its English key grows 56.375→177.594px and changes 6→1 lines. English/Chinese PD descriptions grow 40.938/56.938→400px; first-row heights become 74.563px from 1488.313/455.188px. All eight measured page states retain 16px text, no document overflow, and no page errors.

## Environment and limits

Firefox required the test-process environment variable `MOZ_DISABLE_CONTENT_SANDBOX=1` because the restricted container could launch Firefox but could not start its content process normally. This environment accommodation is not committed to theme or documentation source. No outer container permissions were changed.

The docsite build used a targeted content mount, not a full-site gate. No WebKit, physical-device, printer, or whole-site browser pass is claimed. Print/RSS retain their existing static contract. The [ZIP](native-reproduction.zip) supplies the independent reproduction; the [documentation patch](docs-companion.patch) is prepared separately and is not represented as already merged upstream.
