'use client';
/* oxlint-disable react/react-compiler */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Activity,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Eye,
  FileWarning,
  GitCompareArrows,
  ListChecks,
  LockKeyhole,
  MousePointer2,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { approvePatch, compareRuns, completeRun, configureRun, initialState, observedFindings, patchChanges, record, restoreState, reviewRun, replayPairedRun, startRun, type Finding, type LabState, type RunTrace, type TraceStep } from '@/lib/lab-model';
import { createLabTools } from '@/lib/lab-tools';
const STORAGE_KEY = 'friction-lab-v2';

function useModal(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const trigger = document.activeElement;
    dialog.showModal();
    return () => { dialog.close(); if (trigger instanceof HTMLElement) queueMicrotask(() => trigger.focus()); };
  }, []);
  return { ref, onCancel: (event: React.SyntheticEvent) => { event.preventDefault(); onClose(); } };
}

const toolCatalog = [
  ['get_test_scenario', 'Read the fixed task and advertised prices.', 'read'],
  ['start_agent_run', 'Start a fresh structured agent trace.', 'write'],
  ['inspect_task_state', 'Inspect the shared live registration state.', 'read'],
  ['configure_registration', 'Configure the same registration the human sees.', 'write'],
  ['review_registration', 'Return an itemized review and create a review token.', 'write'],
  ['complete_simulated_task', 'Finalize according to the active interface contract.', 'write'],
  ['get_human_interaction_trace', 'Read recorded events, elapsed time, and provenance.', 'read'],
  ['compare_human_agent_runs', 'Compare recorded outcomes, disclosures, confirmation, and event counts.', 'read'],
  ['submit_parity_finding', 'Record a structured parity finding.', 'write'],
  ['propose_interface_patch', 'Propose a change for visible human review.', 'write'],
] as const;

const stepTone: Record<TraceStep['tone'], string> = {
  neutral: 'bg-ink/35',
  success: 'bg-mint',
  warning: 'bg-amber',
  critical: 'bg-signal',
};

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function TraceLane({ trace }: { trace: RunTrace }) {
  const human = trace.actor === 'human';
  return (
    <Card className="glass-panel min-w-0 gap-0 rounded-[18px] py-0 shadow-none">
      <CardHeader className="flex flex-row items-center gap-3 border-b border-ink/10 px-4 py-4 sm:px-5">
        <span className={`grid size-9 place-items-center rounded-full ${human ? 'bg-ink text-paper' : 'bg-signal text-white'}`}>
          {human ? <UserRound className="size-4" /> : <Bot className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold tracking-[-0.02em]">{human ? 'Human journey' : 'Agent journey'}</h2>
            <Badge variant="outline" className="border-ink/15 bg-white/35 text-[10px] uppercase tracking-[0.12em]">
              {trace.source === 'example' ? 'Example' : human ? 'Visual UI' : 'WebMCP'}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-ink/55">
            {trace.status === 'idle'
              ? 'Waiting for this run'
              : `${formatDuration(trace.durationSeconds)} · ${trace.steps.length} ${human ? 'actions' : 'tool events'} · ${trace.errors} rejected calls · ${trace.status}`}
          </p>
        </div>
        {trace.status === 'complete' ? <CheckCircle2 className="size-4 text-mint" /> : <Clock3 className="size-4 text-ink/30" />}
      </CardHeader>
      <CardContent className="min-h-[296px] px-4 py-2 sm:px-5">
        {trace.steps.length ? (
          <ol className="divide-y divide-ink/8">
            {trace.steps.map((step, index) => (
              <li key={index} className="grid grid-cols-[42px_18px_minmax(0,1fr)] gap-2 py-3">
                <span className="pt-0.5 font-mono text-[10px] text-ink/45">{step.at}</span>
                <span className="relative flex justify-center">
                  <span className={`mt-1.5 size-2 rounded-full ${stepTone[step.tone]}`} />
                  {index < trace.steps.length - 1 ? <span className="absolute top-4 h-[calc(100%+2px)] w-px bg-ink/10" /> : null}
                </span>
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="break-words text-sm font-medium leading-5">{step.label}</p>
                    {step.tool ? <code className="hidden max-w-[150px] truncate rounded bg-ink/[0.05] px-1.5 py-0.5 text-[9px] text-ink/45 sm:block">{step.tool}</code> : null}
                  </div>
                  <p className={`mt-0.5 text-xs leading-4 ${step.tone === 'critical' ? 'font-medium text-signal' : 'text-ink/55'}`}>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="grid min-h-[280px] place-items-center text-center">
            <div>
              <span className="mx-auto grid size-11 place-items-center rounded-full border border-dashed border-ink/20 text-ink/35">
                {human ? <MousePointer2 className="size-4" /> : <Bot className="size-4" />}
              </span>
              <p className="mt-3 text-sm font-medium">No {human ? 'human' : 'agent'} trace yet</p>
              <p className="mt-1 text-xs text-ink/45">Run this side to include it in the comparison.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreCard({ state }: { state: LabState }) {
  const report = compareRuns(state.humanRun, state.agentRun);
  const ready = report.metrics.length > 0;
  return (
    <aside className="glass-panel rounded-[18px] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/65">Parity score</p>
          <p className="mt-1 font-mono text-4xl font-semibold tracking-[-0.08em]">
            {ready ? report.score : '—'}<span className="text-xl text-ink/55">/100</span>
          </p>
        </div>
        <span className={`grid size-10 place-items-center rounded-full ${report.criticalFailures ? 'bg-signal/10 text-signal' : ready ? 'bg-mint/10 text-mint' : 'bg-ink/5 text-ink/35'}`}>
          {report.criticalFailures ? <CircleAlert className="size-5" /> : <ShieldCheck className="size-5" />}
        </span>
      </div>
      <div className={`score-track mt-4 ${state.version === 'repaired' ? 'repaired' : ''}`}><span style={{ width: `${report.score}%` }} /></div>
      <div className="mt-5 space-y-2.5">
        {ready ? report.metrics.map((metric) => (
          <div key={metric.key} className="flex items-center justify-between border-b border-ink/8 pb-2 text-xs last:border-0">
            <span className="text-ink/70">{metric.label}</span>
            <span className={`flex items-center gap-1.5 text-right font-semibold ${metric.pass ? 'text-ink' : 'text-signal'}`}>
              {metric.pass ? <Check className="size-3" /> : <CircleAlert className="size-3" />}{metric.detail}
            </span>
          </div>
        )) : (
          <p className="rounded-xl border border-dashed border-ink/15 p-3 text-xs leading-5 text-ink/50">{report.summary}</p>
        )}
      </div>
      {ready ? (
        <div className={`mt-5 rounded-xl border p-3 ${report.criticalFailures ? 'border-signal/20 bg-signal/[0.06]' : 'border-mint/25 bg-mint/[0.07]'}`}>
          <p className={`flex items-center gap-2 text-xs font-semibold ${report.criticalFailures ? 'text-signal' : 'text-mint'}`}>
            {report.criticalFailures ? <CircleAlert className="size-4" /> : <CheckCircle2 className="size-4" />}
            {report.criticalFailures ? `${report.criticalFailures} critical failures` : 'Core checks passed'}
          </p>
          <p className="mt-1 text-[11px] leading-4 text-ink/75">{report.summary}</p>
        </div>
      ) : null}
    </aside>
  );
}

function HumanRunDialog({
  version,
  onClose,
  onComplete,
  onEvent,
}: {
  version: LabState['version'];
  onClose: () => void;
  onComplete: () => void;
  onEvent: (action: string) => void;
}) {
  const modal = useModal(onClose);
  const [stage, setStage] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(version === 'repaired');
  const [quietSeat, setQuietSeat] = useState(false);
  const repaired = version === 'repaired';
  return (
    <dialog {...modal} className="lab-dialog" aria-labelledby="human-run-title">
        <header className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/45">RelayConf registration · {repaired ? 'retest' : 'baseline'}</p>
            <h2 id="human-run-title" className="mt-1 text-lg font-semibold tracking-[-0.03em]">Complete the task visually</h2>
          </div>
          <Button aria-label="Close human run" variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </header>
        <div className="px-5 py-5">
          <div className="mb-5 grid grid-cols-3 gap-2">
            {['Ticket', 'Needs', 'Review'].map((label, index) => (
              <div key={label} className={`rounded-full px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] ${index <= stage ? 'bg-ink text-paper' : 'bg-ink/[0.06] text-ink/40'}`}>{label}</div>
            ))}
          </div>

          {stage === 0 ? (
            <div>
              <h3 className="text-sm font-semibold">Choose your ticket</h3>
              <div className="mt-3 flex items-center justify-between rounded-xl border-2 border-ink bg-white/55 p-4">
                <span><strong className="block text-sm">General admission</strong><small className="mt-1 block text-xs text-ink/50">Full conference access</small></span>
                <span className="font-mono text-sm font-semibold">$72</span>
              </div>
              <Button className="mt-5 h-10 w-full" onClick={() => { onEvent('ticket'); setStage(1); }}>Continue <ArrowRight data-icon="inline-end" /></Button>
            </div>
          ) : null}

          {stage === 1 ? (
            <div>
              <h3 className="text-sm font-semibold">{repaired ? 'Accessibility & comfort' : 'Attendee details'}</h3>
              <p className="mt-1 text-xs leading-5 text-ink/50">You need a reserved seat in a quiet area for the afternoon sessions.</p>
              {!repaired ? (
                <button className="mt-4 flex w-full items-center justify-between rounded-xl border border-ink/10 bg-white/40 p-3 text-left text-sm font-medium" aria-expanded={detailsOpen} onClick={() => { onEvent(detailsOpen ? 'collapse' : 'expand'); setDetailsOpen(!detailsOpen); }}>
                  More attendee needs <ChevronDown className={`size-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
                </button>
              ) : null}
              {detailsOpen ? (
                <label className={`mt-3 flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${quietSeat ? 'border-mint bg-mint/[0.06]' : 'border-ink/12 bg-white/50'}`}>
                  <input className="mt-0.5 size-4 accent-[#28a66a]" type="checkbox" checked={quietSeat} onChange={(event) => { onEvent(event.target.checked ? 'seat' : 'unseat'); setQuietSeat(event.target.checked); }} />
                  <span className="flex-1"><strong className="block text-sm">Quiet-zone reserved seat</strong><small className="mt-1 block text-xs text-ink/50">Reserved aisle seat in the low-stimulation section.</small></span>
                  <span className="font-mono text-xs font-semibold">+$10</span>
                </label>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-ink/12 p-4 text-xs text-ink/40">No visible option matches the task yet.</div>
              )}
              <Button className="mt-5 h-10 w-full" disabled={!quietSeat} onClick={() => { onEvent('review'); setStage(2); }}>Review registration <ArrowRight data-icon="inline-end" /></Button>
            </div>
          ) : null}

          {stage === 2 ? (
            <div>
              <h3 className="text-sm font-semibold">Review before confirming</h3>
              <dl className="mt-3 divide-y divide-ink/8 rounded-xl border border-ink/10 bg-white/50 px-4">
                <div className="flex justify-between py-3 text-xs"><dt>General admission</dt><dd className="font-mono">$72</dd></div>
                <div className="flex justify-between py-3 text-xs"><dt>Quiet-zone reserved seat</dt><dd className="font-mono">$10</dd></div>
                <div className="flex justify-between py-3 text-xs"><dt>Service fee</dt><dd className="font-mono">$12</dd></div>
                <div className="flex justify-between py-3 text-sm font-semibold"><dt>Total</dt><dd className="font-mono">$94</dd></div>
              </dl>
              <p className="mt-3 flex gap-2 rounded-lg bg-amber/10 p-3 text-[11px] leading-4 text-ink/65"><FileWarning className="mt-0.5 size-3.5 shrink-0 text-amber" /> Service fee is non-refundable after 24 hours.</p>
              <Button className="mt-5 h-10 w-full bg-mint text-white hover:bg-mint/85" onClick={onComplete}><Check data-icon="inline-start" /> Confirm registration</Button>
            </div>
          ) : null}
        </div>
    </dialog>
  );
}

function PatchApprovalDialog({ onClose, onApprove }: { onClose: () => void; onApprove: () => void }) {
  const modal = useModal(onClose);
  const [acknowledged, setAcknowledged] = useState(false);
  return (
    <dialog {...modal} className="lab-dialog max-w-[620px]" aria-labelledby="patch-title">
        <header className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-signal">Human approval required</p>
            <h2 id="patch-title" className="mt-1 text-lg font-semibold tracking-[-0.03em]">Review patch FG-PATCH-01</h2>
          </div>
          <Button aria-label="Close patch review" variant="ghost" size="icon" onClick={onClose}><X /></Button>
        </header>
        <div className="px-5 py-5">
          <p className="text-sm leading-6 text-ink/60">This built-in patch changes the visible interface and WebMCP contract. Applying it clears both current runs. Export your report first to preserve them. Text proposals in Findings are review notes; this button does not implement them.</p>
          <ol className="mt-4 space-y-2">
            {patchChanges.map((change, index) => (
              <li key={change} className="flex gap-3 rounded-xl border border-ink/10 bg-white/45 p-3 text-xs leading-5">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ink font-mono text-[9px] text-paper">{index + 1}</span>{change}
              </li>
            ))}
          </ol>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-signal/20 bg-signal/[0.05] p-4">
            <input className="mt-0.5 size-4 accent-[#ee4b2b]" type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
            <span className="text-xs leading-5"><strong className="block text-signal">I reviewed this consequential change</strong>I understand the next paired run will use a stricter confirmation contract.</span>
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Keep baseline</Button>
            <Button disabled={!acknowledged} className="bg-signal text-white hover:bg-signal/85" onClick={onApprove}><ShieldCheck data-icon="inline-start" /> Approve & apply patch</Button>
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-ink/40"><LockKeyhole className="size-3" /> This approval action is intentionally not available as a WebMCP tool.</p>
        </div>
    </dialog>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <article className="rounded-[16px] border border-ink/10 bg-white/45 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={finding.severity === 'critical' ? 'bg-signal text-white' : 'bg-amber text-ink'}>{finding.severity}</Badge>
        <span className="font-mono text-[10px] text-ink/40">{finding.id}</span>
        <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/45">{finding.dimension}</span>
      </div>
      <h3 className="mt-3 break-words text-base font-semibold tracking-[-0.025em]">{finding.title}</h3>
      <p className="mt-2 break-words text-xs leading-5 text-ink/55">{finding.evidence}</p>
      <div className="mt-3 rounded-xl bg-ink/[0.045] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink/40">Proposed repair</p>
        <p className="mt-1 break-words text-xs leading-5">{finding.proposal}</p>
      </div>
    </article>
  );
}

export function FrictionLab() {
  const [state, setState] = useState<LabState>(initialState);
  const [ready, setReady] = useState(false);
  const stateRef = useRef(state);
  const [view, setView] = useState<'lab' | 'findings' | 'tools'>('lab');
  const [humanDialog, setHumanDialog] = useState(false);
  const [patchDialog, setPatchDialog] = useState(false);
  const [webMcpStatus, setWebMcpStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [activityMessage, setActivityMessage] = useState('Start a human run, then ask your browser agent to run the same task.');
  const [storageWarning, setStorageWarning] = useState('');
  const commit = useCallback((updater: (current: LabState) => LabState, message?: string) => {
    const next = updater(stateRef.current);
    stateRef.current = next;
    setState(next);
    if (message) setActivityMessage(message);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setStorageWarning(''); }
    catch { setStorageWarning('Browser storage is unavailable. This session still works; export before closing.'); }
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) { const restored = restoreState(raw); stateRef.current = restored; setState(restored); }
    } catch { setStorageWarning('Saved state could not be loaded. A fresh lab is open; export your work before closing.'); }
    finally { setReady(true); }
  }, []);
  const tools = useMemo(() => createLabTools(() => stateRef.current, next => {
    flushSync(() => commit(() => next, 'Agent updated the lab. See the traces or Findings.'));
  }, Date.now, state.version), [commit, state.version]);
  useEffect(() => {
    if (!ready) return;
    const context = document.modelContext ?? navigator.modelContext;
    if (!context || typeof context.registerTool !== 'function') { setWebMcpStatus('unavailable'); return; }
    let active = true;
    let controller: AbortController | null = null;
    const register = () => {
      if (!active) return;
      controller?.abort();
      const current = new AbortController();
      controller = current;
      setWebMcpStatus('checking');
      void (async () => {
        try {
          for (const tool of tools) {
            if (!active || current.signal.aborted) return;
            await context.registerTool({ ...tool, execute: async input => {
              if (current.signal.aborted) throw new Error('This tool registration expired. Discover tools again.');
              return tool.execute(input);
            } }, { signal: current.signal });
          }
          if (active && !current.signal.aborted) setWebMcpStatus('available');
        } catch {
          if (active && !current.signal.aborted) { current.abort(); setWebMcpStatus('unavailable'); }
        }
      })();
    };
    const hide = () => { controller?.abort(); setWebMcpStatus('checking'); };
    const show = (event: PageTransitionEvent) => { if (event.persisted) register(); };
    window.addEventListener('pagehide', hide);
    window.addEventListener('pageshow', show);
    register();
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', show);
    };
  }, [tools, ready]);
  const report = compareRuns(state.humanRun, state.agentRun);
  const allFindings = [...observedFindings(state), ...state.customFindings];
  const repaired = state.version === 'repaired';
  const humanEvent = (action: string) => {
    try { commit(current => {
      if (action === 'seat') return configureRun(current, 'human');
      if (action === 'review') return reviewRun(current, 'human');
      return record(current, 'human', { ticket: 'Selected ticket', expand: 'Expanded attendee needs', collapse: 'Collapsed attendee needs', unseat: 'Cleared quiet-zone seat' }[action] ?? action, 'Visual interaction recorded.', Date.now(), action === 'unseat' ? { configured: false, reviewed: false, disclosure: undefined } : {});
    }); } catch (error) {
      commit(current => ({ ...current, humanRun: { ...current.humanRun, status: 'cancelled' } }), error instanceof Error ? error.message : 'Start a new run.');
      setHumanDialog(false);
    }
  };
  const finishHumanRun = () => {
    try { commit(current => completeRun(current, 'human', { confirmed: true }), 'Human registration recorded.'); }
    catch (error) { commit(current => ({ ...current, humanRun: { ...current.humanRun, status: 'cancelled' } }), error instanceof Error ? error.message : 'Start a new run.'); }
    setHumanDialog(false);
  };
  const resetLab = () => { commit(() => initialState, 'Fresh baseline lab opened.'); setHumanDialog(false); setPatchDialog(false); setView('lab'); };
  const exportReport = () => {
    const { reviewToken: _token, ...snapshot } = stateRef.current;
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), scope: 'Fixed simulated RelayConf task. Local, editable browser evidence; not an independent audit.', report: compareRuns(snapshot.humanRun, snapshot.agentRun), state: snapshot }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'friction-report.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <main className="min-h-screen bg-paper pb-20 text-ink">
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="brand-mark" aria-hidden="true"><span /><span /></span>
            <div>
              <p className="text-[15px] font-bold tracking-[-0.035em]">Friction</p>
              <p className="hidden text-[10px] uppercase tracking-[0.18em] text-ink/45 sm:block">Dual usability laboratory</p>
            </div>
          </div>
          <nav className="hidden items-center gap-1 rounded-full border border-ink/10 bg-white/40 p-1 md:flex" aria-label="Lab sections">
            {([
              ['lab', 'Paired lab', GitCompareArrows],
              ['findings', `Findings · ${allFindings.length}`, FileWarning],
              ['tools', `Tools · ${tools.length}`, Wrench],
            ] as const).map(([id, label, Icon]) => (
              <button disabled={!ready} key={id} onClick={() => setView(id)} className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${view === id ? 'bg-ink text-paper' : 'text-ink/55 hover:bg-ink/[0.06]'}`}><Icon className="size-3.5" />{label}</button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`hidden h-7 sm:inline-flex ${webMcpStatus === 'available' ? 'border-mint/40 bg-mint/10 text-ink' : 'border-ink/12 bg-white/35 text-ink/55'}`}>
              <span className={`size-1.5 rounded-full ${webMcpStatus === 'available' ? 'bg-mint' : webMcpStatus === 'checking' ? 'bg-amber' : 'bg-ink/25'}`} />
              {webMcpStatus === 'available' ? `${tools.length} tools live` : webMcpStatus === 'checking' ? 'Checking WebMCP' : 'Human UI fallback'}
            </Badge>
            <Button disabled={!ready} aria-label="Reset lab" variant="outline" size="icon" className="border-ink/15 bg-white/45" onClick={resetLab}><RotateCcw /></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
        <div className="mb-5 rounded-xl border border-ink/15 bg-white/50 p-4 text-sm leading-6">
          <p><strong>A working WebMCP reference lab.</strong> Complete one simulated RelayConf registration through the visual UI and page tools, then compare the recorded evidence. No real booking or payment occurs.</p>
          <p className="mt-2 text-xs">A WebMCP-capable browser agent is needed for a recorded agent run. In other browsers, use the visual flow and clearly labeled example pairs. Runs stay in this browser; exports preserve a copy. Starting a run replaces that side; loading examples or resetting replaces both.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3"><Button disabled={!ready} variant="outline" onClick={exportReport}>Export report</Button><a className="underline" href="https://github.com/agammann/friction-webmcp#readme">Guide &amp; source</a><span className="text-xs">{webMcpStatus === 'available' ? '10 WebMCP tools ready' : webMcpStatus === 'checking' ? 'Checking browser tools…' : 'WebMCP unavailable here'}</span></div>
          <output className="mt-2 block text-xs">{ready ? activityMessage : 'Loading saved lab…'}</output>
          {storageWarning ? <p role="alert" className="mt-2 font-semibold text-signal">{storageWarning}</p> : null}
          {state.humanRun.source === 'example' || state.agentRun.source === 'example' ? <p className="mt-2 font-semibold text-signal">Example data is present. These illustrative events were not recorded from a person or agent.</p> : null}
        </div>
        {state.patchApproved ? (
          <div className="mb-5 flex flex-col gap-3 rounded-[16px] border border-mint/25 bg-mint/[0.08] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-xs"><ShieldCheck className="size-4 text-mint" /><strong>Approved patch active.</strong><span className="text-ink/50">The visual UI and WebMCP contract now use the repaired version.</span></p>
            <span className="font-mono text-[10px] text-ink/45">FG-PATCH-01 · {state.patchApprovedAt}</span>
          </div>
        ) : null}

        {view === 'lab' ? (
          <>
            <section className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/45">
                  <span>Lab 01</span><ArrowRight className="size-3" /><span>{repaired ? 'Repaired retest' : 'Baseline run'}</span>
                </div>
                <h1 className="max-w-3xl text-2xl font-bold leading-tight tracking-[-0.045em] sm:text-4xl">
                  Test the same task through <span className="font-serif font-normal italic">human eyes</span> and agent tools.
                </h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={!ready} className="h-10 rounded-full bg-ink px-4 text-paper hover:bg-ink/85" onClick={() => {
                  commit(current => startRun(current, 'human'), 'Human visual run started');
                  setHumanDialog(true);
                }}><MousePointer2 data-icon="inline-start" /> Start human run</Button>
                <Button disabled={!ready} variant="outline" className="h-10 rounded-full border-ink/15 bg-white/50 px-4" onClick={() => commit((current) => replayPairedRun(current), 'Loaded an illustrative example pair; these events were not observed.')}><Play data-icon="inline-start" /> Load example pair</Button>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]" aria-label="Paired traces">
              <TraceLane trace={state.humanRun} />
              <TraceLane trace={state.agentRun} />
              <ScoreCard state={state} />
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className={`flex items-center gap-3 rounded-[16px] border px-4 py-3 ${repaired && report.metrics.length ? 'border-mint/20 bg-mint/[0.08]' : 'border-ink/10 bg-ink text-paper'}`}>
                {repaired && report.metrics.length ? <Sparkles className="size-4 shrink-0 text-mint" /> : <Eye className="size-4 shrink-0 text-amber" />}
                <p className="text-xs leading-5"><strong>{repaired && report.metrics.length ? 'Retest result:' : 'Lab finding:'}</strong> {report.summary}</p>
              </div>
              <p className="text-right font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40">Scenario · RelayConf registration</p>
            </section>

            {!state.patchApproved ? (
              <section className="mt-5 rounded-[18px] border border-signal/20 bg-white/45 p-4 sm:flex sm:items-center sm:justify-between sm:gap-6">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-signal/10 text-signal"><Zap className="size-4" /></span>
                  <div><p className="text-sm font-semibold">Explore a built-in repair, then record a new pair.</p><p className="mt-1 text-xs leading-5 text-ink/50">Review the UI wording, returned fields, and confirmation gate. Applying the patch clears both runs.</p></div>
                </div>
                <Button disabled={!ready} className="mt-4 h-9 shrink-0 bg-signal text-white hover:bg-signal/85 sm:mt-0" onClick={() => setPatchDialog(true)}>Review proposed patch <ArrowRight data-icon="inline-end" /></Button>
              </section>
            ) : null}
          </>
        ) : null}

        {view === 'findings' ? (
          <section>
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-signal">Evidence → repair</p><h1 className="mt-1 text-3xl font-bold tracking-[-0.045em]">Parity findings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink/55">Check results come from the current pair. NOTE entries and text proposals are caller-supplied observations that still need review.</p></div>
              {!state.patchApproved ? <Button disabled={!ready} className="bg-signal text-white hover:bg-signal/85" onClick={() => setPatchDialog(true)}><ShieldCheck data-icon="inline-start" /> Review patch</Button> : null}
            </div>
            {!allFindings.length ? <p className="mb-4 text-sm">No findings yet. Complete a paired run or ask your agent to submit an observation.</p> : null}
            <article className="mb-5 rounded-xl border border-ink/15 p-4"><h2 className="font-semibold">Text proposals awaiting review</h2><p className="mt-1 text-xs">Notes are saved for review. They do not change code or the built-in patch.</p><ol className="mt-3 list-inside list-decimal space-y-2 text-sm">{state.proposedNotes.map((note, index) => <li key={index} className="break-words">{note}</li>)}</ol>{!state.proposedNotes.length ? <p className="mt-2 text-xs">No text proposals submitted.</p> : null}</article>
            <div className="grid gap-4 lg:grid-cols-3">{allFindings.map((finding) => <FindingCard key={finding.id} finding={finding} />)}</div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
              <article className="glass-panel rounded-[18px] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/40">Patch FG-PATCH-01</p><h2 className="mt-2 text-xl font-semibold tracking-[-0.035em]">One repair, both interfaces</h2><ol className="mt-4 grid gap-2 sm:grid-cols-2">{patchChanges.map((change, index) => <li key={change} className="flex gap-3 rounded-xl bg-ink/[0.045] p-3 text-xs leading-5"><span className="font-mono text-signal">0{index + 1}</span>{change}</li>)}</ol></article>
              <article className="rounded-[18px] bg-ink p-5 text-paper"><LockKeyhole className="size-5 text-amber" /><h2 className="mt-3 text-xl font-semibold tracking-[-0.035em]">Approval is a visible UI action.</h2><p className="mt-2 text-sm leading-6 text-paper/60">WebMCP exposes findings and proposals, but no approval tool. The checkbox activates a fixed built-in patch; it is not authentication or protection against browser automation.</p><p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/35">No approve_patch tool is registered</p></article>
            </div>
          </section>
        ) : null}

        {view === 'tools' ? (
          <section>
            <div className="mb-5"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-signal">Page-owned capabilities</p><h1 className="mt-1 text-3xl font-bold tracking-[-0.045em]">Live WebMCP contract</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-ink/55">These tools belong to this open page and act on the same state shown in the human interface. The finalization contract changes only after visible human approval.</p></div>
            <div className="grid gap-3 lg:grid-cols-2">
              {toolCatalog.map(([name, description, mode], index) => (
                <article key={name} className="glass-panel flex items-start gap-4 rounded-[16px] p-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink font-mono text-[10px] text-paper">{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><code className="break-all text-xs font-semibold text-signal">{name}</code><Badge variant="outline" className={mode === 'read' ? 'border-mint/25 bg-mint/[0.07] text-mint' : 'border-amber/30 bg-amber/[0.09] text-ink'}>{mode}</Badge></div><p className="mt-2 text-xs leading-5 text-ink/55">{description}</p></div>
                </article>
              ))}
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              <article className="rounded-[16px] border border-ink/10 bg-white/45 p-4"><ListChecks className="size-4 text-mint" /><h2 className="mt-2 text-sm font-semibold">Typed schemas</h2><p className="mt-1 text-xs leading-5 text-ink/50">Enums and runtime checks constrain tickets, seats, findings, and final confirmation.</p></article>
              <article className="rounded-[16px] border border-ink/10 bg-white/45 p-4"><Activity className="size-4 text-mint" /><h2 className="mt-2 text-sm font-semibold">Same in-page state</h2><p className="mt-1 text-xs leading-5 text-ink/50">Tool mutations update these traces, the score, findings, and optional browser storage.</p></article>
              <article className="rounded-[16px] border border-ink/10 bg-white/45 p-4"><ShieldCheck className="size-4 text-mint" /><h2 className="mt-2 text-sm font-semibold">Lifecycle-safe</h2><p className="mt-1 text-xs leading-5 text-ink/50">Tools are feature-detected, registered with cancellation, and remain optional for ordinary browsers.</p></article>
            </div>
          </section>
        ) : null}
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-full border border-ink/10 bg-paper/95 p-1 shadow-xl backdrop-blur-xl md:hidden" aria-label="Lab sections">
        {([
          ['lab', 'Lab', GitCompareArrows],
          ['findings', 'Findings', FileWarning],
          ['tools', 'Tools', Wrench],
        ] as const).map(([id, label, Icon]) => <button disabled={!ready} key={id} onClick={() => setView(id)} className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium ${view === id ? 'bg-ink text-paper' : 'text-ink/50'}`}><Icon className="size-3.5" />{label}</button>)}
      </nav>

      {humanDialog ? <HumanRunDialog version={state.version} onClose={() => { commit(current => current.humanRun.steps.length >= 200 ? { ...current, humanRun: { ...current.humanRun, status: 'cancelled' } } : record(current, 'human', 'Cancelled visual run', 'Closed before confirmation.', Date.now(), { status: 'cancelled' })); setHumanDialog(false); }} onEvent={humanEvent} onComplete={finishHumanRun} /> : null}
      {patchDialog ? <PatchApprovalDialog onClose={() => setPatchDialog(false)} onApprove={() => {
        const stamp = new Date().toISOString();
        commit((current) => approvePatch(current, stamp), 'Human approved and applied FG-PATCH-01');
        setPatchDialog(false);
        setView('lab');
      }} /> : null}
    </main>
  );
}
