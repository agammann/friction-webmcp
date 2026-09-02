export type LabVersion = 'baseline' | 'repaired';
export type RunActor = 'human' | 'agent';
export type StepTone = 'neutral' | 'success' | 'warning' | 'critical';

export type TraceStep = {
  at: string;
  label: string;
  detail: string;
  tone: StepTone;
  tool?: string;
};

export type RunTrace = {
  actor: RunActor;
  version: LabVersion;
  status: 'idle' | 'running' | 'complete';
  durationSeconds: number;
  errors: number;
  backtracks: number;
  hesitations: number;
  outcome?: RegistrationOutcome;
  steps: TraceStep[];
};

export type RegistrationOutcome = {
  ticket: 'General admission';
  quietZoneSeat: true;
  basePrice: 72;
  seatPrice: 10;
  serviceFee: 12;
  total: 94;
  feePolicy: 'Service fee is non-refundable after 24 hours.';
  confirmed: true;
};

export type ParityMetric = {
  key: 'outcome' | 'information' | 'consent' | 'state' | 'effort';
  label: string;
  score: number;
  detail: string;
  pass: boolean;
};

export type ParityReport = {
  score: number;
  metrics: ParityMetric[];
  criticalFailures: number;
  summary: string;
};

export type Finding = {
  id: string;
  severity: 'critical' | 'moderate';
  dimension: 'Information' | 'Consent' | 'Human effort';
  title: string;
  evidence: string;
  proposal: string;
};

export type AgentDraft = {
  started: boolean;
  configured: boolean;
  reviewed: boolean;
  reviewToken?: string;
  completed: boolean;
  quietZoneSeat: boolean;
};

export function idleAgentDraft(): AgentDraft {
  return {
    started: false,
    configured: false,
    reviewed: false,
    completed: false,
    quietZoneSeat: false,
  };
}

export function startedAgentDraft(): AgentDraft {
  return { ...idleAgentDraft(), started: true };
}

export function configureAgentDraft(draft: AgentDraft): AgentDraft {
  if (!draft.started) {
    throw new Error('Start an agent run before configuring the registration.');
  }
  if (draft.completed) {
    throw new Error('Start a new agent run before changing a completed registration.');
  }

  return {
    ...draft,
    configured: true,
    reviewed: false,
    reviewToken: undefined,
    quietZoneSeat: true,
  };
}

export function reviewAgentDraft(
  draft: AgentDraft,
  reviewToken: string,
): AgentDraft {
  if (!draft.started || !draft.configured) {
    throw new Error('Configure the registration before requesting review.');
  }
  if (draft.completed) {
    throw new Error('Start a new agent run before reviewing another registration.');
  }

  return { ...draft, reviewed: true, reviewToken };
}

export function completeRepairedAgentDraft(
  draft: AgentDraft,
  reviewToken: unknown,
  confirmed: unknown,
): AgentDraft {
  if (!draft.started || !draft.configured) {
    throw new Error('Configure the registration before completing it.');
  }
  if (draft.completed) {
    throw new Error('This registration is already complete. Start a new agent run to repeat the task.');
  }
  if (!draft.reviewed || reviewToken !== draft.reviewToken || confirmed !== true) {
    throw new Error('Review the itemized total, then pass its reviewToken with confirmed=true.');
  }

  return {
    ...draft,
    reviewed: false,
    reviewToken: undefined,
    completed: true,
  };
}

export type LabState = {
  version: LabVersion;
  humanRun: RunTrace;
  agentRun: RunTrace;
  findings: Finding[];
  patchApproved: boolean;
  patchApprovedAt?: string;
  customFindings: Finding[];
  proposedNotes: string[];
  agentDraft: AgentDraft;
};

export const registrationOutcome: RegistrationOutcome = {
  ticket: 'General admission',
  quietZoneSeat: true,
  basePrice: 72,
  seatPrice: 10,
  serviceFee: 12,
  total: 94,
  feePolicy: 'Service fee is non-refundable after 24 hours.',
  confirmed: true,
};

export const baselineHumanTrace: RunTrace = {
  actor: 'human',
  version: 'baseline',
  status: 'complete',
  durationSeconds: 62,
  errors: 0,
  backtracks: 1,
  hesitations: 1,
  outcome: registrationOutcome,
  steps: [
    { at: '00:08', label: 'Opened ticket options', detail: 'Scanned six ticket cards', tone: 'neutral' },
    { at: '00:31', label: 'Found “More attendee needs”', detail: '23-second hesitation · one backtrack', tone: 'warning' },
    { at: '00:43', label: 'Selected quiet-zone seat', detail: 'Important option was inside a collapsed panel', tone: 'warning' },
    { at: '00:49', label: 'Reviewed total and policy', detail: '$94 total · $12 fee · non-refundable after 24h', tone: 'success' },
    { at: '01:02', label: 'Confirmed registration', detail: 'Explicit review and confirmation', tone: 'success' },
  ],
};

export const baselineAgentTrace: RunTrace = {
  actor: 'agent',
  version: 'baseline',
  status: 'complete',
  durationSeconds: 4,
  errors: 0,
  backtracks: 0,
  hesitations: 0,
  outcome: registrationOutcome,
  steps: [
    { at: '00:01', label: 'Read scenario', detail: 'Task and options returned as structured data', tone: 'neutral', tool: 'get_test_scenario' },
    { at: '00:03', label: 'Configured registration', detail: 'quiet_zone selected directly', tone: 'success', tool: 'configure_registration' },
    { at: '00:04', label: 'Finished and saved', detail: 'No review token or explicit confirmation required', tone: 'critical', tool: 'complete_simulated_task' },
    { at: '00:04', label: 'Received incomplete result', detail: 'Returned $82 subtotal; $12 fee and policy omitted', tone: 'critical', tool: 'complete_simulated_task' },
  ],
};

export const repairedHumanTrace: RunTrace = {
  actor: 'human',
  version: 'repaired',
  status: 'complete',
  durationSeconds: 35,
  errors: 0,
  backtracks: 0,
  hesitations: 0,
  outcome: registrationOutcome,
  steps: [
    { at: '00:07', label: 'Opened ticket options', detail: 'Core choices grouped by task', tone: 'neutral' },
    { at: '00:14', label: 'Selected quiet-zone seat', detail: 'Visible under “Accessibility & comfort”', tone: 'success' },
    { at: '00:23', label: 'Reviewed total and policy', detail: '$94 total · $12 fee · non-refundable after 24h', tone: 'success' },
    { at: '00:35', label: 'Confirmed registration', detail: 'Explicit review and confirmation', tone: 'success' },
  ],
};

export const repairedAgentTrace: RunTrace = {
  actor: 'agent',
  version: 'repaired',
  status: 'complete',
  durationSeconds: 7,
  errors: 0,
  backtracks: 0,
  hesitations: 0,
  outcome: registrationOutcome,
  steps: [
    { at: '00:01', label: 'Read scenario', detail: 'Task, prices, and conditions returned', tone: 'neutral', tool: 'get_test_scenario' },
    { at: '00:03', label: 'Configured registration', detail: 'Narrow enum selected quiet_zone', tone: 'success', tool: 'configure_registration' },
    { at: '00:05', label: 'Reviewed total and policy', detail: '$94 total · $12 fee · review token issued', tone: 'success', tool: 'review_registration' },
    { at: '00:07', label: 'Confirmed registration', detail: 'confirmed=true and review token required', tone: 'success', tool: 'complete_simulated_task' },
  ],
};

export const idleTrace = (actor: RunActor, version: LabVersion): RunTrace => ({
  actor,
  version,
  status: 'idle',
  durationSeconds: 0,
  errors: 0,
  backtracks: 0,
  hesitations: 0,
  steps: [],
});

export const findings: Finding[] = [
  {
    id: 'FG-INFO-01',
    severity: 'critical',
    dimension: 'Information',
    title: 'Agent result hides a material fee',
    evidence: 'Human review showed $94 and a $12 non-refundable service fee. The tool returned only the $82 subtotal.',
    proposal: 'Return base_price, option_price, service_fee, fee_policy, and total as separate fields.',
  },
  {
    id: 'FG-CONSENT-01',
    severity: 'critical',
    dimension: 'Consent',
    title: 'Ambiguous tool bypasses review',
    evidence: 'complete_simulated_task finalized the record without a review token or confirmed=true.',
    proposal: 'Require review_registration first, then a one-time reviewToken and explicit confirmation.',
  },
  {
    id: 'FG-HUMAN-01',
    severity: 'moderate',
    dimension: 'Human effort',
    title: 'Important option is visually buried',
    evidence: 'The human took 23 seconds and one backtrack to find the quiet-zone seat inside “More attendee needs”.',
    proposal: 'Surface the option under a plainly named “Accessibility & comfort” group.',
  },
];

export const patchChanges = [
  'Surface “Quiet-zone reserved seat” under Accessibility & comfort.',
  'Return service_fee, fee_policy, and total from review and completion tools.',
  'Require reviewToken plus confirmed=true before finalization.',
  'Rename the final tool description to state exactly what becomes final.',
];

export function compareRuns(human: RunTrace, agent: RunTrace): ParityReport {
  if (human.status !== 'complete' || agent.status !== 'complete') {
    return {
      score: 0,
      metrics: [],
      criticalFailures: 0,
      summary: 'Complete both journeys to calculate parity.',
    };
  }

  const repaired = human.version === 'repaired' && agent.version === 'repaired';
  const metrics: ParityMetric[] = repaired
    ? [
        { key: 'outcome', label: 'Outcome', score: 100, detail: 'Same registration', pass: true },
        { key: 'information', label: 'Information', score: 100, detail: 'Same fee and policy', pass: true },
        { key: 'consent', label: 'Consent', score: 100, detail: 'Same review gate', pass: true },
        { key: 'state', label: 'State', score: 100, detail: 'Same durable record', pass: true },
        { key: 'effort', label: 'Effort', score: 80, detail: '28s difference, no confusion', pass: true },
      ]
    : [
        { key: 'outcome', label: 'Outcome', score: 100, detail: 'Same registration', pass: true },
        { key: 'information', label: 'Information', score: 20, detail: '$12 fee omitted', pass: false },
        { key: 'consent', label: 'Consent', score: 0, detail: 'Review bypassed', pass: false },
        { key: 'state', label: 'State', score: 100, detail: 'Same final record', pass: true },
        { key: 'effort', label: 'Effort', score: 30, detail: '58s gap hides friction', pass: false },
      ];
  const score = Math.round(metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length);
  return {
    score,
    metrics,
    criticalFailures: repaired ? 0 : 2,
    summary: repaired
      ? 'The repaired interface and tools now preserve outcome, information, consent, and state parity.'
      : 'The paths reach the same registration, but the agent misses material information and human consent.',
  };
}

export const initialState: LabState = {
  version: 'baseline',
  humanRun: baselineHumanTrace,
  agentRun: baselineAgentTrace,
  findings,
  patchApproved: false,
  customFindings: [],
  proposedNotes: [],
  agentDraft: idleAgentDraft(),
};

export function approvePatch(state: LabState, approvedAt: string): LabState {
  return {
    ...state,
    version: 'repaired',
    patchApproved: true,
    patchApprovedAt: approvedAt,
    humanRun: idleTrace('human', 'repaired'),
    agentRun: idleTrace('agent', 'repaired'),
    agentDraft: idleAgentDraft(),
  };
}

export function replayPairedRun(state: LabState): LabState {
  const repaired = state.version === 'repaired';
  return {
    ...state,
    humanRun: repaired ? repairedHumanTrace : baselineHumanTrace,
    agentRun: repaired ? repairedAgentTrace : baselineAgentTrace,
    agentDraft: {
      started: true,
      configured: true,
      reviewed: false,
      completed: true,
      quietZoneSeat: true,
    },
  };
}
