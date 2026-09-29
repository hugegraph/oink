#!/usr/bin/env python3
"""Inventory or update published OINK pins in sibling Hugo repositories."""

import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

MODULE = "github.com/pgsty/oink"
CONFIG_NAMES = ("hugo.yaml", "hugo.yml", "hugo.toml", "hugo.json",
                "config.yaml", "config.yml", "config.toml", "config.json")


def release_env():
    env = os.environ.copy()
    env.pop("HUGO_MODULE_REPLACEMENTS", None)
    env["GOWORK"] = "off"
    env["HUGO_MODULE_WORKSPACE"] = "off"
    return env


def run(site, *args):
    result = subprocess.run(args, cwd=site, env=release_env(), text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if result.returncode:
        raise RuntimeError(f"{' '.join(args)}\n{result.stdout}")
    return result.stdout.strip()


def git(site, *args):
    try:
        return run(site, "git", *args)
    except RuntimeError:
        return ""


def module_info(site):
    return json.loads(run(site, "go", "mod", "edit", "-json"))


def pin(info):
    return next((r["Version"] for r in info.get("Require") or []
                 if r["Path"] == MODULE), None)


def has_checksums(site, version):
    sums = site / "go.sum"
    if not version or not sums.exists():
        return False
    versions = {parts[1] for line in sums.read_text().splitlines()
                if len(parts := line.split()) == 3 and parts[0] == MODULE}
    return {version, version + "/go.mod"}.issubset(versions)


def imports_theme(site):
    files = [site / name for name in CONFIG_NAMES]
    if (site / "config").is_dir():
        files.extend(p for p in (site / "config").rglob("*")
                     if p.suffix in (".yaml", ".yml", ".toml", ".json"))
    return any(p.is_file() and MODULE in p.read_text() for p in files)


def inspect(site, explicit=False, refresh_vendor=False, version=None):
    if not (site / "go.mod").is_file():
        return None
    if MODULE not in (site / "go.mod").read_text() and not imports_theme(site):
        return None
    info = module_info(site)
    if not pin(info) and not imports_theme(site):
        return None
    item = {"site": str(site), "before": pin(info), "status": "ready"}
    reason = None
    if not git(site, "rev-parse", "--show-toplevel"):
        reason = "not a Git checkout"
    elif not explicit:
        branch = git(site, "branch", "--show-current")
        default = git(site, "symbolic-ref", "--short", "refs/remotes/origin/HEAD")
        default = default.removeprefix("origin/") if default else "main"
        git_dir = git(site, "rev-parse", "--absolute-git-dir")
        common = git(site, "rev-parse", "--path-format=absolute", "--git-common-dir")
        if git_dir != common:
            reason = "linked worktree; update its primary checkout"
        elif branch != default:
            reason = f"branch {branch or '(detached)'}; default is {default}"
    if reason:
        item.update(status="skipped", reason=reason)
    elif any(r["Old"]["Path"] == MODULE for r in info.get("Replace") or []):
        item.update(status="blocked", reason="go.mod replaces OINK; review manually")
    elif ((site / "_vendor/modules.txt").exists()
          and f"# {MODULE} {version}\n" not in (site / "_vendor/modules.txt").read_text()
          and not refresh_vendor):
        item.update(status="blocked", reason="vendored modules require a separate vendor refresh")
    elif (git(site, "status", "--porcelain", "--", "go.mod", "go.sum") and not explicit
          and not (pin(info) == version and has_checksums(site, version))):
        item.update(status="blocked", reason="module files have local changes; review and select with --sites")
    return item


def discover(roots, sites, refresh_vendor=False, version=None):
    # Do not recurse into archives, generated output, caches, or theme fixtures.
    candidates = set()
    items = []
    for root in roots:
        root = root.expanduser().resolve()
        try:
            candidates.update(p.resolve() for p in root.iterdir()
                              if p.is_dir() and not p.name.startswith("."))
        except OSError as error:
            items.append({"site": str(root), "before": None, "status": "failed",
                          "reason": f"cannot scan root: {error}"})
    explicit = {p.expanduser().resolve() for p in sites}
    candidates.update(explicit)
    for site in sorted(candidates):
        try:
            item = inspect(site, site in explicit, refresh_vendor, version)
            if item is None and site in explicit:
                item = {"site": str(site), "before": None, "status": "failed",
                        "reason": "explicit site is missing or is not an OINK consumer"}
        except (RuntimeError, OSError, ValueError) as error:
            item = {"site": str(site), "before": None, "status": "failed",
                    "reason": f"cannot inspect consumer: {error}"}
        if item:
            items.append(item)
    return items


def verify_graph(site, hugo, version, vendored=False):
    graph = run(site, hugo, "mod", "graph")
    matches = [line for line in graph.splitlines() if MODULE + "@" in line]
    expected = MODULE + "@" + version + ("+vendor" if vendored else "")
    if not matches or any(line.split()[-1] != expected
                          for line in matches):
        raise RuntimeError(f"expected published {MODULE}@{version}; got:\n{graph}")
    return graph


def update(site, hugo, version, backup, refresh_vendor=False):
    names = ("go.mod", "go.sum")
    original = {name: (site / name).read_bytes() if (site / name).exists() else None
                for name in names}
    backup.mkdir(parents=True, exist_ok=True)
    for name, data in original.items():
        if data is not None:
            (backup / name).write_bytes(data)
    before = module_info(site)
    vendor = site / "_vendor"
    vendored = (vendor / "modules.txt").exists() and MODULE in (vendor / "modules.txt").read_text()
    if vendored and refresh_vendor:
        shutil.copytree(vendor, backup / "_vendor")
    try:
        # Resolve in a small Hugo module so `go get` never traverses or updates
        # the unrelated dependencies of a mixed Go application/Hugo site.
        with tempfile.TemporaryDirectory(prefix="oink-release-probe-") as directory:
            probe = Path(directory)
            (probe / "go.mod").write_text(
                f"module example.org/oink-release-probe\n\ngo {before['Go']}\n\nrequire {MODULE} {version}\n")
            (probe / "hugo.yaml").write_text(f"module:\n  imports:\n    - path: {MODULE}\n")
            output = run(probe, hugo, "mod", "get", MODULE + "@" + version)
            verify_graph(probe, hugo, version)
            sums = [line for line in (probe / "go.sum").read_text().splitlines()
                    if line.startswith(MODULE + " ") and line.split()[1] in (version, version + "/go.mod")]
            if {line.split()[1] for line in sums} != {version, version + "/go.mod"}:
                raise RuntimeError("release probe did not resolve both OINK checksums")
        run(site, "go", "mod", "edit", "-require=" + MODULE + "@" + version)
        current_sums = (site / "go.sum").read_text().splitlines() if (site / "go.sum").exists() else []
        retained = [line for line in current_sums if not line.startswith(MODULE + " ")]
        position = next((i for i, line in enumerate(retained)
                         if line.split() and line.split()[0] > MODULE), len(retained))
        (site / "go.sum").write_text("\n".join(retained[:position] + sums + retained[position:]) + "\n")
        after = module_info(site)
        # A theme-only update must not rewrite a mixed Go application's dependencies.
        for info in (before, after):
            info["Require"] = [r for r in info.get("Require") or [] if r["Path"] != MODULE]
        if before != after:
            raise RuntimeError("update changed module settings or dependencies other than OINK")
        if vendored and refresh_vendor:
            output += "\n" + run(site, hugo, "mod", "vendor")
        verify_graph(site, hugo, version, vendored)
        return output
    except Exception:
        for name, data in original.items():
            if data is None:
                (site / name).unlink(missing_ok=True)
            else:
                (site / name).write_bytes(data)
        if vendored and refresh_vendor:
            shutil.rmtree(vendor, ignore_errors=True)
            shutil.copytree(backup / "_vendor", vendor)
        raise


def check(site, hugo, version):
    vendor = site / "_vendor/modules.txt"
    graph = verify_graph(site, hugo, version, vendor.exists() and MODULE in vendor.read_text())
    with tempfile.TemporaryDirectory(prefix="oink-consumer-build-") as directory:
        output = run(site, hugo, "--environment", "production", "--minify",
                     "--panicOnWarning", "--printPathWarnings", "--printI18nWarnings",
                     "--destination", str(Path(directory) / "public"),
                     "--noBuildLock")
    return graph + "\n" + output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("version", help="explicit published tag, e.g. v1.1.0")
    parser.add_argument("--roots", nargs="*", type=Path,
                        default=[Path("~/www"), Path("~/pgsty")],
                        help="scan immediate project directories (default: ~/www ~/pgsty)")
    parser.add_argument("--sites", nargs="*", type=Path, default=[],
                        help="explicitly include reviewed sites, including dirty module files")
    parser.add_argument("--write", action="store_true", help="update pins; otherwise inventory only")
    parser.add_argument("--check", action="store_true", help="verify graph and build every selected site strictly")
    parser.add_argument("--refresh-vendor", action="store_true", help="back up and regenerate reviewed vendored themes")
    parser.add_argument("--hugo", default="hugo")
    parser.add_argument("--report-dir", type=Path, help="directory for JSON, logs, and original module files")
    args = parser.parse_args()
    if not re.fullmatch(r"v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", args.version):
        parser.error("select an explicit release tag, not a branch or @latest")
    items = discover(args.roots, args.sites, args.refresh_vendor, args.version)
    if not items:
        parser.error("no OINK consumers found")
    report = args.report_dir
    if args.write or args.check:
        report = report or Path(tempfile.mkdtemp(prefix="oink-consumers-"))
    if report:
        report = report.expanduser().resolve()
        report.mkdir(parents=True, exist_ok=True)
    for index, item in enumerate(items):
        site = Path(item["site"])
        if item["status"] == "ready":
            try:
                log = ""
                key = f"{index:02d}-{site.name}"
                vendor = site / "_vendor/modules.txt"
                stale_vendor = vendor.exists() and MODULE in vendor.read_text() and f"# {MODULE} {args.version}\n" not in vendor.read_text()
                if item["before"] == args.version and not stale_vendor and has_checksums(site, args.version):
                    item["status"] = "current"
                elif args.write:
                    log = update(site, args.hugo, args.version, report / "before" / key, args.refresh_vendor)
                    item["status"] = "updated"
                else:
                    item["status"] = "pending"
                if args.check and item["status"] != "pending":
                    print(f"BUILD {site}", flush=True)
                    log += "\n" + check(site, args.hugo, args.version)
                    item["build"] = "passed"
                if report:
                    path = report / f"{key}.log"
                    path.write_text(log + "\n")
                    item["log"] = str(path)
            except (RuntimeError, OSError) as error:
                item["reason"] = str(error)
                if item["status"] in ("updated", "current"):
                    item["build"] = "failed"
                else:
                    item["status"] = "failed"
                if report:
                    (report / f"{key}.log").write_text(str(error) + "\n")
        print(f"{item['status'].upper():8} {site}: {item['before'] or '(unpinned)'} -> {args.version}"
              + (f" [{item.get('build')}]" if item.get("build") else "")
              + (f" — {item['reason'].splitlines()[0]}" if item.get("reason") else ""), flush=True)
        if report:
            (report / "report.json").write_text(json.dumps(
                {"version": args.version, "sites": items}, ensure_ascii=False, indent=2) + "\n")
    if report:
        print(f"Report: {report / 'report.json'}")
    return int(any(i["status"] in ("blocked", "failed", "pending") or i.get("build") == "failed"
                   for i in items))


if __name__ == "__main__":
    raise SystemExit(main())
