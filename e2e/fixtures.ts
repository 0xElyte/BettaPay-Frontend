import { test as base, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

/**
 * Shared test fixture.
 *
 * On top of the stock Playwright `test`, this optionally collects V8 JavaScript
 * coverage so CI can emit a coverage report. Collection is:
 *   - opt-in via the `E2E_COVERAGE` env var (off by default → zero overhead,
 *     no impact on local runs or flakiness), and
 *   - Chromium-only, because `page.coverage` is a CDP feature not available on
 *     Firefox/WebKit.
 *
 * Raw per-test coverage is written to `coverage/tmp/*.json`; the CI workflow
 * converts that directory into an lcov/html report.
 */

const COLLECT_COVERAGE = Boolean(process.env.E2E_COVERAGE);
const COVERAGE_DIR = path.join(process.cwd(), 'coverage', 'tmp');

export const test = base.extend({
  page: async ({ page, browserName }, use, testInfo) => {
    const collect = COLLECT_COVERAGE && browserName === 'chromium';

    if (collect) {
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
    }

    await use(page);

    if (collect) {
      const entries = await page.coverage.stopJSCoverage();
      mkdirSync(COVERAGE_DIR, { recursive: true });
      const slug = testInfo.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 60);
      const file = `cov_${slug}_w${testInfo.workerIndex}_r${testInfo.retry}.json`;
      writeFileSync(path.join(COVERAGE_DIR, file), JSON.stringify(entries));
    }
  },
});

export { expect };
