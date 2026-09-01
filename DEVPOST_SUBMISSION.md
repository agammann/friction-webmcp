# FrictionGlass — Devpost submission copy

## Tagline

Test the same task through human eyes and agent tools.

## Live app

[frictionglass-parity-lab.alx21.chatgpt.site](https://frictionglass-parity-lab.alx21.chatgpt.site)

## Inspiration

WebMCP makes websites dramatically easier for agents to use because a live page can publish named, structured actions instead of asking an agent to infer buttons and forms. That creates a new usability question: does the agent receive the same information, consent gates, and final state that a person sees?

FrictionGlass is a dual usability laboratory for answering that question. It pairs one visual journey with one WebMCP journey, exposes the differences, repairs both interfaces together, and proves the improvement with a retest.

## What it does

The deterministic RelayConf scenario contains three intentional problems:

- a quiet-zone seat is hidden behind vague human-facing wording;
- the baseline agent result omits a $12 service fee and refund condition;
- an ambiguously described completion tool finalizes without the human review gate.

FrictionGlass records both traces and scores outcome, information, consent, state, and effort parity. It produces evidence-backed findings and a four-part patch. A human must approve that patch through the visible UI—approval is intentionally not agent-callable. After approval, the human option becomes clear, the tool returns an itemized total and policy, and finalization requires a review token plus `confirmed=true`. The paired score rises from 50/100 to 96/100.

## Why WebMCP is essential

WebMCP generates one side of the experiment. The page registers ten tools with `document.modelContext.registerTool(...)`; these are not a remote MCP server and do not automate the DOM. Tool handlers and visual controls share the same React state and durable browser storage, so agent mutations immediately change the visible trace, findings, and comparison.

Without WebMCP, FrictionGlass could test only visual automation. With WebMCP, it can inspect the explicit contract a site offers to agents and compare that contract against the human experience.

## How humans and agents work together

People complete and judge the visual task, report hesitation, and retain approval authority. Agents exercise the structured contract, analyze traces, submit findings, and propose interface changes. Neither side replaces the other: the agent contributes speed and structured analysis, while the person supplies subjective usability evidence and approves consequential changes.

## How we built it

FrictionGlass uses React 19, TypeScript, Vinext, Tailwind CSS, shadcn primitives, and ChatGPT Sites-compatible Cloudflare output. Ten page-owned WebMCP tools use restrictive JSON Schemas, runtime checks, read/write annotations, untrusted-content hints, feature detection, and registration cleanup with `AbortController`.

The account-free demo persists locally in the browser, making the before/after experiment repeatable without credentials or external APIs. Deterministic tests cover the parity score, consent and information failures, approval transition, and repaired replay.

## Challenges

The most important design challenge was avoiding a fake split between “human UI state” and “agent demo state.” Every interaction had to operate on the same live model. The second was expressing the repair as a real contract change: the completion tool’s description and JSON Schema are re-registered after human approval, and its handler independently enforces review and confirmation.

## Accomplishments

- A non-trivial ten-tool WebMCP implementation over shared visible state.
- A complete evidence → proposal → human approval → retest loop.
- A consent failure that is demonstrably blocked by the repaired handler.
- A polished responsive product requiring no accounts, secrets, or external APIs.
- Deterministic tests, type checks, linting, production build, and dependency audit.

## What we learned

Parity is broader than whether both paths eventually produce the same record. A fast agent path can still be worse if it hides cost, weakens consent, or returns less context. Tool schemas, descriptions, results, and confirmation design are part of the product interface and need usability testing just as much as buttons and labels do.

## What’s next

Future versions could import OpenTelemetry-style traces, compare multiple scenarios, export regression suites for CI, and provide a lightweight SDK that lets other WebMCP sites embed paired parity tests while keeping approval policies application-owned.

## Judge testing instructions

1. Open the live app in ChatGPT’s in-app browser and inspect the ten available site tools.
2. Call `compare_human_agent_runs` on the seeded baseline and inspect the 50/100 result.
3. Call `start_agent_run`, `configure_registration`, and `complete_simulated_task`; observe that the baseline tool returns $82 while the shared final state contains $94.
4. Review and approve FG-PATCH-01 in the visible interface. Confirm there is no approval tool.
5. In the repaired version, start and configure a run, then try `complete_simulated_task` before review; it must be rejected.
6. Call `review_registration`, then complete with the returned token and `confirmed=true`.
7. Complete or replay the repaired human run and confirm the visible score is 96/100.
