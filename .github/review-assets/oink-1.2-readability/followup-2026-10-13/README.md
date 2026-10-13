# HugeGraph / OINK 1.2 defect handoff — 2026-10-13

This is an evidence-branch handoff, not a new public theme contract, release note, or claim of deployment. The four implementation PRs already existed and were reused rather than duplicated. Their descriptions now include closing references to the corresponding issues, native before/after screenshots, cause diagrams, reproduction steps, and explicitly scoped verification.

## Canonical issue / PR map

| Relative priority | Defect | Issue | Implementation PR | Main design boundary |
| --- | --- | --- | --- | --- |
| High | Markmap dark labels on a dark canvas | [#5](https://github.com/hugegraph/oink/issues/5) | [#1](https://github.com/hugegraph/oink/pull/1) | Map the article token on wrapper and SVG, screen only; preserve print and consumer overrides |
| High | Fixed right rail hidden by footer | [#6](https://github.com/hugegraph/oink/issues/6) | [#2](https://github.com/hugegraph/oink/pull/2) | Reuse the shared offset; initialize for either rail, including no-left-sidebar layouts |
| Medium | FileTree comments require hover to read fully | [#8](https://github.com/hugegraph/oink/issues/8) | [#3](https://github.com/hugegraph/oink/pull/3) | Default wrapping with minimum row height; preserve filename/disclosure/splitter behavior |
| Medium | Technical table identifiers and descriptions are squeezed | [#10](https://github.com/hugegraph/oink/issues/10) | [#4](https://github.com/hugegraph/oink/pull/4) | Preserve intrinsic token width, let the wrapper scroll, and bound prose's preferred measure |

The table defect has two cases in one issue: three-column identifier wrapping and five-column description squeezing. It predates v1.2; it is not a new v1.2 regression. The FileTree change deliberately trades extra vertical space for complete readable descriptions.

## Revisions and ownership

- Checked baseline: `f8f476e660cf053a2645b7b923ae8d08d5448fce`, shared by the resolved v1.2.0 tag and checked fork/upstream main.
- PR #1: `9ea2192bd14c89fe2594b4b4cede01432806af11`.
- PR #2: `4e40bd880ea6e2988b9ed2046655abd7588ea8a9`.
- PR #3: `18475cd3c6a8f0417b9025a0ba2059ba09731ef4`.
- PR #4: `db7a5cb5bfc26176900ff89ca4483e81330b60ac`.
- Original native screenshots, metrics, and companion patches: evidence commit `cea814c2608143213b33f8d47084c8975d1fbcd0`.

At the follow-up check, all four PRs were open, non-draft, and unmerged. Their implementation commits were unchanged by this issue/diagram follow-up. Public bilingual contracts and browser integration tests belong to the separate `oink.pgsty.com` repository; the supplied companion patches are not represented as merged there. HugeGraph's checked go.mod still requires `github.com/pgsty/oink v1.2.0`.

## Fresh source-excerpt verification recorded here

The adjacent [footer-offset-excerpt.test.cjs](footer-offset-excerpt.test.cjs) archives the isolated `initFooterOffset()` mechanism test. It embeds the baseline function read from GitHub and the exact candidate selector change, then exercises a mocked DOM/window using Node's VM. It does not import or execute the complete theme runtime.

Environment: Linux amd64, Node **22.16.0**. Commands from this directory:

```sh
node --test footer-offset-excerpt.test.cjs
FOOTER_VARIANT=baseline node --test footer-offset-excerpt.test.cjs
```

| Variant | Passed | Failed | Exit status |
| --- | ---: | ---: | ---: |
| Candidate initializer | 7 | 0 | 0 |
| Baseline negative control | 5 | 2 | 1, expected |

The two baseline failures are the ordinary TOC-only path and the TOC-only visual-viewport path. Other cases cover both rails, sidebar only, scroll coalescing, footer/window resizing, missing footer, and no rail consumers. This record covers this seven-case harness only; other suites listed in the PR bodies have their own scope and counts.

The local clone attempt failed because github.com could not be resolved. Hugo was not installed; local Go was 1.23.2, not the theme's 1.27.0 baseline. Accordingly, this record claims no new full-source checkout, Hugo build, native browser layout test, full JavaScript suite, or current CI pass.

## Archived native evidence, separate from the check above

- [Markmap verification](../markmap/verification.md): native paired captures and recorded contrast of approximately 1.50:1 to 16.23:1 on the Slate dark canvas; four dedicated browser cases.
- [Right-rail verification](../toc/verification.md): native final-tag wheel, hit-testing, click, and keyboard checks; eight native and eight targeted-docsite browser cases.
- [FileTree verification](../filetree/verification.md): full text-fragment containment, interactions, EN/ZH, mobile, and Print; fourteen dedicated browser cases.
- [Table verification](../tables/verification.md): both table cases, including 20 native and 20 targeted-docsite Chromium/Firefox cases. The recorded three-column table remains 772px wide while its English key changes from six lines to one.

These are archived, fixture-specific results and images, not fresh screenshots or a whole-site gate. The original records identify their tool versions, theme selection, companion patches, and limits.

## Completion boundary

Issue creation, a proposed implementation, successful targeted checks, merging, publishing a module version, changing the HugeGraph pin, and deploying the site are separate states. This follow-up completes the issue/PR cross-references, explanatory diagrams, and supplemental evidence handoff. It does not merge PRs, release OINK, apply the separate docsite companions, or deploy HugeGraph.
