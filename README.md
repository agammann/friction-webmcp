# Friction

**A working browser lab for comparing a visual workflow with WebMCP tools.** Complete a simulated conference registration, inspect what each interface disclosed and required, and retest after applying a built-in repair.

[Open Friction](https://friction.alx21.chatgpt.site/) · [Source](https://github.com/agammann/friction-webmcp)

Source **1.1.1** provides this bounded v1 lab. Available dependency patches are applied. The full raw audit retains one explicitly accepted, unpatched high-severity production dependency finding; the required strict policy verifies only that exact finding and current patch availability. See [dependency status](SECURITY.md#dependency-release-gate) and [upgrade and recovery guidance](docs/STABILITY.md).

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

After restoring saved state, the page registers ten titled tools with `document.modelContext.registerTool`, with a compatibility fallback to `navigator.modelContext`. Registration uses an abort signal, disconnects on page hide, returns after cached navigation, and is replaced when the interface contract changes. Returned lab content is marked as untrusted. Input schemas and handler validation enforce the same accepted fields. Ordinary browsers display an explicit unavailable status.

WebMCP is experimental. In Chrome, enable **WebMCP for testing** at `chrome://flags/#enable-webmcp-testing` and relaunch, following the [Chrome setup guide](https://developer.chrome.com/docs/ai/webmcp). Your browser agent must support page-tool discovery and invocation. The flag exposes the API; it does not connect an agent by itself.

| Tool                          | Purpose                                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `get_test_scenario`           | Read the fixed task, current version, and advertised prices.                                            |
| `start_agent_run`             | Start a new recorded agent run, replacing the previous one.                                             |
| `inspect_task_state`          | Read both runs and simulated in-page records.                                                           |
| `configure_registration`      | Set `ticket: "general_admission"` and `seat: "quiet_zone"`; invalidate earlier review.                  |
| `review_registration`         | Return an itemized $94 preview, policy, and new `reviewToken`.                                          |
| `complete_simulated_task`     | Complete according to the current contract; repaired mode requires `reviewToken` and `confirmed: true`. |
| `get_human_interaction_trace` | Read actual human events, status, provenance, and elapsed time.                                         |
| `compare_human_agent_runs`    | Compare completed runs of the same version and source.                                                  |
| `submit_parity_finding`       | Save a caller-supplied finding for visible review.                                                      |
| `propose_interface_patch`     | Save a visible text proposal; it does not execute or modify code.                                       |

All read tools, start, and review take `{}`. Baseline completion also takes `{}`. Repaired flow:

```text
start_agent_run({})
configure_registration({"ticket":"general_admission","seat":"quiet_zone"})
review_registration({})
complete_simulated_task({"reviewToken":"<token from the latest review>","confirmed":true})
compare_human_agent_runs({})
```

Tokens are invalidated by another review, reconfiguration, restarting, patch activation, or completion. Completion cannot be repeated. Review previews have `confirmed: false`; only completed records have `confirmed: true`. Rejected configure/review/completion calls that reach the handler during a running trace are recorded, including their errors. A browser may reject invalid schema input before the handler runs; those refusals do not produce lab events. Read-only tool calls are not counted as workflow events.

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

A source distribution is packaged as `friction_1.1.1_source.zip`, its matching `.sha256` file and `SHA256SUMS`. Verify it with PowerShell `Get-FileHash friction_1.1.1_source.zip -Algorithm SHA256`, or Linux `sha256sum -c SHA256SUMS`. Enter the extracted `friction-1.1.1` folder and use the same frozen install below. The package includes the MIT license, frozen lockfile, fixed reproducible task and recovery guide.

```sh
git clone https://github.com/agammann/friction-webmcp.git
cd friction-webmcp
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by the development server (normally `http://localhost:3000`). The cross-platform dev wrapper enables the Node preview. Production uses the Cloudflare Worker build:

```sh
pnpm test
pnpm lint
pnpm typecheck
pnpm audit
pnpm test:audit-policy
pnpm security:audit
pnpm exec playwright install chromium
pnpm exec playwright install chrome
pnpm build
pnpm test:e2e
pnpm test:webmcp
pnpm start
```

Run the browser suites sequentially because their Wrangler processes share local storage. The ordinary suite uses port 3012; native tests use 3017. Stop a manually started Worker on either port before running its suite. For Linux CI, add `--with-deps` to each browser installation. `pnpm start` serves the built Worker through Wrangler. No API keys, database, or paid provider account are needed for local use.

`lib/lab-model.ts` owns state transitions and comparison; `lib/lab-tools.ts` owns runtime validation and the ten handlers; `components/friction-lab.tsx` renders the same state. Both browser suites run the production Worker. Ordinary tests use a registration adapter to exercise the handlers and visible UI. The native suite calls the actual browser discovery and execution API without an adapter. GitHub Actions runs the audit, unit tests, lint, type checking, production build and both browser suites, and retains the native JSON report on every run.

Current local candidate checks on October 7, 2026 used Windows, Node.js 24.19.0, pnpm 11.19.0, Playwright 1.58.2 and Chrome 155.0.8059.39. Twelve unit tests, typecheck, lint, production build, nine ordinary cases and five native cases passed. A separate visible recorded pair showed 48/100 with two baseline core failures, then 95/100 with all four repaired core checks passing; both scores matched their exported event counts and metrics. Completed records and reports survived reload exactly. A fresh ordinary mobile browser completed the visual task without WebMCP and kept illustrative pairs explicitly labeled. These local observations do not certify a new hosted deployment or a published release.

## Native verification

Five native tests check ten titled schemas before and after patch approval; actual baseline and repaired human/agent pairs; current, invalidated and consumed review tokens; exports, notes and reload persistence; storage failures and malformed snapshots; and withdrawal/restoration through real back/forward caching. Tests use isolated browser contexts, so they do not alter an existing lab tab. There are no server-side run writes.

The complete local suite passed on Windows with Chrome **154.0.8037.93** and Edge **154.0.4258.48**, with the experimental `WebMCP` feature enabled. These are tested versions, not a claim about every browser or agent. In PowerShell, run Edge or the live site with:

```powershell
$env:FRICTION_WEBMCP_CHANNEL = 'msedge'
pnpm test:webmcp
Remove-Item Env:FRICTION_WEBMCP_CHANNEL

$env:FRICTION_WEBMCP_URL = 'https://friction.alx21.chatgpt.site'
pnpm test:webmcp
Remove-Item Env:FRICTION_WEBMCP_URL
```

Live mode runs all five tests in fresh isolated contexts. It records whether the host restores a cached page; local tests require actual restoration. Read the JSON report and check CI for the exact source being published.

## License

MIT. See [LICENSE](LICENSE).

The source distribution is made from a clean committed tree. CI verifies every source byte after extraction and runs both browser suites from that fresh copy. Only a verified main push can publish its same-run artifact. The full raw dependency audit remains required and currently exits 1 for the accepted high-severity production dependency finding. `pnpm security:audit` retains that report, verifies the exact documented exception and fails on changed findings, unavailable or malformed metadata and possible newly published patches. This is not a zero-finding audit. See [CONTRIBUTING.md](CONTRIBUTING.md).
