import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location(
    "update_consumers", Path(__file__).resolve().parents[1] / "bin/update-consumers.py")
updater = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(updater)


class ConsumerUpdates(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def site(self, name="site"):
        site = self.root / name
        site.mkdir(parents=True)
        (site / "go.mod").write_text(
            "module example.org/site\n\ngo 1.27.0\n\nrequire github.com/pgsty/oink v1.0.0\n")
        (site / "go.sum").write_text("original checksums\n")
        subprocess.run(["git", "init", "-q", "-b", "main", str(site)], check=True)
        subprocess.run(["git", "-C", str(site), "add", "."], check=True)
        subprocess.run(["git", "-C", str(site), "-c", "user.name=Test",
                        "-c", "user.email=test@example.org", "commit", "-qm", "fixture"], check=True)
        return site

    def test_discovery_excludes_nested_archives_and_hidden_copies(self):
        site = self.site()
        self.site("site/archive/old")
        self.site(".hidden/site")
        self.assertEqual([str(site.resolve())], [x["site"] for x in updater.discover([self.root], [])])

    def test_inventory_reports_broken_root_and_module_and_continues(self):
        good = self.site("good")
        broken = self.site("broken")
        (broken / "go.mod").write_text("module example.org/broken\nrequire github.com/pgsty/oink BADVERSION\n")
        missing = self.root / "missing"
        report = self.root / "report"
        result = subprocess.run(
            [sys.executable, str(Path(updater.__file__)), "v1.1.0", "--roots", str(self.root),
             str(missing), "--report-dir", str(report)], text=True, capture_output=True,
        )
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertNotIn("Traceback", result.stderr)
        items = {item["site"]: item for item in json.loads((report / "report.json").read_text())["sites"]}
        self.assertEqual(items[str(good.resolve())]["status"], "pending")
        self.assertEqual(items[str(broken.resolve())]["status"], "failed")
        self.assertEqual(items[str(missing.resolve())]["status"], "failed")

    def test_explicit_missing_site_is_reported(self):
        missing = self.root / "missing"
        items = updater.discover([], [missing])
        self.assertEqual(items[0]["status"], "failed")
        self.assertIn("explicit site", items[0]["reason"])

    def test_dirty_content_is_preserved_but_dirty_pins_need_explicit_selection(self):
        site = self.site()
        (site / "article.md").write_text("work in progress\n")
        self.assertEqual("ready", updater.inspect(site)["status"])
        (site / "go.sum").write_text("local change\n")
        self.assertEqual("blocked", updater.inspect(site)["status"])
        self.assertEqual("ready", updater.inspect(site, explicit=True)["status"])

    def test_old_branch_and_linked_worktree_are_skipped(self):
        site = self.site()
        linked = self.root / "editorial"
        subprocess.run(["git", "-C", str(site), "worktree", "add", "-qb", "editorial", str(linked)], check=True)
        self.assertEqual("skipped", updater.inspect(linked)["status"])
        subprocess.run(["git", "-C", str(site), "checkout", "-qb", "migration"], check=True)
        self.assertEqual("skipped", updater.inspect(site)["status"])

    def test_replacement_is_never_silently_overridden(self):
        site = self.site()
        with (site / "go.mod").open("a") as stream:
            stream.write("\nreplace github.com/pgsty/oink => ../oink\n")
        self.assertEqual("blocked", updater.inspect(site, explicit=True)["status"])

    def test_completed_uncommitted_upgrade_can_be_checked_again(self):
        site = self.site()
        (site / "go.mod").write_text((site / "go.mod").read_text().replace("v1.0.0", "v1.1.0"))
        (site / "go.sum").write_text(
            "github.com/pgsty/oink v1.1.0 h1:fixture\n"
            "github.com/pgsty/oink v1.1.0/go.mod h1:fixture\n")
        self.assertEqual("ready", updater.inspect(site, version="v1.1.0")["status"])
        self.assertEqual("blocked", updater.inspect(site, version="v1.2.0")["status"])

    def test_failed_update_restores_only_owned_files(self):
        site = self.site()
        before = {n: (site / n).read_bytes() for n in ("go.mod", "go.sum")}
        real_run = updater.run

        def failing_run(path, *args):
            if args[0] == "hugo":
                (site / "go.mod").write_text("partial update\n")
                (site / "go.sum").write_text("partial checksums\n")
                (site / "article.md").write_text("independent edit\n")
                raise RuntimeError("download failed")
            return real_run(path, *args)

        with patch.object(updater, "run", failing_run), self.assertRaises(RuntimeError):
            updater.update(site, "hugo", "v1.1.0", self.root / "backup")
        for name, data in before.items():
            self.assertEqual(data, (site / name).read_bytes())
        self.assertEqual("independent edit\n", (site / "article.md").read_text())

    def test_graph_rejects_stale_vendor_and_replacement(self):
        for graph in ("site github.com/pgsty/oink@v1.0.0",
                      "site github.com/pgsty/oink@v1.1.0 => ../oink",
                      "site github.com/pgsty/oink@v1.0.0+vendor"):
            with patch.object(updater, "run", return_value=graph), self.assertRaises(RuntimeError):
                updater.verify_graph(self.root, "hugo", "v1.1.0")

    def test_release_env_disables_both_workspace_mechanisms(self):
        with patch.dict(os.environ, {"GOWORK": "/tmp/go.work", "HUGO_MODULE_WORKSPACE": "/tmp/go.work",
                                     "HUGO_MODULE_REPLACEMENTS": "github.com/pgsty/oink -> ../oink"}):
            env = updater.release_env()
        self.assertEqual("off", env["GOWORK"])
        self.assertEqual("off", env["HUGO_MODULE_WORKSPACE"])
        self.assertNotIn("HUGO_MODULE_REPLACEMENTS", env)


if __name__ == "__main__":
    unittest.main()
