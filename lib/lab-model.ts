export type LabVersion = 'baseline' | 'repaired';
export type RunActor = 'human' | 'agent';
export type TraceStep = { at: string; label: string; detail: string; tone: 'neutral' | 'success' | 'warning' | 'critical'; tool?: string };
export type RegistrationOutcome = { ticket: string; quietZoneSeat: boolean; basePrice: number; seatPrice: number; serviceFee: number; total: number; feePolicy: string; confirmed: boolean };
export const registrationOutcome: RegistrationOutcome = { ticket: 'General admission', quietZoneSeat: true, basePrice: 72, seatPrice: 10, serviceFee: 12, total: 94, feePolicy: 'Service fee is non-refundable after 24 hours.', confirmed: true };
export type RunTrace = {
  actor: RunActor; version: LabVersion; source: 'interactive' | 'example';
  status: 'idle' | 'running' | 'complete' | 'cancelled'; startedAt?: number;
  durationSeconds: number; errors: number; steps: TraceStep[];
  configured: boolean; reviewed: boolean; explicitConfirmation: boolean;
  disclosure?: RegistrationOutcome; outcome?: RegistrationOutcome;
};
export type Finding = { id: string; severity: 'critical' | 'moderate'; dimension: 'Information' | 'Consent' | 'Human effort'; title: string; evidence: string; proposal: string };
export type LabState = { format: 2; version: LabVersion; humanRun: RunTrace; agentRun: RunTrace; reviewToken?: string; patchApproved: boolean; patchApprovedAt?: string; customFindings: Finding[]; proposedNotes: string[] };
export const idleTrace = (actor: RunActor, version: LabVersion): RunTrace => ({ actor, version, source: 'interactive', status: 'idle', durationSeconds: 0, errors: 0, steps: [], configured: false, reviewed: false, explicitConfirmation: false });
export const initialState: LabState = { format: 2, version: 'baseline', humanRun: idleTrace('human', 'baseline'), agentRun: idleTrace('agent', 'baseline'), patchApproved: false, customFindings: [], proposedNotes: [] };
export const patchChanges = [
  'Show the quiet-zone seat under Accessibility & comfort.',
  'Return the itemized price and fee policy when completing the agent task.',
  'Require a current reviewToken and confirmed=true before agent completion.',
  'Describe exactly what the completion tool finalizes.',
];
const key = (actor: RunActor) => actor === 'human' ? 'humanRun' : 'agentRun';
const clock = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
export function startRun(state: LabState, actor: RunActor, now = Date.now()): LabState {
  const run = { ...idleTrace(actor, state.version), status: 'running' as const, startedAt: now };
  return { ...state, [key(actor)]: run, ...(actor === 'agent' ? { reviewToken: undefined } : {}) };
}
export function record(state: LabState, actor: RunActor, label: string, detail: string, now = Date.now(), extra: Partial<RunTrace> = {}, tool?: string): LabState {
  const run = state[key(actor)];
  if (run.status !== 'running') throw new Error(`Start a new ${actor} run first; this run is ${run.status}.`);
  if (run.steps.length >= 200) throw new Error('This run reached 200 events. Start a new run.');
  const durationSeconds = Math.max(run.durationSeconds, Math.floor((now - (run.startedAt ?? now)) / 1000));
  return { ...state, [key(actor)]: { ...run, ...extra, durationSeconds, steps: [...run.steps, { at: clock(durationSeconds), label, detail, tone: 'neutral', ...(tool ? { tool } : {}) }] } };
}
export function configureRun(state: LabState, actor: RunActor, now = Date.now()): LabState {
  return { ...record(state, actor, 'Configured registration', 'General admission + quiet-zone seat; $82 subtotal before fee.', now, { configured: true, reviewed: false, disclosure: undefined }, actor === 'agent' ? 'configure_registration' : undefined), ...(actor === 'agent' ? { reviewToken: undefined } : {}) };
}
export function reviewRun(state: LabState, actor: RunActor, token?: string, now = Date.now()): LabState {
  if (!state[key(actor)].configured) throw new Error('Configure the registration before reviewing.');
  if (actor === 'agent' && (!token || !/^FG-REVIEW-[\da-f-]{36}$/.test(token))) throw new Error('A fresh review token is required.');
  return { ...record(state, actor, 'Reviewed total and policy', '$72 ticket + $10 seat + $12 fee = $94. Fee non-refundable after 24 hours.', now, { reviewed: true, disclosure: { ...registrationOutcome, confirmed: false } }, actor === 'agent' ? 'review_registration' : undefined), ...(actor === 'agent' ? { reviewToken: token } : {}) };
}
export function completeRun(state: LabState, actor: RunActor, input: { reviewToken?: unknown; confirmed?: unknown } = {}, now = Date.now()): LabState {
  const run = state[key(actor)];
  if (run.status !== 'running' || !run.configured) throw new Error('Start and configure a new run before completing it.');
  const gated = actor === 'human' || state.version === 'repaired';
  if (gated && (!run.reviewed || input.confirmed !== true || (actor === 'agent' && (!state.reviewToken || input.reviewToken !== state.reviewToken)))) throw new Error('Review the itemized total, then pass the current reviewToken and confirmed=true.');
  return { ...record(state, actor, 'Completed simulated registration', gated ? 'Explicit confirmation; full $94 result and fee policy.' : 'Baseline completion returned only $82 subtotal; no explicit confirmation.', now, { status: 'complete', explicitConfirmation: gated, outcome: { ...registrationOutcome }, ...(gated ? { disclosure: { ...registrationOutcome } } : {}) }, actor === 'agent' ? 'complete_simulated_task' : undefined), ...(actor === 'agent' ? { reviewToken: undefined } : {}) };
}
export function approvePatch(state: LabState, approvedAt: string): LabState {
  return { ...state, version: 'repaired', patchApproved: true, patchApprovedAt: approvedAt, humanRun: idleTrace('human', 'repaired'), agentRun: idleTrace('agent', 'repaired'), reviewToken: undefined };
}
export function replayPairedRun(state: LabState): LabState {
  let next = state;
  for (const actor of ['human', 'agent'] as const) {
    next = startRun(next, actor, 0);
    if (actor === 'human') next = record(next, actor, 'Selected ticket', 'General admission', 1000);
    next = configureRun(next, actor, 2000);
    if (actor === 'human' || state.version === 'repaired') next = reviewRun(next, actor, 'FG-REVIEW-00000000-0000-4000-8000-000000000000', 3000);
    next = completeRun(next, actor, { confirmed: true, reviewToken: next.reviewToken }, 4000);
    next = { ...next, [key(actor)]: { ...next[key(actor)], source: 'example' } };
  }
  return next;
}
export type ParityMetric = { key: string; label: string; score: number; detail: string; pass: boolean };
export type ParityReport = { score: number; metrics: ParityMetric[]; criticalFailures: number; summary: string };
const same = (a?: RegistrationOutcome, b?: RegistrationOutcome) => Boolean(a && b && (Object.keys(registrationOutcome) as (keyof RegistrationOutcome)[]).every(k => a[k] === b[k]));
export function compareRuns(human: RunTrace, agent: RunTrace): ParityReport {
  const pending = (summary: string): ParityReport => ({ score: 0, metrics: [], criticalFailures: 0, summary });
  if (human.status !== 'complete' || agent.status !== 'complete') return pending('Complete both journeys to calculate parity.');
  if (human.version !== agent.version) return pending('Run both journeys on the same interface version.');
  if (human.source !== agent.source) return pending('Example and interactive traces cannot be compared. Run both sides yourself or load an example pair.');
  const outcome = same(human.outcome, registrationOutcome) && same(agent.outcome, registrationOutcome);
  const disclosed = (run: RunTrace) => same(run.disclosure && { ...run.disclosure, confirmed: true }, run.outcome);
  const information = disclosed(human) && disclosed(agent);
  const consent = human.reviewed && agent.reviewed && human.explicitConfirmation && agent.explicitConfirmation;
  const state = same(human.outcome, agent.outcome);
  const effort = Math.round(100 * Math.min(human.steps.length, agent.steps.length) / Math.max(1, human.steps.length, agent.steps.length));
  const metrics: ParityMetric[] = [
    { key: 'outcome', label: 'Outcome', score: outcome ? 100 : 0, pass: outcome, detail: outcome ? 'Both match the task' : 'Task result mismatch' },
    { key: 'information', label: 'Information', score: information ? 100 : 0, pass: information, detail: information ? 'Full review disclosed' : 'Full review missing' },
    { key: 'consent', label: 'Consent', score: consent ? 100 : 0, pass: consent, detail: consent ? 'Reviewed and confirmed' : 'Review or confirmation missing' },
    { key: 'state', label: 'State', score: state ? 100 : 0, pass: state, detail: state ? 'Matching in-page records' : 'Records differ' },
    { key: 'effort', label: 'Action balance', score: effort, pass: effort >= 75, detail: `${human.steps.length} UI / ${agent.steps.length} tool events` },
  ];
  const criticalFailures = metrics.slice(0, 4).filter(m => !m.pass).length;
  return { score: Math.round(metrics.reduce((n, m) => n + m.score, 0) / 5), metrics, criticalFailures, summary: `${human.source === 'example' ? 'Illustrative example' : 'Recorded pair'}: ${criticalFailures ? `${criticalFailures} core checks failed.` : 'All four core checks passed.'} Action balance is a count heuristic, not a usability rating.` };
}
export function observedFindings(state: LabState): Finding[] {
  const report = compareRuns(state.humanRun, state.agentRun);
  return report.metrics.filter(m => !m.pass).map(m => ({ id: `OBS-${m.key}`, severity: m.key === 'effort' ? 'moderate' : 'critical', dimension: m.key === 'effort' ? 'Human effort' : m.key === 'consent' ? 'Consent' : 'Information', title: `${m.label} check failed`, evidence: `${state.humanRun.source === 'example' ? 'Example pair' : 'Recorded pair'}: ${m.detail}.`, proposal: m.key === 'effort' ? 'Inspect the event traces. Counts alone do not establish confusion or difficulty.' : 'Inspect the disclosed review, confirmation events, and resulting records in the exported report.' }));
}
// Storage is optional and untrusted. Reject old, malformed, and oversized snapshots.
export function restoreState(raw: string): LabState {
  if (raw.length > 300000) throw new Error('Saved lab is too large.');
  const value: unknown = JSON.parse(raw);
  const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  const str = (v: unknown, max = 1000) => typeof v === 'string' && v.length <= max;
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  const outcome = (v: unknown) => v === undefined || (obj(v) && str(v.ticket) && typeof v.quietZoneSeat === 'boolean' && ['basePrice', 'seatPrice', 'serviceFee', 'total'].every(k => num(v[k])) && str(v.feePolicy) && typeof v.confirmed === 'boolean');
  const run = (v: unknown, actor: string, version: unknown) => obj(v) && v.actor === actor && v.version === version && ['interactive', 'example'].includes(String(v.source)) && ['idle', 'running', 'complete', 'cancelled'].includes(String(v.status)) && num(v.durationSeconds) && num(v.errors) && (v.startedAt === undefined || num(v.startedAt)) && ['configured', 'reviewed', 'explicitConfirmation'].every(k => typeof v[k] === 'boolean') && outcome(v.outcome) && outcome(v.disclosure) && Array.isArray(v.steps) && v.steps.length <= 200 && v.steps.every(s => obj(s) && str(s.at, 40) && str(s.label) && str(s.detail) && ['neutral', 'success', 'warning', 'critical'].includes(String(s.tone)) && (s.tool === undefined || str(s.tool, 80)));
  if (!obj(value) || value.format !== 2 || !['baseline', 'repaired'].includes(String(value.version)) || value.patchApproved !== (value.version === 'repaired') || !run(value.humanRun, 'human', value.version) || !run(value.agentRun, 'agent', value.version) || (value.patchApprovedAt !== undefined && !str(value.patchApprovedAt, 100)) || (value.reviewToken !== undefined && (typeof value.reviewToken !== 'string' || !/^FG-REVIEW-[\da-f-]{36}$/.test(value.reviewToken))) || !Array.isArray(value.proposedNotes) || value.proposedNotes.length > 30 || !value.proposedNotes.every(n => str(n, 500)) || !Array.isArray(value.customFindings) || value.customFindings.length > 30 || !value.customFindings.every(f => obj(f) && str(f.id, 80) && str(f.title, 160) && str(f.evidence, 600) && str(f.proposal, 600) && ['critical', 'moderate'].includes(String(f.severity)) && ['Information', 'Consent', 'Human effort'].includes(String(f.dimension)))) throw new Error('Saved lab has an unsupported or invalid format.');
  const restored = value as unknown as LabState;
  return { ...restored, humanRun: restored.humanRun.status === 'running' ? { ...restored.humanRun, status: 'cancelled' } : restored.humanRun };
}
