import { expect, test, type Page } from '@playwright/test';
import type { LabTool } from '../lib/lab-tools';
declare global { interface Window { testTools: Map<string, LabTool> } }
async function setup(page: Page) {
  await page.addInitScript(() => {
    window.testTools = new Map();
    Object.defineProperty(document, 'modelContext', { configurable: true, value: { registerTool: async (tool: LabTool, options: { signal: AbortSignal }) => {
      window.testTools.set(tool.name, tool);
      options.signal.addEventListener('abort', () => { if (window.testTools.get(tool.name) === tool) window.testTools.delete(tool.name); });
    } } });
  });
  await page.goto('/'); await expect(page.getByText('10 WebMCP tools ready')).toBeVisible();
}
async function call(page: Page, name: string, input: Record<string, unknown> = {}) {
  return page.evaluate(async ({ name, input }) => {
    try { return { result: await window.testTools.get(name)!.execute(input) }; }
    catch (error) { return { error: String(error) }; }
  }, { name, input });
}
async function human(page: Page, repaired = false) {
  await page.getByRole('button', { name: 'Start human run' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  if (!repaired) await page.getByRole('button', { name: 'More attendee needs' }).click();
  await page.getByRole('checkbox', { name: /Quiet-zone/ }).check();
  await page.getByRole('button', { name: 'Review registration', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('$94', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm registration', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function agent(page: Page, repaired = false) {
  expect(await call(page, 'start_agent_run')).not.toHaveProperty('error');
  expect(await call(page, 'configure_registration', { ticket: 'general_admission', seat: 'quiet_zone' })).not.toHaveProperty('error');
  if (repaired) {
    expect(await call(page, 'complete_simulated_task', {})).toHaveProperty('error');
    const review = await call(page, 'review_registration') as { result: { reviewToken: string } };
    expect(await call(page, 'complete_simulated_task', { reviewToken: review.result.reviewToken, confirmed: true })).not.toHaveProperty('error');
  } else expect(await call(page, 'complete_simulated_task')).not.toHaveProperty('error');
}
async function approve(page: Page) {
  await page.getByRole('button', { name: 'Review proposed patch' }).click();
  const confirm = page.getByRole('button', { name: 'Approve & apply patch' });
  await expect(confirm).toBeDisabled();
  await page.getByRole('checkbox', { name: /I reviewed/ }).check();
  await confirm.click(); await expect(page.getByText('Approved patch active.')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.testTools.get('complete_simulated_task')?.inputSchema)).toHaveProperty('required', ['reviewToken', 'confirmed']);
}
test('record real baseline, export evidence, approve and record repaired pair', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await setup(page); await expect(page.getByText('No human trace yet')).toBeVisible();
  await human(page); await agent(page);
  const baseline = await call(page, 'compare_human_agent_runs') as { result: { criticalFailures: number } };
  expect(baseline.result.criticalFailures).toBe(2);
  const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export report' }).click();
  const download = await downloadPromise; const stream = await download.createReadStream(); let text = ''; for await (const chunk of stream!) text += chunk;
  const exported = JSON.parse(text); expect(exported.state.humanRun.steps[0].label).toBe('Selected ticket'); expect(exported.state.humanRun.source).toBe('interactive'); expect(exported.state).not.toHaveProperty('reviewToken');
  await approve(page); await human(page, true); await agent(page, true);
  const repaired = await call(page, 'compare_human_agent_runs') as { result: { criticalFailures: number } }; expect(repaired.result.criticalFailures).toBe(0);
  await page.reload(); await expect(page.getByText('Approved patch active.')).toBeVisible(); await expect(page.getByText('Core checks passed', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('proposals and findings are visible, validated and persisted', async ({ page }) => {
  await setup(page);
  expect(await call(page, 'propose_interface_patch', { change: 'Show the itemized price beside the seat choice.' })).not.toHaveProperty('error');
  expect(await call(page, 'submit_parity_finding', { severity: 'critical', dimension: 'Information', title: 'Review the fee disclosure', evidence: 'The completion response shows a subtotal only.', proposal: 'Include the fee in the completion response.' })).not.toHaveProperty('error');
  expect(await call(page, 'propose_interface_patch', { change: 99 })).toHaveProperty('error');
  await page.getByRole('button', { name: /Findings ·/ }).click();
  await expect(page.getByText('Show the itemized price beside the seat choice.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review the fee disclosure' })).toBeVisible();
  await page.reload(); await expect(page.getByText('10 WebMCP tools ready')).toBeVisible(); await page.getByRole('button', { name: /Findings ·/ }).click(); await expect(page.getByText('Show the itemized price beside the seat choice.')).toBeVisible();
});
test('examples are labeled and cannot mix with recorded runs', async ({ page }) => {
  await setup(page); await page.getByRole('button', { name: 'Load example pair' }).click();
  await expect(page.getByText(/Example data is present/)).toBeVisible();
  await human(page); await expect(page.getByText(/Example and interactive traces cannot be compared/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Reset lab', exact: true }).click(); await expect(page.getByText('No agent trace yet')).toBeVisible();
});
test('keyboard escape cancels a visual run and restores focus', async ({ page }) => {
  await setup(page); const start = page.getByRole('button', { name: 'Start human run' }); await start.click();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(start).toBeFocused();
  const trace = await call(page, 'get_human_interaction_trace') as { result: { status: string } }; expect(trace.result.status).toBe('cancelled');
});
test('blocked browser storage leaves human and tool workflows usable', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('Storage blocked'); } }); });
  await setup(page); await human(page); await agent(page); await expect(page.getByRole('alert')).toContainText('This session still works');
});
test('malformed stored data recovers to a usable fresh lab', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('friction-lab-v2', '{"format":2,"humanRun":null}'));
  await setup(page); await expect(page.getByRole('alert')).toContainText('fresh lab'); await human(page);
});
test('ordinary browser fallback and narrow mobile screens remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 }); await page.goto('/');
  await expect(page.getByText('WebMCP unavailable here')).toBeVisible(); await human(page);
  await page.screenshot({ path: '../../outputs/friction-mobile-lab.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Tools', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Live WebMCP contract' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '../../outputs/friction-mobile.png', fullPage: true, animations: 'disabled' });
});
test('desktop layout shows paired recorded evidence', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 }); await setup(page); await human(page); await agent(page);
  await page.screenshot({ path: '../../outputs/friction-desktop.png', fullPage: true, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('controls wait for hydration and saved-state restoration', async ({ page }) => {
  await page.route('**/*', async route => {
    if (route.request().resourceType() === 'script') await new Promise(resolve => setTimeout(resolve, 800));
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.getByRole('button', { name: 'Start human run' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Start human run' })).toBeEnabled({ timeout: 15000 });
  await human(page);
});
