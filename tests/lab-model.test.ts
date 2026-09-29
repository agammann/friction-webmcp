import assert from 'node:assert/strict';
import test from 'node:test';
import { approvePatch, compareRuns, completeRun, configureRun, initialState, record, restoreState, reviewRun, replayPairedRun, startRun, type LabState } from '../lib/lab-model.ts';
import { createLabTools } from '../lib/lab-tools.ts';
const token = 'FG-REVIEW-00000000-0000-4000-8000-000000000000';
function harness(repaired = false) {
  let state = repaired ? approvePatch(initialState, '2026-09-28') : structuredClone(initialState);
  let time = 1000;
  const tools = createLabTools(() => state, next => { state = next; }, () => time += 1000);
  return { get: () => state, set: (next: LabState) => { state = next; }, call: (name: string, input: Record<string, unknown> = {}) => tools.find(t => t.name === name)!.execute(input), tools };
}
void test('new lab has no fabricated runs or findings', () => {
  assert.equal(initialState.humanRun.status, 'idle'); assert.equal(initialState.agentRun.steps.length, 0);
  assert.equal(compareRuns(initialState.humanRun, initialState.agentRun).metrics.length, 0);
});
void test('completion preserves actual events and elapsed time', () => {
  let state = startRun(initialState, 'human', 10000);
  state = record(state, 'human', 'Expanded needs', 'Actual action', 12000);
  state = configureRun(state, 'human', 13000);
  state = reviewRun(state, 'human', undefined, 16000);
  state = completeRun(state, 'human', { confirmed: true }, 21000);
  assert.equal(state.humanRun.durationSeconds, 11); assert.equal(state.humanRun.steps[0].label, 'Expanded needs'); assert.equal(state.humanRun.steps.length, 4);
});
void test('comparison depends on evidence, not repaired labels', () => {
  const state = replayPairedRun(initialState);
  const renamed = compareRuns({ ...state.humanRun, version: 'repaired' }, { ...state.agentRun, version: 'repaired' });
  assert.equal(renamed.criticalFailures, 2);
  const repaired = replayPairedRun(approvePatch(initialState, 'now'));
  const changed = { ...repaired.agentRun, outcome: { ...repaired.agentRun.outcome!, total: 95 } };
  assert.equal(compareRuns(repaired.humanRun, changed).metrics.find(m => m.key === 'outcome')!.pass, false);
});
void test('mixed sources and versions cannot yield a score', () => {
  const { humanRun, agentRun } = replayPairedRun(initialState);
  assert.equal(compareRuns(humanRun, { ...agentRun, source: 'interactive' }).metrics.length, 0);
  assert.equal(compareRuns(humanRun, { ...agentRun, version: 'repaired' }).metrics.length, 0);
});
void test('reviewing baseline changes information evidence without inventing consent', () => {
  let state = replayPairedRun(initialState);
  state = startRun(state, 'agent', 0); state = configureRun(state, 'agent', 1000); state = reviewRun(state, 'agent', token, 2000); state = completeRun(state, 'agent', {}, 3000);
  const report = compareRuns({ ...state.humanRun, source: 'interactive' }, state.agentRun);
  assert.equal(report.metrics.find(m => m.key === 'information')!.pass, true);
  assert.equal(report.metrics.find(m => m.key === 'consent')!.pass, false);
});
void test('approval clears runs and tokens; examples stay labeled', () => {
  const state = approvePatch(replayPairedRun(initialState), 'now');
  assert.equal(state.humanRun.status, 'idle'); assert.equal(state.reviewToken, undefined);
  assert.equal(replayPairedRun(state).agentRun.source, 'example');
});
void test('storage rejects malformed nested records and old format', () => {
  for (const raw of ['null', '{}', '{', JSON.stringify({ ...initialState, format: 1 }), JSON.stringify({ ...initialState, agentRun: { ...initialState.agentRun, steps: [null] } }), JSON.stringify({ ...initialState, proposedNotes: [12] })]) assert.throws(() => restoreState(raw));
  assert.deepEqual(restoreState(JSON.stringify(initialState)), initialState);
  assert.equal(restoreState(JSON.stringify(startRun(initialState, 'human'))).humanRun.status, 'cancelled');
});
void test('every tool rejects unexpected fields without changing completed records', async () => {
  const h = harness();
  for (const tool of h.tools) await assert.rejects(tool.execute({ surprise: true }));
  assert.equal(h.get().agentRun.status, 'idle');
  assert.equal(h.tools.length, 10); assert.ok(!h.tools.some(t => /approve/.test(t.name)));
});
void test('baseline uses actual trace and blocks duplicate completion', async () => {
  const h = harness(); await h.call('start_agent_run');
  await h.call('configure_registration', { ticket: 'general_admission', seat: 'quiet_zone' });
  const result = await h.call('complete_simulated_task');
  assert.deepEqual(result, { completed: true, ticket: 'General admission', quietZoneSeat: true, subtotal: 82 });
  assert.equal(h.get().agentRun.steps.length, 2);
  assert.equal(h.get().agentRun.durationSeconds, 2);
  await assert.rejects(h.call('complete_simulated_task')); assert.equal(h.get().agentRun.steps.length, 2);
});
void test('repaired token is current, required, consumed, and tied to configuration', async () => {
  const h = harness(true); await h.call('start_agent_run');
  await h.call('configure_registration', { ticket: 'general_admission', seat: 'quiet_zone' });
  const first = await h.call('review_registration') as { reviewToken: string };
  await assert.rejects(h.call('complete_simulated_task', { reviewToken: first.reviewToken, confirmed: false }));
  await h.call('configure_registration', { ticket: 'general_admission', seat: 'quiet_zone' });
  await assert.rejects(h.call('complete_simulated_task', { reviewToken: first.reviewToken, confirmed: true }));
  const current = await h.call('review_registration') as { reviewToken: string };
  await h.call('complete_simulated_task', { reviewToken: current.reviewToken, confirmed: true });
  assert.equal(h.get().agentRun.errors, 2); assert.equal(h.get().agentRun.steps.length, 7);
  assert.equal(h.get().reviewToken, undefined);
  await assert.rejects(h.call('complete_simulated_task', { reviewToken: current.reviewToken, confirmed: true }));
});
void test('notes validate runtime shape and length and remain visible in state', async () => {
  const h = harness();
  await assert.rejects(h.call('propose_interface_patch', { change: 123 }));
  await assert.rejects(h.call('propose_interface_patch', { change: ' '.repeat(20) }));
  await assert.rejects(h.call('submit_parity_finding', { severity: 'critical', dimension: 'bad', title: 'A title', evidence: 'Some evidence', proposal: 'A proposed change' }));
  await h.call('propose_interface_patch', { change: 'Make the price easier to find.' });
  assert.deepEqual(h.get().proposedNotes, ['Make the price easier to find.']);
  for (let n = 1; n < 30; n++) await h.call('propose_interface_patch', { change: 'Another proposal for review.' });
  await assert.rejects(h.call('propose_interface_patch', { change: 'Proposal beyond the limit.' }));
});
void test('old tools cannot keep using baseline contract after approval', async () => {
  const h = harness(); h.set(approvePatch(h.get(), 'now'));
  await assert.rejects(h.call('complete_simulated_task'), /Discover/);
});
