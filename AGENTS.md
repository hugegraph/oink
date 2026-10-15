# OINK theme guide

Start with the canonical bilingual Design section in the sibling documentation
site at `../oink.pgsty.com/content/docs/design/`. It owns maintainer contracts,
accepted decisions, dated research, and active proposals.

## Current baseline

The current release is `v1.2.0`, dated 2026-10-05 in `CHANGELOG.md`. The sibling
site's `v1.2.0` Design contracts describe this release. Refresh Git state,
public tags, and consumer pins before making claims about later releases or
downstream adoption.

## Repository boundary

- This repository is the OINK Hugo Module: theme implementation, defaults,
  vendored assets, migration tools, focused checkers, and synthetic fixtures.
- Public bilingual documentation, tutorials, examples, case studies,
  integration/browser regression tests, visual review, and deployment belong
  to `../oink.pgsty.com`.
- The optional Go executable `oink`, including native site checks, guarded
  maintenance plans, and workspaces, belongs to `../oink-cli`. It has its own
  version and release lifecycle; ordinary Hugo consumers do not require it.
- `hugo.yaml`, owning resolvers/checkers, and `VENDOR.json` own executable
  configuration and dependency facts. Generated schemas must follow those
  sources; do not introduce a second configuration authority in the CLI.
- Do not recreate `exampleSite/`, `docs/`, `plan/`, `plans/`, `proposal/`, or
  another repository-local design tree.
- `tests/site/` is narrow internal input for deterministic theme checkers,
  invalid-input cases, and output goldens. It is not a public example, the
  integration test authority, or the surface used for visual approval.

## Cross-repository workflow

- When public behavior changes, update the implementation, its owning checker,
  and both language versions of the affected contract under
  `../oink.pgsty.com/content/docs/design/`.
- Put every new PRD, RFC, or design proposal in
  `../oink.pgsty.com/content/docs/design/proposals/<slug>.md` with a matching
  `<slug>.zh.md`. Follow that section's published lifecycle and template;
  publication is not proof of implementation.
- Put accepted rationale under `content/docs/design/decisions/` in the site
  repository and dated, non-normative evidence under `research/`. Preserve
  retired drafts in Git history and `CHANGELOG.md`, not a local planning tree.
- Run the smallest owning checker here first. Then validate the real site
  through its sibling-checkout Make targets:

```sh
make -C ../oink.pgsty.com check
make -C ../oink.pgsty.com browser
make -C ../oink.pgsty.com dev
```

- Runtime changes also use `node --test 'tests/js/**/*.test.js'`. Schema changes
  use `python3 bin/generate-config-schema.py --check`. The theme Makefile's
  `c` and `clean` targets delete generated files; they are not check targets.
- Owning output checkers normally build fresh fixtures. Use `--public` only
  when deliberately reusing output whose theme/configuration is identified.
  `bin/test_site.py` owns the 120-second limit for its Hugo subprocesses.
- Use the documentation site for rendered EN/ZH, desktop/mobile, light/dark,
  accessibility, and interaction review. Never commit a filesystem module
  replacement.
- The site's `check`, `browser`, and `dev` targets use this local theme;
  `build` and `serve` use its published pin by default. Published-pin checks
  must disable inherited replacements and both workspaces. Local regression
  success does not establish that the public module or hosted site contains
  these changes.
- A local replacement build, a committed change, a public tag, a consumer pin,
  and a deployment are separate completion states.

## After a theme release

- Include downstream adoption when releasing a new OINK version. Inventory
  the primary Hugo checkouts under `~/www` and `~/pgsty` with
  `python3 bin/update-consumers.py <tag>`, then update and validate them with
  `--write --check`. Read each site's instructions and preserve unrelated work.
- The inventory skips linked worktrees, non-default branches, hidden copies,
  and nested archives. Review every blocked or skipped result; use `--sites`
  for an explicitly selected checkout. Review vendored changes before using
  `--refresh-vendor`; a go.mod bump alone does not upgrade vendored output.
- Check exact published module resolution with local replacements and both
  workspace mechanisms disabled. Update current version references in site
  READMEs/configuration, and run each site's relevant checks. Keep historical
  release notes unchanged. Commit, push, and deployment remain separate steps.

## Theme contracts

- As of 2026-10-15, Hugo Extended 0.166.0 is the single development, CI, and
  release-test baseline and the current minimum. Advance it with stable Hugo
  releases; update CI pins, module/theme requirements, checkers, and current
  bilingual documentation together. Do not run older-Hugo compatibility
  matrices, adapt code for old versions, or add compatibility shims unless the
  user explicitly requests it. Historical release/research records are not
  current support requirements.
- The module declares Go 1.27.0; CI pins Go 1.27.0. Record the actual local
  tool versions when reporting validation.
- Run checkers with `--panicOnWarning` when they build Hugo output. Ordinary
  editing may warn and fall back; publishing gates turn warnings into failures.
- Keep generated `public/`, `resources/`, locks, and caches out of Git.
- Preserve pre-existing changes in this shared worktree and edit only the
  owning implementation, checker, and public Design contract for a change.
