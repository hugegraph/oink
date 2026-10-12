# Combined documentation companion

`docs-combined.patch` applies all four documentation companions in one commit to
the **documentation repository**, `pgsty/oink.pgsty.com`, at baseline
`edeb45b31c3b0f38078715d64e6aba43691fe591`. It resolves the overlapping edits in
the component contract, `package.json`, and `tests/fixtures/browser.yml` so that
maintainers can apply one patch rather than manually combine four independent
patches. Individual theme PRs retain their own companion patch for separate
review.

- Combined commit: `0176e3d0fb344b7db1de856ec852bcb4ea9c8dfa`
- Local branch: `test/hugegraph-docs-combined`
- Changes: **24 files, 1,176 additions, 22 deletions**
- Patch SHA-256: `15057200db9d35c0bfc3e3fcea3e894caf5a16335e0035949bcf5dc337c24062`

## Included sources

| Companion | Final documentation source |
| --- | --- |
| FileTree | `72c21f934c422ba1889bca4fda673319b7f21f26` |
| Markmap | `79db861b41ebd9d1c44fc8578dae00839f61f6f4` |
| TOC/footer | `240f570d72d05a0eb47acf7843ac57612cc8092f` |
| Tables | Final parent-confirmed working-tree snapshot of `oink-docs-tables` on `edeb45b`, including the no-JavaScript `document.fonts.status` polling correction |

The merged English and Chinese component contract preserves all three component
corrections. The English and Chinese shell contract preserves the TOC/footer
correction. FileTree's component guide and the adjustment to its existing
browser assertions are also included. The twenty files owned by a single
companion exactly match their final source bytes; per-file hashes are recorded
in `docs-combined-manifest.json`.

`test:content-components` retains its existing component and math suites and adds
FileTree comments, Markmap theme, and table readability. `test:responsive-shell`
retains its existing suites and adds the rail/footer regression. Both commands
remain part of the existing `test:browser` script.

All three content mounts explicitly select `sites.matrix.languages: [en, zh]`.
The ordinary browser fixtures remain mounted at `content/tests`; the rail/footer
fixtures are mounted separately at `content/docs/rail-footer`, which exercises
the documentation shell. The theme module pin and local module replacement
policy are unchanged. No theme source, generated output, screenshots, or local
dependency directory is included in this patch.

## Validation performed on the combined patch

- `git diff --cached --check`: passed before committing; includes newly added
  files. Five extra EOF blank lines from the initial TOC snapshot were removed;
  its final `240f570` commit makes the identical cleanup.
- `node scripts/check-markdown-style.mjs`: passed, 143 Chinese files, 218 strong
  spans, 6 emphasis spans.
- `node scripts/check-doc-translations.mjs`: passed, **143/143** translated
  content files and **1,197** source headings checked. This is the source-only
  checker; it does not claim a fresh rendered-heading or whole-site pass.
- `node --check` passed for the four new browser test files and the modified
  `content-components.spec.mjs`.
- Verified the merged package script entries, the three EN/ZH mounts, and exact
  source equality for all twenty files owned by one companion.
- `git apply --check docs-combined.patch`: passed against the clean documentation
  checkout at `edeb45b`; that read-only check did not modify the checkout.

The previously recorded component-specific browser and build evidence remains
in each companion's evidence directory. No full website build or duplicate
browser interaction suite was run for this source merge. Running the combined
browser tests requires a theme checkout containing the corresponding four theme
fixes.

## Applying

From a documentation checkout based on the revision above, apply the combined
patch once with `git am /path/to/docs-combined.patch`. Do not additionally apply
the four individual companions to that same checkout. For an independently
updated documentation branch, first inspect `git apply --check` and resolve any
new upstream changes through normal review.

This delivery is a local documentation patch. It does not itself change the
public documentation repository, the theme repository, or the hosted site.
