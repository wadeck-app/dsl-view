/**
 * Screenshot script for Phase 2 and Phase 3 Storybook components
 * Uses playwright-core from agent-browser's node_modules
 */
import pkg from 'file:///C:/App/nodejs/node_modules/agent-browser/node_modules/playwright-core/index.js';
const { chromium } = pkg;
import fs from 'fs';
import path from 'path';

const STORYBOOK_BASE = 'http://localhost:6006/iframe.html?id=';
const OUTPUT_DIR = 'C:/Workspace_Tooling/dsl-view/packages/dsl-ui/screenshots/phase2-3';
const VIEWPORT = { width: 1280, height: 800 };

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const stories = [
  // Phase 2 -- Form
  { id: 'form-fieldasyncselect--default', file: 'fieldasyncselect-default.png' },
  { id: 'form-fieldmultiselect--default', file: 'fieldmultiselect-default.png' },
  { id: 'form-fieldmultiselect--with-initial-selections', file: 'fieldmultiselect-selected.png' },
  { id: 'form-fieldtags--default', file: 'fieldtags-default.png' },

  // Phase 2 -- Overlay
  { id: 'overlay-popover--default-bottom', file: 'popover-default.png' },
  { id: 'overlay-contextmenu--basic-menu', file: 'contextmenu-default.png' },
  {
    id: 'overlay-contextmenu--basic-menu',
    file: 'contextmenu-open.png',
    action: async (page) => {
      // Click the kebab trigger button (aria-label="Open menu")
      const trigger = page.getByRole('button', { name: 'Open menu' });
      await trigger.click({ timeout: 5000 });
      await page.waitForTimeout(500);
    },
  },
  {
    id: 'overlay-contextmenu--with-icons',
    file: 'contextmenu-icons.png',
    action: async (page) => {
      const trigger = page.getByRole('button', { name: 'Open menu' });
      await trigger.click({ timeout: 5000 });
      await page.waitForTimeout(500);
    },
  },

  // Phase 3 -- Navigation
  { id: 'navigation-treeview--default', file: 'treeview-default.png' },
  { id: 'navigation-treeview--with-icons', file: 'treeview-icons.png' },

  // Phase 3 -- Display
  { id: 'display-inlineedit--default', file: 'inlineedit-default.png' },
  { id: 'display-relativedate--two-hours-ago', file: 'relativedate.png' },

  // Phase 3 -- Layout
  { id: 'layout-card--default', file: 'card-default.png' },
  { id: 'layout-card--with-header-and-footer', file: 'card-with-header-footer.png' },
  { id: 'layout-stattile--dashboard-row', file: 'stattile-dashboard.png' },

  // Phase 3 -- Table
  { id: 'table-filterbar--default', file: 'filterbar-default.png' },
  { id: 'table-filterbar--with-active-filters', file: 'filterbar-active.png' },
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
      await page.waitForTimeout(800); // Let React render fully

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
