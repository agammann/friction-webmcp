import { compareRuns, completeRun, configureRun, record, registrationOutcome, reviewRun, startRun, type LabState, type Finding } from './lab-model.ts';
export type LabTool = { name: string; title: string; description: string; inputSchema: Record<string, unknown>; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: Record<string, unknown>) => Promise<unknown> };
const titles: Record<string, string> = {
  get_test_scenario: 'Read test scenario',
  start_agent_run: 'Start agent run',
  inspect_task_state: 'Inspect task state',
  configure_registration: 'Configure registration',
  review_registration: 'Review registration',
  complete_simulated_task: 'Complete simulated registration',
  get_human_interaction_trace: 'Read human interaction trace',
  compare_human_agent_runs: 'Compare human and agent runs',
  submit_parity_finding: 'Submit parity finding',
  propose_interface_patch: 'Propose interface patch',
};
const string = (minLength: number, maxLength: number) => ({ type: 'string', minLength, maxLength });
const choices = (...values: string[]) => ({ type: 'string', enum: values });
const object = (properties: Record<string, unknown> = {}) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
function validate(input: unknown, schema: ReturnType<typeof object>): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Input must be an object.');
  const data = input as Record<string, unknown>;
  if (Object.keys(data).some(k => !Object.hasOwn(schema.properties, k)) || schema.required.some(k => !Object.hasOwn(data, k))) throw new Error('Use exactly the fields listed in the tool schema.');
  for (const [key, raw] of Object.entries(schema.properties)) {
    const rule = raw as { type: string; enum?: string[]; const?: unknown; minLength?: number; maxLength?: number; pattern?: string };
    const value = data[key];
    if (typeof value !== rule.type || (rule.const !== undefined && value !== rule.const) || (rule.enum && !rule.enum.includes(value as string)) || (typeof value === 'string' && (value.trim().length < (rule.minLength ?? 0) || value.length > (rule.maxLength ?? Infinity) || (rule.pattern && !new RegExp(rule.pattern).test(value))))) throw new Error(`Invalid ${key}. Follow its schema.`);
  }
  return data;
}
export function createLabTools(get: () => LabState, commit: (state: LabState) => void, now = Date.now, version = get().version): LabTool[] {
  const make = (name: string, description: string, properties: Record<string, unknown>, readOnly: boolean, execute: (input: Record<string, unknown>) => unknown): LabTool => {
    const schema = object(properties);
    return { name, title: titles[name], description, inputSchema: schema, annotations: { readOnlyHint: readOnly, untrustedContentHint: true }, execute: async input => {
      if (get().version !== version) throw new Error('The interface changed. Discover the current tools and retry.');
      try { return execute(validate(input, schema)); }
      catch (error) {
        const state = get();
        if (!readOnly && ['configure_registration', 'review_registration', 'complete_simulated_task'].includes(name) && state.agentRun.status === 'running' && state.agentRun.steps.length < 200) {
          commit(record(state, 'agent', 'Rejected tool call', error instanceof Error ? error.message : 'Invalid call', now(), { errors: state.agentRun.errors + 1 }, name));
        }
        throw error;
      }
    } };
  };
  return [
    make('get_test_scenario', 'Read the fixed simulated RelayConf task. No real booking or payment occurs.', {}, true, () => ({ version, task: 'Register for General admission with a quiet-zone reserved seat.', ticket: 'general_admission', seat: 'quiet_zone', scope: 'Local simulation. Compare review/completion disclosures and explicit confirmation.', prices: version === 'repaired' ? registrationOutcome : { basePrice: 72, seatPrice: 10, subtotal: 82 } })),
    make('start_agent_run', 'Replace the current agent trace with a new recorded run.', {}, false, () => { commit(startRun(get(), 'agent', now())); return { started: true, version }; }),
    make('inspect_task_state', 'Read current runs and simulated records. This inspection is not counted as reviewing the current draft.', {}, true, () => ({ version, patchApproved: get().patchApproved, humanRun: get().humanRun, agentRun: get().agentRun })),
    make('configure_registration', 'Set the task ticket and seat. Invalidates any previous review token.', { ticket: choices('general_admission'), seat: choices('quiet_zone') }, false, () => { commit(configureRun(get(), 'agent', now())); return { ticket: 'general_admission', seat: 'quiet_zone', subtotal: 82 }; }),
    make('review_registration', 'Review the full $94 price and fee policy. Issue a new one-time review token.', {}, false, () => {
      const reviewToken = `FG-REVIEW-${crypto.randomUUID()}`;
      commit(reviewRun(get(), 'agent', reviewToken, now()));
      return { registration: { ...registrationOutcome, confirmed: false }, reviewToken, confirmationRequired: version === 'repaired' };
    }),
    make('complete_simulated_task', version === 'repaired' ? 'Finalize and save the simulated $94 registration after review and explicit confirmation. Consumes its review token.' : 'Finalize the baseline simulated registration. This deliberately permissive contract omits review and confirmation requirements and returns only a subtotal.', version === 'repaired' ? { reviewToken: { ...string(46, 46), pattern: '^FG-REVIEW-[0-9a-f-]{36}$' }, confirmed: { type: 'boolean', const: true } } : {}, false, input => {
      commit(completeRun(get(), 'agent', input, now()));
      return version === 'repaired' ? { completed: true, registration: registrationOutcome } : { completed: true, ticket: 'General admission', quietZoneSeat: true, subtotal: 82 };
    }),
    make('get_human_interaction_trace', 'Read recorded human events, elapsed time, provenance, and completion status.', {}, true, () => get().humanRun),
    make('compare_human_agent_runs', 'Compare completed traces of the same version and provenance using observed records, review, confirmation, and action counts.', {}, true, () => compareRuns(get().humanRun, get().agentRun)),
    make('submit_parity_finding', 'Save a caller-supplied finding for visible review; it is not independently verified. Maximum 30.', { severity: choices('critical', 'moderate'), dimension: choices('Information', 'Consent', 'Human effort'), title: string(5, 160), evidence: string(10, 600), proposal: string(10, 600) }, false, input => {
      const state = get();
      if (state.customFindings.length >= 30) throw new Error('Finding limit reached. Export and reset the lab.');
      const finding = { ...input, id: `NOTE-${crypto.randomUUID()}` } as Finding;
      commit({ ...state, customFindings: [...state.customFindings, finding] }); return { finding, status: 'Awaiting review' };
    }),
    make('propose_interface_patch', 'Save a visible text proposal. Does not execute code or change the interface. Maximum 30.', { change: string(10, 500) }, false, input => {
      const state = get();
      if (state.proposedNotes.length >= 30) throw new Error('Proposal limit reached. Export and reset the lab.');
      commit({ ...state, proposedNotes: [...state.proposedNotes, input.change as string] }); return { proposed: input.change, applied: false, next: 'Read the proposal in Findings. The UI can activate only built-in patch FG-PATCH-01.' };
    }),
  ];
}
