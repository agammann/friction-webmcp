# Friction

**A working browser lab for comparing a visual workflow with WebMCP tools.** Complete a simulated conference registration, inspect what each interface disclosed and required, and retest after applying a built-in repair.

[Open Friction](https://friction.alx21.chatgpt.site/) · [Source](https://github.com/agammann/friction-webmcp)

## What it does

Friction records actual UI and tool events for one fixed task: choose General admission and a quiet-zone reserved seat at the fictional RelayConf. The itemized total is $94 ($72 ticket, $10 seat, $12 service fee). No real booking, payment, account, or external registration is involved.

The baseline intentionally contains two contract problems: agent completion does not require review/confirmation, and its result returns only the $82 subtotal. The built-in repair exposes the full price at completion, requires a current review token plus explicit confirmation, and makes the seat option easier to find visually. This makes Friction a reference implementation and an experiment you can run yourself.

It does not scan other websites, generate arbitrary code patches, measure cognitive effort, or certify accessibility. To apply these patterns elsewhere, adapt the source to your own task and outcome checks.

## Use the lab

1. Select **Start human run**. Choose the ticket, expand attendee needs, select the quiet-zone seat, review the full price and policy, then confirm.
2. In a browser with WebMCP agent support, ask your agent to read the scenario, start a run, configure the same ticket and seat, and complete the baseline task. The tools belong to the open page; this is not a remote MCP endpoint.
3. Inspect the two recorded traces and comparison. Baseline agents may choose to call `review_registration`; that changes the information result because the report uses the actual evidence.
4. **Export report** before changing versions. The JSON includes both traces, records, provenance, comparison, findings, and proposal notes. Active review tokens are omitted.
5. Select **Review proposed patch**, read the four built-in changes, acknowledge them, and approve. Both runs are cleared. Run both sides again under the repaired contract.

Without a compatible agent, the complete visual workflow still works. **Load example pair** loads clearly labeled synthetic events for the current version. Examples never pass as recorded interactions, and a mixed example/interactive pair does not receive a score. Starting a run replaces that side; loading examples or resetting replaces both. Export first if you want to retain the previous pair.

## WebMCP contract

The page registers ten tools with `document.modelContext.registerTool`, with a compatibility fallback to `navigator.modelContext`. Registration uses an abort signal and is replaced when the interface contract changes. Input schemas and handler validation enforce the same accepted fields. Ordinary browsers display an explicit unavailable status.

| Tool | Purpose |
| --- | --- |
| `get_test_scenario` | Read the fixed task, current version, and advertised prices. |
| `start_agent_run` | Start a new recorded agent run, replacing the previous one. |
| `inspect_task_state` | Read both runs and simulated in-page records. |
| `configure_registration` | Set `ticket: "general_admission"` and `seat: "quiet_zone"`; invalidate earlier review. |
| `review_registration` | Return an itemized $94 preview, policy, and new `reviewToken`. |
| `complete_simulated_task` | Complete according to the current contract; repaired mode requires `reviewToken` and `confirmed: true`. |
| `get_human_interaction_trace` | Read actual human events, status, provenance, and elapsed time. |
| `compare_human_agent_runs` | Compare completed runs of the same version and source. |
| `submit_parity_finding` | Save a caller-supplied finding for visible review. |
| `propose_interface_patch` | Save a visible text proposal; it does not execute or modify code. |

All read tools, start, and review take `{}`. Baseline completion also takes `{}`. Repaired flow:

```text
start_agent_run({})
configure_registration({"ticket":"general_admission","seat":"quiet_zone"})
review_registration({})
complete_simulated_task({"reviewToken":"<token from the latest review>","confirmed":true})
compare_human_agent_runs({})
```

Tokens are invalidated by another review, reconfiguration, restarting, patch activation, or completion. Completion cannot be repeated. Review previews have `confirmed: false`; only completed records have `confirmed: true`. Rejected configure/review/completion calls during a running trace are recorded, including their errors. Read-only tool calls are not counted as workflow events.

Findings require `severity` (`critical` or `moderate`), `dimension` (`Information`, `Consent`, or `Human effort`), `title` (5–160 characters), `evidence` (10–600), and `proposal` (10–600). Text proposals require `change` (10–500). Whitespace-only values and unexpected fields are rejected. Each collection is limited to 30 entries; traces are limited to 200 events. Export and reset/start a new run at the limit.

No approval tool is registered. The visible checkbox activates only the fixed patch FG-PATCH-01. It is a workflow boundary, not authentication or a guarantee that browser automation cannot operate the UI. Submitted findings and proposals are unverified notes and are shown as such.

## How comparison works

A score is available only when both runs are complete, use the same version, and are both recorded or both examples. Each dimension has equal weight:

- **Outcome:** both saved records match the fixed task and its expected values (0 or 100).
- **Information:** each side received the full itemized price and policy through review or completion (0 or 100). Reading the inspector alone is not counted as reviewing a draft.
- **Consent:** both sides reviewed and explicitly confirmed (0 or 100).
- **State:** both in-page final records match (0 or 100). This does not claim durable server storage.
- **Action balance:** `round(100 × smaller event count / larger event count)`, with a display threshold of 75. Counts include recorded UI actions, mutating registration calls, and rejected calls. They are a simple count heuristic, not equivalent units of human and agent effort.

The displayed total is the rounded average. Core failures count the first four checks; action balance is separate. Elapsed time is measured from start to the last event, includes waiting/background time, and does not affect the score. Friction does not infer hesitation, confusion, or backtracking from a clock. The score is never selected from the baseline/repaired label.

## Data and privacy

State is kept in the current tab and, when available, localStorage key `friction-lab-v2`. Nothing from your runs is posted to a backend by the app. A browser agent can access the tools and state on the open page. Hosting serves the app and may keep normal request logs.

Reload restores completed runs and an in-progress agent draft. An unfinished visual run is marked cancelled because its dialog controls cannot resume. Malformed saved data falls back to a fresh lab with a visible notice. If storage is blocked or full, the session remains usable and asks you to export before closing. Browser storage can be cleared or edited and is not independent audit evidence. Tabs do not synchronize; use one lab tab per experiment.

The previous `friction-lab-v1` snapshot is ignored because its traces used a different evidence model. Reset replaces this lab's current snapshot. Exports are local JSON downloads, not an import/restore feature.

## Run locally

Use Node.js 24+ and pnpm 11.19.0:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by the development server (normally `http://localhost:3000`). The cross-platform dev wrapper enables the Node preview. Production uses the Cloudflare Worker build:

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
pnpm start
```

For Linux CI, use `pnpm exec playwright install --with-deps chromium`. `pnpm start` serves the built Worker through Wrangler. No API keys, database, or paid provider account are needed for local use.

`lib/lab-model.ts` owns state transitions and comparison; `lib/lab-tools.ts` owns runtime validation and the ten handlers; `components/friction-lab.tsx` renders the same state. Browser tests use a registration adapter to exercise the real handlers and visible UI; this adapter is test-only and is not a claim of native browser support. GitHub Actions runs unit tests, lint, type checking, browser tests, and the production build.

## License

MIT. See [LICENSE](LICENSE).
