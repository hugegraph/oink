# Cross-review updates — 2026-10-13

This is dated review evidence, not a release note, public contract, deployment record, or whole-site CI pass. All four existing PR branches were updated; no PR was merged and no consumer pin was changed.

## Published revisions

| PR / issue | Branch | Final commit | Follow-up change |
| --- | --- | --- | --- |
| [#1](https://github.com/hugegraph/oink/pull/1) / #5 | `fix/markmap-theme-text` | `5c299ad77e11ee05fbec19378699f236af5289d6` | Add two source guards for screen-only wrapper/SVG mapping; production unchanged |
| [#2](https://github.com/hugegraph/oink/pull/2) / #6 | `fix/toc-footer-offset` | `7121e6a46ef9e15d22c8aa214269143eeb63a423` | Extend footer tests from 7 to 10 cases; production unchanged |
| [#3](https://github.com/hugegraph/oink/pull/3) / #8 | `fix/filetree-readable-comments` | `d65ea176c3198d60bc678c1b253600c796b6b07f` | Add two source guards for wrapping/minimum row height and retained name truncation; production unchanged |
| [#4](https://github.com/hugegraph/oink/pull/4) / #10 | `fix/readable-technical-tables` | `d20f908d231b906b863bcf4cdb1b6681a4b49735` | Fit ordinary prose, explicit technical width, nested-static isolation, consumer-override preservation; source guard and EN/ZH fixture inputs |

Common base: `f8f476e660cf053a2645b7b923ae8d08d5448fce`. PR #4's original candidate was `db7a5cb5bfc26176900ff89ca4483e81330b60ac`.

## Table design and tradeoff

The original unconditional `max-content` policy could make ordinary multi-column prose scroll when wrapping would fit. Simply switching to `auto` reintroduced a narrow PD description. The replacement does not guess intent from column names, counts, language, or inline code:

- Ordinary screen tables prefer `width: auto` with technical token wrapping preserved.
- Authors can add `{.td-table--wide}` to intentionally retain the technical wide-table policy. It keeps `max-content` and a soft `40ch` cell measure; this is not a fixed or guaranteed column width.
- Only a table's own row cells receive sizing rules. A nested static viewport resets inherited wrapping rather than taking an outer screen table's settings.
- `:where()` makes structural and mode guards zero-specificity. Existing consumer table/cell overrides need not fight a newly stronger selector.

No new JavaScript, observer, dependency, renderer, column-name heuristic, or reduced font size is introduced. `.full-width` still controls the available outer canvas; `.td-table--wide` controls the inner table policy. They are separate choices.

**Important adoption boundary:** unmarked PD tables are not claimed to retain the wide description automatically. The new explicit marker must accompany adoption. This supersedes the earlier unconditional-wide/no-new-option proposal.

## Fresh local execution

Environment: Linux amd64, Node **22.16.0**, Chromium **144.0.7559.96**, Python Playwright. Hugo is unavailable; local Go is 1.23.2 rather than the repository's 1.27 requirement. GitHub DNS resolution failed in the local container; fixed-revision source was read through the connected GitHub API.

| Check | Actual result | What it establishes |
| --- | --- | --- |
| [Table policy browser runner](tests/table-regression.py) | **83/83 checks passed** on the final policy | CSS-compatible source blocks in reduced DOM/Arial fixtures; includes negative controls, not 83 native site integration tests |
| Markmap/FileTree/table reduced CSS checks | **15/15 passed** | Five Markmap cascade/media checks, six FileTree text-fragment cases including asserted LTR/RTL direction, four table mechanism checks; no native renderer or site build |
| `tests/js/table-layout-source.test.js` | **4/4 passed** | Executed against the complete final `_content.scss` snapshot, including its exact selectors |
| Expanded footer test | **10/10 passed against an initializer excerpt** | Exact initializer logic with mocked browser state; NOT the full `docs-shell.js` runtime |
| Footer baseline selector negative control | **5 passed / 5 failed**, expected | No-left-sidebar paths distinguish the fix from the old presence guard |
| New Markmap and FileTree source-guard files | **Syntax checks passed; complete-source execution NOT RUN locally** | Do not count their two guards each as executed assertions |
| Docsite companion browser spec | **Syntax passed; integration execution NOT RUN** | The six new docsite cases are prepared, not an integration pass |
| Both companion patches | `git apply --numstat` parsed successfully | Patch syntax, not an applied/build-validated companion checkout |

The table runner reads the actual proposed screen/static SCSS blocks as CSS-compatible nested CSS. It does **not** compile the complete Sass bundle or reproduce the full Hugo output. Its base DOM, font and table styling are intentionally reduced. The other CSS probe similarly uses reduced rules. The local execution package supplied in the conversation retains source snapshots, raw JSON and TAP logs.

Table coverage includes ordinary 3/5-column prose, short tables, configuration keys with/without the marker, English/Chinese PD descriptions with the marker, 1440/768/390 viewport widths, 772/954px desktop content widths, LTR/RTL, container resizing, actual arrow-key scrolling, long code/link text fragments, captions, no page JavaScript, print/static exclusion, nested static cells and consumer width/cell overrides. Matrix/full-width native integration remains in the companion and is not freshly browser-qualified here.

### Paired reduced measurements

Identical 772px article container, 16px Arial, Chromium 144; these are not native OINK font measurements:

| Case | Comparison | Width / description | First-row height |
| --- | --- | ---: | ---: |
| Ordinary five-column prose | Original PR #4 | Table 1181.83px | 56.19px |
| Same ordinary prose | Final policy, no marker | Table 772px | 56.19px |
| English PD | Auto-only counterexample | Description 119.27px | 182.19px |
| Same English PD | Explicit wide mode | Description 355.94px | 56.19px |
| Chinese-description PD | Auto-only counterexample | Description 113.02px | 146.19px |
| Same Chinese-description PD | Explicit wide mode | Description 355.94px | 56.19px |

The final runner also restores the intermediate higher-specificity selectors as a negative control: consumer width/cell overrides are blocked there and succeed with the final `:where()` structure.

### Re-run the table mechanism checks

From a clone with the listed commit objects and a Python environment containing Playwright plus Chromium:

```sh
tmp=$(mktemp -d)
git show db7a5cb5bfc26176900ff89ca4483e81330b60ac:assets/scss/td/_content.scss > "$tmp/original.scss"
git show d20f908d231b906b863bcf4cdb1b6681a4b49735:assets/scss/td/_content.scss > "$tmp/candidate.scss"
OINK_TABLE_BASELINE="$tmp/original.scss" \
OINK_TABLE_SOURCE="$tmp/candidate.scss" \
CHROMIUM=/usr/bin/chromium \
python .github/review-assets/oink-1.2-readability/cross-review-2026-10-13/tests/table-regression.py
```

For the complete owning runtime, independently check out the appropriate PR and run `node --test 'tests/js/**/*.test.js'`. That command is a required next validation, not a command claimed as executed by this record. Use the documented Hugo/Go toolchain and sibling-site gates for native acceptance.

## Independent adversarial review

The repository's existing CodeRabbit agent performed an independent [full source review](https://github.com/hugegraph/oink/pull/4#pullrequestreview-5500264982) and posted [the ordinary-prose risk](https://github.com/hugegraph/oink/pull/4#discussion_r4255954951). A separate follow-up checked the four pinned revisions in disposable local checkouts and successfully applied their diffs together without conflicts. Its [explicit execution summary](https://github.com/hugegraph/oink/pull/4#issuecomment-6141393486) says **all Node suites and browser/build checks were NOT RUN**, despite a Node 24.15.0 environment.

That follow-up raised the public-contract/adoption gap and the stronger selector's consumer-override risk. The final `d20f908` revision addresses specificity, and the companion files below document adoption. The independent overlay used PR #4 at `714ff126`; do not extend that result into a final-revision test pass or an approval. No multiple internal review agents or independent runtime passes are claimed.

## Separate companions: prepared, not applied

1. [docs-layout-policy.patch](docs-layout-policy.patch) belongs to `oink.pgsty.com`. Apply after the [original table companion](../tables/docs-companion.patch). It revises both language contracts, marks the original technical fixtures, adds ordinary/wide bilingual fixtures and six integration cases, and wires them into the existing content-components script.
2. [hugegraph-pd-wide.patch](hugegraph-pd-wide.patch) adds `.td-table--wide` to the EN/CN PD environment tables in `hugegraph/hugegraph-doc`, retaining `.hg-pd-env` for the old pin's fallback. It changes no prose, dependency or deployment setting.

Neither companion has been applied to its owning repository in this update. Existing native screenshots/metrics under `cea814c` remain historical evidence of the original defects and initial candidates, not fresh captures of the final explicit-width policy. A theme commit, companion adoption, a passing native release gate, a published version, a downstream pin and a deployment remain separate states.
