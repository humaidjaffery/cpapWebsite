#!/usr/bin/env python3
"""Regression tests for the daily retailer-price GitHub Actions workflow."""

from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
REFRESH = (ROOT / ".github/workflows/refresh-prices.yml").read_text(encoding="utf-8")
DEPLOY = (ROOT / ".github/workflows/static.yml").read_text(encoding="utf-8")


class RefreshWorkflowTests(unittest.TestCase):
    def test_refresh_runs_the_complete_curated_pipeline(self):
        self.assertEqual(REFRESH.count("uses: actions/checkout@v6"), 2)
        self.assertIn("uses: actions/setup-python@v6", REFRESH)
        for expected in (
            "pipelines/prices/run_all.py",
            "--skip-review-seeds",
            "--skip-discovery",
            "pipelines/prices/publish.py",
            "pipelines/prices/seeds/products.json",
            "pipelines/prices/validate.py",
            "--minimum-configurations 2000",
            "--minimum-success-ratio 1.0",
        ):
            self.assertIn(expected, REFRESH)

    def test_history_restore_only_ignores_a_missing_release(self):
        restore = REFRESH[REFRESH.index("- name: Restore price history") :]
        restore = restore[: restore.index("- name: Record scrape start")]
        self.assertIn('gh api --include "repos/${GITHUB_REPOSITORY}/releases/tags/${PRICE_STATE_TAG}"', restore)
        self.assertIn('grep -qE \'^HTTP/[0-9.]+ 404\'', restore)
        self.assertIn('gh release download "$PRICE_STATE_TAG"', restore)
        self.assertIn('echo "exists=false" >> "$GITHUB_OUTPUT"', restore)
        self.assertNotIn("|| true", restore)

        save = REFRESH[REFRESH.index("- name: Save price history") :]
        save = save[: save.index("- name: Commit updated prices")]
        self.assertIn('steps.history-state.outputs.exists', save)
        self.assertNotIn('gh release view "$PRICE_STATE_TAG"', save)

    def test_validation_precedes_state_save_and_commit(self):
        self.assertLess(REFRESH.index("- name: Validate prices"), REFRESH.index("- name: Save price history"))
        self.assertLess(REFRESH.index("- name: Validate prices"), REFRESH.index("- name: Commit updated prices"))

    def test_successful_refresh_triggers_pages_deployment(self):
        self.assertIn('workflows: ["Refresh daily prices"]', DEPLOY)
        self.assertIn("github.event.workflow_run.conclusion == 'success'", DEPLOY)


if __name__ == "__main__":
    unittest.main()
