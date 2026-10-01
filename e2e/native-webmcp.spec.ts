import { test, expect, type Page } from '@playwright/test';
import { createLabTools } from '../lib/lab-tools';
import { initialState, approvePatch, type LabState } from '../lib/lab-model';
type NativeTool = {
  name: string;
  title: string;
  origin: string;
  inputSchema: string | Record<string, unknown>;
  annotations?: Record<string, boolean>;
};
type NativeContext = {
  getTools(): Promise<NativeTool[]>;
  executeTool(
    tool: NativeTool,
    input: string | Record<string, unknown>,
  ): Promise<unknown>;
};
const contracts = (state = initialState) =>
  createLabTools(
    () => state,
    () => {},
  );
const names = contracts()
  .map((tool) => tool.name)
  .sort();
const errors = new WeakMap<Page, string[]>();
async function call(
  page: Page,
  name: string,
  input: Record<string, unknown> = {},
) {
  return page.evaluate(
    async ({ name, input }) => {
      const native = document.modelContext as unknown as NativeContext;
      const tool = (await native.getTools()).find((tool) => tool.name === name);
      if (!tool) throw new Error(`Native discovery did not return ${name}`);
      try {
        const major = Number(navigator.userAgent.match(/Chrome\/(\d+)/)?.[1]);
        const result = await native.executeTool(
          tool,
          major < 155 ? JSON.stringify(input) : input,
        );
        return typeof result === 'string' ? JSON.parse(result) : result;
      } catch (error) {
        return { nativeError: (error as Error).message };
      }
    },
    { name, input },
  );
}
async function toolNames(page: Page) {
  return page.evaluate(async () =>
    (await (document.modelContext as unknown as NativeContext).getTools())
      .map((tool) => tool.name)
      .sort(),
  );
}
async function ready(page: Page) {
  await expect.poll(() => toolNames(page)).toEqual(names);
  await expect(
    page.getByText('10 WebMCP tools ready', { exact: true }),
  ).toBeVisible();
}
async function human(page: Page, repaired = false) {
  await page.getByRole('button', { name: 'Start human run' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  if (!repaired)
    await page.getByRole('button', { name: 'More attendee needs' }).click();
  await page.getByRole('checkbox', { name: /Quiet-zone/ }).check();
  await page
    .getByRole('button', { name: 'Review registration', exact: true })
    .click();
  await expect(
    page.getByRole('dialog').getByText('$94', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Confirm registration', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function approve(page: Page) {
  await page.getByRole('button', { name: 'Review proposed patch' }).click();
  const button = page.getByRole('button', { name: 'Approve & apply patch' });
  await expect(button).toBeDisabled();
  await page.getByRole('checkbox', { name: /I reviewed/ }).check();
  await button.click();
  await expect(
    page.getByText('Approved patch active.', { exact: true }),
  ).toBeVisible();
  await ready(page);
}
async function schemaCheck(page: Page, state: LabState) {
  const actual = await page.evaluate(async () =>
    (document.modelContext as unknown as NativeContext).getTools(),
  );
  expect(actual).toHaveLength(10);
  for (const tool of contracts(state)) {
    const registered = actual.find((item) => item.name === tool.name)!;
    expect(registered.title).toBe(tool.title);
    expect(
      typeof registered.inputSchema === 'string'
        ? JSON.parse(registered.inputSchema)
        : registered.inputSchema,
    ).toEqual(tool.inputSchema);
    expect(registered.annotations).toMatchObject(tool.annotations);
    expect(registered.origin).toBe(new URL(page.url()).origin);
  }
}
test.beforeEach(async ({ page, browser }, info) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on('pageerror', (error) => messages.push(error.message));
  await info.attach('browser-version', {
    body: browser.version(),
    contentType: 'text/plain',
  });
  await page.goto('/');
  await ready(page);
  expect(
    await page.evaluate(() => document.modelContext?.registerTool.toString()),
  ).toContain('[native code]');
});
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]));
test('native discovery exposes ten titled contracts and updates the completion schema after approval', async ({
  page,
}) => {
  await schemaCheck(page, initialState);
  expect(await call(page, 'get_test_scenario')).toMatchObject({
    version: 'baseline',
    prices: { subtotal: 82 },
  });
  expect(await call(page, 'inspect_task_state')).toMatchObject({
    humanRun: { status: 'idle' },
    agentRun: { status: 'idle' },
  });
  expect(await call(page, 'get_human_interaction_trace')).toMatchObject({
    actor: 'human',
    status: 'idle',
  });
  expect((await call(page, 'compare_human_agent_runs')).metrics).toEqual([]);
  await approve(page);
  await schemaCheck(page, approvePatch(initialState, 'test'));
  expect(await call(page, 'get_test_scenario')).toMatchObject({
    version: 'repaired',
    prices: { total: 94 },
  });
  expect(
    (await call(page, 'complete_simulated_task')).nativeError,
  ).toBeTruthy();
});
test('all ten native tools record baseline and repaired pairs, export evidence and persist notes', async ({
  page,
}) => {
  await human(page);
  expect((await call(page, 'start_agent_run')).started).toBe(true);
  expect(
    await call(page, 'configure_registration', {
      ticket: 'general_admission',
      seat: 'quiet_zone',
    }),
  ).toMatchObject({ subtotal: 82 });
  expect(await call(page, 'complete_simulated_task')).toMatchObject({
    completed: true,
    subtotal: 82,
  });
  expect((await call(page, 'get_human_interaction_trace')).source).toBe(
    'interactive',
  );
  expect((await call(page, 'compare_human_agent_runs')).criticalFailures).toBe(
    2,
  );
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report' }).click();
  const stream = await (await downloadPromise).createReadStream();
  let text = '';
  for await (const chunk of stream!) text += chunk;
  const exported = JSON.parse(text);
  expect(exported.state).not.toHaveProperty('reviewToken');
  expect(exported.state.humanRun.source).toBe('interactive');
  expect(exported.report.criticalFailures).toBe(2);
  await approve(page);
  await human(page, true);
  await call(page, 'start_agent_run');
  await call(page, 'configure_registration', {
    ticket: 'general_admission',
    seat: 'quiet_zone',
  });
  const review = await call(page, 'review_registration');
  expect(review.registration).toMatchObject({
    total: 94,
    confirmed: false,
    serviceFee: 12,
  });
  expect(
    await call(page, 'complete_simulated_task', {
      reviewToken: review.reviewToken,
      confirmed: true,
    }),
  ).toMatchObject({
    completed: true,
    registration: { total: 94, confirmed: true },
  });
  expect((await call(page, 'compare_human_agent_runs')).criticalFailures).toBe(
    0,
  );
  await call(page, 'submit_parity_finding', {
    severity: 'moderate',
    dimension: 'Human effort',
    title: 'Practice trace review',
    evidence: 'The practice report records actual UI and tool events.',
    proposal: 'Inspect both traces before drawing usability conclusions.',
  });
  await call(page, 'propose_interface_patch', {
    change:
      'Practice proposal: keep the itemized total visible before confirmation.',
  });
  await page.getByRole('button', { name: /Findings ·/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Practice trace review', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      'Practice proposal: keep the itemized total visible before confirmation.',
      { exact: true },
    ),
  ).toBeVisible();
  expect((await call(page, 'get_test_scenario')).version).toBe('repaired');
  expect((await call(page, 'inspect_task_state')).agentRun.status).toBe(
    'complete',
  );
  await page.reload();
  await ready(page);
  await expect(
    page.getByText('Core checks passed', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Findings ·/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Practice trace review', exact: true }),
  ).toBeVisible();
});
test('native confirmation consumes the current review token and refused calls cannot complete a run', async ({
  page,
}) => {
  await approve(page);
  await call(page, 'start_agent_run');
  const configure = { ticket: 'general_admission', seat: 'quiet_zone' };
  await call(page, 'configure_registration', configure);
  const first = await call(page, 'review_registration');
  expect(
    (
      await call(page, 'complete_simulated_task', {
        reviewToken: first.reviewToken,
        confirmed: false,
      })
    ).nativeError,
  ).toBeTruthy();
  const invalidConfirmation = await call(page, 'inspect_task_state');
  expect(invalidConfirmation.agentRun.status).toBe('running');
  expect(invalidConfirmation.agentRun.outcome).toBeUndefined();
  const second = await call(page, 'review_registration');
  expect(second.reviewToken).not.toBe(first.reviewToken);
  expect(
    (
      await call(page, 'complete_simulated_task', {
        reviewToken: first.reviewToken,
        confirmed: true,
      })
    ).nativeError,
  ).toBeTruthy();
  await call(page, 'configure_registration', configure);
  expect(
    (
      await call(page, 'complete_simulated_task', {
        reviewToken: second.reviewToken,
        confirmed: true,
      })
    ).nativeError,
  ).toBeTruthy();
  const pending = await call(page, 'inspect_task_state');
  expect(pending.agentRun.status).toBe('running');
  expect(pending.agentRun.outcome).toBeUndefined();
  expect(pending.agentRun.errors).toBe(invalidConfirmation.agentRun.errors + 2);
  const current = await call(page, 'review_registration');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export report' }).click();
  const stream = await (await downloadPromise).createReadStream();
  let text = '';
  for await (const chunk of stream!) text += chunk;
  expect(text).not.toContain(current.reviewToken);
  await page.reload();
  await ready(page);
  expect((await call(page, 'inspect_task_state')).agentRun.status).toBe(
    'running',
  );
  expect(
    (
      await call(page, 'complete_simulated_task', {
        reviewToken: current.reviewToken,
        confirmed: true,
      })
    ).completed,
  ).toBe(true);
  const completed = await call(page, 'inspect_task_state');
  expect(
    (
      await call(page, 'complete_simulated_task', {
        reviewToken: current.reviewToken,
        confirmed: true,
      })
    ).nativeError,
  ).toBeTruthy();
  expect(await call(page, 'inspect_task_state')).toEqual(completed);
  for (const [name, input] of [
    ['get_test_scenario', { unknown: true }],
    [
      'configure_registration',
      { ticket: 'general_admission', seat: 'wrong_seat' },
    ],
    ['propose_interface_patch', { change: 99 }],
    ['propose_interface_patch', { change: ' '.repeat(20) }],
    [
      'submit_parity_finding',
      {
        severity: 'invalid',
        dimension: 'Information',
        title: 'Valid title',
        evidence: 'Valid evidence text',
        proposal: 'Valid proposal text',
      },
    ],
  ] as [string, Record<string, unknown>][])
    expect((await call(page, name, input)).nativeError).toBeTruthy();
});
test('native tools work with blocked storage and malformed snapshots recover visibly', async ({
  page,
  context,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get: () => {
        throw new Error('Storage blocked');
      },
    }),
  );
  await page.reload();
  await ready(page);
  await human(page);
  await call(page, 'start_agent_run');
  await call(page, 'configure_registration', {
    ticket: 'general_admission',
    seat: 'quiet_zone',
  });
  expect((await call(page, 'complete_simulated_task')).completed).toBe(true);
  await expect(page.getByRole('alert')).toContainText(
    'This session still works',
  );
  const other = await context.newPage();
  await other.addInitScript(() =>
    localStorage.setItem('friction-lab-v2', '{"format":2,"humanRun":null}'),
  );
  await other.goto(page.url());
  await ready(other);
  await expect(other.getByRole('alert')).toContainText('fresh lab');
  expect((await call(other, 'inspect_task_state')).agentRun.status).toBe(
    'idle',
  );
  await other.close();
});
test('native registrations withdraw on hide and return after actual back-forward caching', async ({
  page,
}, info) => {
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pagehide', { persisted: true }),
    ),
  );
  await expect.poll(() => toolNames(page)).toEqual([]);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent('pageshow', { persisted: true }),
    ),
  );
  await ready(page);
  expect((await call(page, 'get_test_scenario')).version).toBe('baseline');
  await page.evaluate(() =>
    window.addEventListener('pageshow', (event) => {
      (window as unknown as { frictionRestored: boolean }).frictionRestored =
        event.persisted;
    }),
  );
  await page.goto('/llms.txt');
  await page.goBack({ waitUntil: 'commit' });
  await ready(page);
  const restored = await page.evaluate(
    () =>
      (window as unknown as { frictionRestored?: boolean }).frictionRestored ===
      true,
  );
  await info.attach('back-forward-cache', {
    body: JSON.stringify({ restored }),
    contentType: 'application/json',
  });
  if (!process.env.FRICTION_WEBMCP_URL) expect(restored).toBe(true);
  expect((await call(page, 'get_test_scenario')).version).toBe('baseline');
  await page.reload();
  await ready(page);
});
