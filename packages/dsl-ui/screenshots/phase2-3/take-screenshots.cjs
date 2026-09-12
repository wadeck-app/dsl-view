const { chromium } = require('C:/App/nodejs/node_modules/agent-browser/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  // Screenshot 1: RelativeDate
  await page.goto('http://localhost:6006/iframe.html?id=display-relativedate--two-hours-ago', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'C:/Workspace_Tooling/dsl-view/packages/dsl-ui/screenshots/phase2-3/relativedate-fixed.png' });
  console.log('relativedate done');

  // Screenshot 2: FilterBar
  await page.goto('http://localhost:6006/iframe.html?id=table-filterbar--default', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'C:/Workspace_Tooling/dsl-view/packages/dsl-ui/screenshots/phase2-3/filterbar-fixed.png' });
  console.log('filterbar done');

  // Screenshot 3: StatTile
  await page.goto('http://localhost:6006/iframe.html?id=layout-stattile--dashboard-row', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'C:/Workspace_Tooling/dsl-view/packages/dsl-ui/screenshots/phase2-3/stattile-fixed.png' });
  console.log('stattile done');

  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
