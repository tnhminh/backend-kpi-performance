import assert from 'node:assert/strict';
import { chromium } from '../backend/node_modules/playwright-core/index.mjs';

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
});

try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const browserErrors = [];
  const requestFailures = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('requestfailed', request => requestFailures.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText}`));

  await page.goto('http://localhost:5175/?v=20260806', { waitUntil: 'networkidle' });
  await page.locator('#loginForm').waitFor();
  assert.match(await page.locator('.auth-api-hint').textContent(), /127\.0\.0\.1:8788/);

  await page.locator('input[name="email"]').fill('admin@localhost');
  await page.locator('input[name="password"]').fill('ChangeMe2026!');
  await page.locator('#loginForm button[type="submit"]').click();
  try { await page.locator('#authOverlay').waitFor({ state: 'detached', timeout: 5000 }); }
  catch {
    const uiError = await page.locator('.auth-error').textContent();
    throw new Error(`Login overlay remained open. UI: ${uiError}; requests: ${requestFailures.join(' | ')}; console: ${browserErrors.join(' | ')}`);
  }
  await page.locator('#logoutButton').waitFor();

  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#logoutButton').waitFor();
  assert.equal(await page.locator('#authOverlay').count(), 0);

  await page.locator('.module-btn[data-module="demo"]').click();
  await page.locator('#runJiraSim').click();
  await page.locator('#jiraSimRoot').getByText(/156 issue/).waitFor();
  assert.match(await page.locator('.mock-quality-summary').textContent(), /thiếu Story Point/);
  await page.locator('#syncJiraSim').click();
  await page.locator('.module-btn[data-module="jiraTasks"]').click();
  await page.locator('.jira-task-row').first().waitFor();
  await page.locator('.module-btn[data-module="reconciliation"]').click();
  await page.locator('#reconciliationRoot .reconciliation-toolbar').waitFor();
  await page.locator('.reconciliation-export-actions button').first().waitFor();
  assert.equal(await page.locator('.reconciliation-export-actions button').count(), 3);
  await page.locator('.reconciliation-row').first().click();
  await page.locator('.reconciliation-detail-head').waitFor();
  await page.locator('.module-btn[data-module="managerDashboard"]').click();
  await page.locator('#managerDashboardRoot').waitFor();
  await page.locator('.manager-kpi-cards').waitFor();
  assert.equal(await page.locator('.manager-chart-panel').count(), 4);
  await page.locator('.module-btn[data-module="settings"]').click();
  await page.locator('.user-admin-panel').waitFor();
  await page.locator('.user-admin-row').first().waitFor();

  await page.locator('#logoutButton').click();
  await page.locator('#loginForm').waitFor();
  assert.equal(requestFailures.length, 0, requestFailures.join('\n'));
  assert.equal(browserErrors.length, 0, browserErrors.join('\n'));
  console.log('Browser auth flow passed: login, reload session, logout.');
} finally {
  await browser.close();
}
