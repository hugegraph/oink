# HugeGraph: OINK readability fixes

Review evidence for four independently reproduced OINK defects reported during HugeGraph's OINK 1.2.0 adoption. The fork's Issues feature is disabled, so each fix is submitted as a separate pull request with the complete problem report and before/after images.

All four theme branches start at `f8f476e660cf053a2645b7b923ae8d08d5448fce`, the resolved v1.2.0 release and checked fork/upstream main. The technical-table behavior also exists in v1.1.0. Native comparisons load no HugeGraph layouts, hooks, or styles. Images are direct browser captures, not mockups or generated illustrations.

| Priority | Fix branch | Result | Evidence |
| --- | --- | --- | --- |
| High | [Markmap text](https://github.com/hugegraph/oink/tree/fix/markmap-theme-text) | Slate dark label contrast 1.50:1 → 16.23:1 | [Verification](../markmap/verification.md) |
| High | [Fixed TOC/footer](https://github.com/hugegraph/oink/tree/fix/toc-footer-offset) | The last taxonomy link can be scrolled into view and activated above the footer | [Verification](../toc/verification.md), [native site](../toc/native-reproduction.zip) |
| Medium | [FileTree comments](https://github.com/hugegraph/oink/tree/fix/filetree-readable-comments) | Complete comments wrap at desktop/tablet widths without hover | [Verification](../filetree/verification.md) |
| Medium | [Technical tables](https://github.com/hugegraph/oink/tree/fix/readable-technical-tables) | Readable identifiers and descriptions within native scroll viewports | [Verification](../tables/verification.md), [native site](../tables/native-reproduction.zip) |

Open PRs are listed at [hugegraph/oink/pulls](https://github.com/hugegraph/oink/pulls). Each PR links selected original screenshots and measured before/after data using an immutable evidence commit. [Published code identities](published-code.json) record the remote commits and exact trees matched to the tested local changes.

## Documentation companion

The theme's repository boundary places public bilingual contracts and browser integration tests in `pgsty/oink.pgsty.com`. Each PR supplies its own companion patch. To apply all four documentation updates together, use [docs-combined.patch](docs-combined.patch) against documentation baseline `edeb45b31c3b0f38078715d64e6aba43691fe591`:

```sh
git apply --check docs-combined.patch
git apply docs-combined.patch
```

The combined patch reconciles shared component contracts, package scripts and bilingual fixture mounts. It contains 24 documentation/test files and has passed application on a clean baseline, Markdown style, bilingual source coverage and affected JavaScript syntax checks. [Combined verification](docs-combined-verification.md) and [source manifest](docs-combined-manifest.json) give the precise scope. It is prepared for the separate documentation repository and has not been submitted or merged there.

## Validation scope

The four focused browser suites pass: Markmap 4, TOC 8, FileTree 14, and Tables 20 (ten cases in each of Chromium and Firefox). Existing owning theme checkers pass, and the complete theme JavaScript suite passes 56 tests. Native reproduction builds and the recorded targeted canonical docsite builds pass strict Hugo warning checks. The individual verification records distinguish repeated native/docsite runs from unique test cases and record baseline failures where used.

The full public documentation site's entire integration gate was not completed. Chromium coverage includes desktop, emulated mobile, light/dark and print; the tables also have Firefox coverage. These records do not claim physical-device or WebKit qualification. Raw logs and harnesses preserve the recorded local run, so recorded workspace paths should be replaced with the reviewer's paths when reused. The ZIP reproductions are standalone consumers pinned to the released baseline.

This evidence branch is review material; the four code PRs contain their own focused theme changes. The fork main branch and HugeGraph's theme dependency receive the fixes when maintainers merge and adopt them.
