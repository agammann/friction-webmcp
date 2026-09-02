import assert from 'node:assert/strict';
import test from 'node:test';

import {
  approvePatch,
  baselineAgentTrace,
  baselineHumanTrace,
  completeRepairedAgentDraft,
  compareRuns,
  configureAgentDraft,
  initialState,
  reviewAgentDraft,
  replayPairedRun,
  repairedAgentTrace,
  repairedHumanTrace,
  startedAgentDraft,
} from '../lib/lab-model.ts';

void test('baseline comparison exposes the intended information and consent gaps', () => {
  const report = compareRuns(baselineHumanTrace, baselineAgentTrace);

  assert.equal(report.score, 50);
  assert.equal(report.criticalFailures, 2);
  assert.equal(report.metrics.find((metric) => metric.key === 'information')?.pass, false);
  assert.equal(report.metrics.find((metric) => metric.key === 'consent')?.pass, false);
  assert.equal(report.metrics.find((metric) => metric.key === 'state')?.pass, true);
});

void test('repaired comparison preserves all four parity guarantees', () => {
  const report = compareRuns(repairedHumanTrace, repairedAgentTrace);

  assert.equal(report.score, 96);
  assert.equal(report.criticalFailures, 0);
  assert.ok(report.metrics.every((metric) => metric.pass));
});

void test('human approval activates the repaired contract and clears both traces', () => {
  const approved = approvePatch(initialState, 'Aug 31, 10:00 PM');

  assert.equal(approved.patchApproved, true);
  assert.equal(approved.version, 'repaired');
  assert.equal(approved.humanRun.status, 'idle');
  assert.equal(approved.agentRun.status, 'idle');
});

void test('paired replay uses repaired traces only after approval', () => {
  const baselineReplay = replayPairedRun(initialState);
  const repairedReplay = replayPairedRun(approvePatch(initialState, 'now'));

  assert.equal(baselineReplay.agentRun.version, 'baseline');
  assert.equal(repairedReplay.agentRun.version, 'repaired');
  assert.equal(compareRuns(repairedReplay.humanRun, repairedReplay.agentRun).score, 96);
});

void test('configuration invalidates any earlier review token', () => {
  const configured = configureAgentDraft(startedAgentDraft());
  const reviewed = reviewAgentDraft(configured, 'FG-REVIEW-first-token');
  const reconfigured = configureAgentDraft(reviewed);

  assert.equal(reconfigured.configured, true);
  assert.equal(reconfigured.reviewed, false);
  assert.equal(reconfigured.reviewToken, undefined);
});

void test('repaired completion consumes the review token and blocks replay', () => {
  const reviewed = reviewAgentDraft(
    configureAgentDraft(startedAgentDraft()),
    'FG-REVIEW-current-token',
  );
  const completed = completeRepairedAgentDraft(
    reviewed,
    'FG-REVIEW-current-token',
    true,
  );

  assert.equal(completed.completed, true);
  assert.equal(completed.reviewed, false);
  assert.equal(completed.reviewToken, undefined);
  assert.throws(
    () => completeRepairedAgentDraft(completed, 'FG-REVIEW-current-token', true),
    /already complete/,
  );
});

void test('repaired completion rejects stale tokens and missing confirmation', () => {
  const reviewed = reviewAgentDraft(
    configureAgentDraft(startedAgentDraft()),
    'FG-REVIEW-current-token',
  );

  assert.throws(
    () => completeRepairedAgentDraft(reviewed, 'FG-REVIEW-stale-token', true),
    /pass its reviewToken/,
  );
  assert.throws(
    () => completeRepairedAgentDraft(reviewed, 'FG-REVIEW-current-token', false),
    /confirmed=true/,
  );
});
