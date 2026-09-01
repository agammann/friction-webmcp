# FrictionGlass

**Test the same task through human eyes and agent tools.**

FrictionGlass is a dual usability laboratory for the agent-native web. A person completes a task through the normal visual interface while an AI agent completes the same task through page-owned WebMCP tools. The lab records both journeys, compares five parity dimensions, proposes an evidence-backed repair, and lets a human approve the patch before both sides retest.

**Live app:** [frictionglass-parity-lab.alx21.chatgpt.site](https://frictionglass-parity-lab.alx21.chatgpt.site)

## Why WebMCP

The agent side is not browser automation and not a remote MCP server. This live page registers ten tools with `document.modelContext.registerTool(...)`. Those tools use the same state and mutations as the visible React interface, so a judge can inspect tool calls and then see the trace, findings, and parity score change on the page.

## Two-minute workflow

1. Observe the seeded baseline: the human finds a quiet-zone seat only after opening a vague panel, while the agent configures it immediately.
2. Notice the two critical gaps: the baseline completion result omits a $12 fee and finalizes without the review/confirmation shown to the human.
3. Open **Review proposed patch**. The interface explains four evidence-backed changes and makes approval explicitly human-only.
4. Approve the patch. The visible option moves under **Accessibility & comfort**, while the WebMCP completion schema now requires a review token and `confirmed=true`.
5. Complete both repaired runs. The deterministic parity score rises from **50/100** to **96/100**.

All scenarios and prices are simulated. No payment, reservation, personal data, account, or external API is involved.

## Registered tools

| Tool | Mode | Purpose |
| --- | --- | --- |
| `get_test_scenario` | Read | Read the task, choices, prices, conditions, and parity dimensions. |
| `start_agent_run` | Write | Start or reset the structured agent trace. |
| `inspect_task_state` | Read | Inspect the shared live state and patch version. |
| `configure_registration` | Write | Configure the simulated registration with typed enums. |
| `review_registration` | Write | Return the itemized total and issue a review token. |
| `complete_simulated_task` | Write | Finalize using the active baseline or repaired contract. |
| `get_human_interaction_trace` | Read | Read steps, duration, backtracks, hesitations, and outcome. |
| `compare_human_agent_runs` | Read | Compare outcome, information, consent, state, and effort. |
| `submit_parity_finding` | Write | Record an evidence-backed, untrusted agent-authored finding. |
| `propose_interface_patch` | Write | Propose a change for visible human review. |

There is deliberately **no agent-callable approval tool**.

## Judge prompts

Open the app in ChatGPT’s in-app browser with site tools available, then try:

1. “Inspect the FrictionGlass scenario and compare the completed baseline human and agent runs.”
2. “Start a fresh agent run, configure general admission with the quiet-zone seat, and complete it.”
3. After approving the visible patch: “Start a repaired run and try to complete it without reviewing first. Then review the registration and complete it with explicit confirmation.”
4. “Compare the repaired human and agent runs and explain the score change.”

## Local development

Requirements: Node.js 22.13 or newer and pnpm.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000` in a WebMCP-capable browser. Ordinary browsers still receive the complete human interface and persistent local state.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit --prod --audit-level high
```

The parity engine has deterministic tests for the baseline failures, repaired guarantees, human approval transition, and paired replay. The page feature-detects WebMCP, validates tool inputs through restrictive JSON Schemas and handlers, marks agent-authored text as untrusted, and uses `AbortController` to clean up registrations.

## Architecture

- Vinext / React 19 / TypeScript
- Tailwind CSS and shadcn interface primitives
- `document.modelContext.registerTool(...)` for page-owned WebMCP
- Local browser persistence for account-free, repeatable demos
- Cloudflare-compatible output through ChatGPT Sites

## License

MIT — see [LICENSE](./LICENSE).

