/**
 * Phase 6 visual screenshot review — UI Component Context Variants
 * Verifies: icon sizes, link vs ghost variant, TabButton active state,
 *           ActionBar/NavBar/DialogFooter/DeleteButton/TableRowActions context sizing.
 */
import pkg from 'file:///C:/App/nodejs/node_modules/agent-browser/node_modules/playwright-core/index.js';
const { chromium } = pkg;
import fs from 'fs';
import path from 'path';

const STORYBOOK_BASE = 'http://localhost:6006/iframe.html?id=';
const OUTPUT_DIR = 'C:/Workspace_Tooling/dsl-view/packages/dsl-ui/screenshots/phase6';
const VIEWPORT = { width: 1280, height: 800 };

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const stories = [
  // 1. Icon sizes -- square check
  { id: 'controls-button--icon-sizes', file: '1-button-icon-sizes.png' },
  // 2. link vs ghost variant distinction
  { id: 'controls-button--link-variant', file: '2-button-link-variant.png' },
  // 3. TabButton active state underline
  { id: 'controls-tabbutton--states', file: '3-tabbutton-states.png' },
  // 4. ActionBar children at sm size
  { id: 'layout-actionbar--default', file: '4-actionbar-default.png' },
  // 5. NavBar children ghost at sm size
  { id: 'layout-navbar--default', file: '5-navbar-default.png' },
  // 6. DialogFooter children at md size
  { id: 'layout-dialogfooter--default', file: '6-dialogfooter-default.png' },
  // 7. DeleteButton always danger+sm
  { id: 'controls-deletebutton--default', file: '7-deletebutton-default.png' },
  // 8. TableRowActions compact sm buttons
  { id: 'layout-tablerowactions--default', file: '8-tablerowactions-default.png' },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  const results = [];

  for (const story of stories) {
    const url = STORYBOOK_BASE + story.id;
    const outFile = path.join(OUTPUT_DIR, story.file);

    process.stdout.write(`Capturing ${story.file}...`);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(800);

      if (story.action) {
        await story.action(page);
      }

      await page.screenshot({ path: outFile, fullPage: false });
      console.log(' OK');
      results.push({ file: story.file, status: 'ok' });
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
      results.push({ file: story.file, status: 'error', error: err.message });
    }
  }

  await browser.close();

  console.log('\n--- Results ---');
  for (const r of results) {
    const icon = r.status === 'ok' ? '✓' : '✗';
    console.log(`${icon} ${r.file}${r.error ? ': ' + r.error : ''}`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
