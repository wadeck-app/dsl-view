/**
 * Retry script for context menu open-state screenshots
 */
import pkg from 'file:///C:/App/nodejs/node_modules/agent-browser/node_modules/playwright-core/index.js';
const { chromium } = pkg;

const STORYBOOK_BASE = 'http://localhost:6006/iframe.html?id=';
const OUTPUT_DIR = 'C:/Workspace_Tooling/dsl-view/packages/dsl-ui/screenshots/phase2-3';
const VIEWPORT = { width: 1280, height: 800 };

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();

  // contextmenu-open.png: basic-menu with menu opened
  {
    const url = STORYBOOK_BASE + 'overlay-contextmenu--basic-menu';
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(800);

    // Snapshot to see available elements
    const html = await page.content();
    const btnCount = await page.locator('button').count();
    console.log(`Buttons found on basic-menu page: ${btnCount}`);

    // List all buttons
    for (let i = 0; i < btnCount; i++) {
      const btn = page.locator('button').nth(i);
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      const visible = await btn.isVisible();
      console.log(`  button[${i}]: text="${text?.trim()}" aria-label="${ariaLabel}" visible=${visible}`);
    }

    // Try clicking the "Open menu" button
    const trigger = page.getByRole('button', { name: 'Open menu' });
    const isVisible = await trigger.isVisible();
    console.log(`"Open menu" button visible: ${isVisible}`);

    if (isVisible) {
      await trigger.click({ timeout: 5000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUTPUT_DIR}/contextmenu-open.png` });
      console.log('✓ contextmenu-open.png');
    } else {
      // Try force click if not visible
      try {
        await trigger.click({ force: true, timeout: 5000 });
        await page.waitForTimeout(500);
        await page.screenshot({ path: `${OUTPUT_DIR}/contextmenu-open.png` });
        console.log('✓ contextmenu-open.png (force click)');
      } catch (e) {
        console.log(`✗ contextmenu-open.png: ${e.message.split('\n')[0]}`);
      }
    }
  }

  // contextmenu-icons.png: with-icons story, menu opened
  {
    const url = STORYBOOK_BASE + 'overlay-contextmenu--with-icons';
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(800);

    const trigger = page.getByRole('button', { name: 'Open menu' });
    const isVisible = await trigger.isVisible();
    console.log(`"Open menu" button visible (with-icons): ${isVisible}`);

    if (isVisible) {
      await trigger.click({ timeout: 5000 });
    } else {
      await trigger.click({ force: true, timeout: 5000 });
    }
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUTPUT_DIR}/contextmenu-icons.png` });
    console.log('✓ contextmenu-icons.png');
  }

  await browser.close();
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
